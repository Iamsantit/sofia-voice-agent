from app import call_state
from app.logger import Phase, log
from app.services import anthropic_service, notion_service, retell_service


def _extract_call_id(data: dict) -> str:
    """Extrae call_id del payload de Retell.
    Retell envía: {"event": "...", "call": {"call_id": "...", ...}}
    """
    call_obj = data.get("call", {})
    if isinstance(call_obj, dict) and call_obj.get("call_id"):
        return call_obj["call_id"]
    return data.get("call_id", "")


def handle_retell_event(request: dict) -> dict:
    """Procesa eventos de Retell AI: call_started, call_ended, call_analyzed."""
    event_type = request.get("event", "unknown")
    call_id = _extract_call_id(request)

    log.info(Phase.WEBHOOK_RETELL, f"dispatch.{event_type}", call_id=call_id)

    if event_type == "call_started":
        return _on_call_started(request)
    elif event_type == "call_ended":
        return _on_call_ended(request)
    elif event_type == "call_analyzed":
        return _on_call_analyzed(request)
    else:
        log.warn(Phase.WEBHOOK_RETELL, "event.ignored", call_id=call_id, data={"event": event_type})
        return {"status": "ignored", "event": event_type}


def _on_call_started(data: dict) -> dict:
    call_id = _extract_call_id(data)
    # When call_started fires, the call is now being answered / in progress
    call_state.set_phase(call_id, Phase.CALL_ANSWERED, note="Retell call_started event")
    log.info(Phase.CALL_ANSWERED, "call.started", call_id=call_id)
    return {"status": "ok", "call_id": call_id}


def _on_call_ended(data: dict) -> dict:
    """Al colgar: obtiene transcripción, analiza con Claude, guarda en Notion."""
    call_id = _extract_call_id(data)
    call_state.set_phase(call_id, Phase.CALL_ENDED, note="Retell call_ended event")
    log.info(Phase.CALL_ENDED, "call.ended", call_id=call_id)

    if not call_id:
        log.error(Phase.CALL_ENDED, "call_id.missing", data={"payload_keys": list(data.keys())})
        return {"status": "error", "error": "call_id vacío en webhook"}

    try:
        result = process_post_call(call_id)
        return result
    except Exception as e:
        log.exception(Phase.CALL_ENDED, "post_call.fail", e, call_id=call_id)
        return {"status": "error", "call_id": call_id, "error": str(e)}


def _on_call_analyzed(data: dict) -> dict:
    call_id = _extract_call_id(data)
    call_state.set_phase(call_id, Phase.CALL_ANALYZED, note="Retell call_analyzed event")
    call_state.set_result(call_id, "ok", "Call completed successfully")
    log.info(Phase.CALL_ANALYZED, "call.analyzed", call_id=call_id)
    return {"status": "ok", "call_id": call_id}


def process_post_call(call_id: str) -> dict:
    """Flujo completo post-llamada.

    1. Obtener transcripción de Retell
    2. Analizar con Claude (resumen + lead scoring)
    3. Registrar llamada en Notion
    4. Crear o actualizar lead en Notion
    """
    log.info(Phase.CALL_ANALYZED, "post_call.start", call_id=call_id)

    call_data = retell_service.get_call(call_id)
    transcript = call_data.get("transcript", "")
    phone = call_data.get("from_number", "") or call_data.get("to_number", "")
    direction = call_data.get("direction", "inbound")
    duration_sec = int(call_data.get("duration_ms", 0) / 1000)

    # Bill the user for the minutes spent on this call. Resolve the
    # owner via the agent → user_agents reverse lookup.
    try:
        from app.billing import add_minutes_used
        from app.user_agents import get_user_agent_by_agent_id

        agent_id = call_data.get("agent_id", "")
        if agent_id and duration_sec > 0:
            link = get_user_agent_by_agent_id(agent_id)
            if link and link.get("email"):
                add_minutes_used(link["email"], duration_sec)
                log.info(
                    Phase.SYSTEM,
                    "billing.usage.recorded",
                    call_id=call_id,
                    data={"email": link["email"], "duration_sec": duration_sec},
                )
    except Exception as be:
        log.exception(Phase.SYSTEM, "billing.usage.fail", be, call_id=call_id)

    if not transcript:
        log.warn(Phase.CALL_ANALYZED, "post_call.no_transcript", call_id=call_id)
        return {"status": "no_transcript", "call_id": call_id}

    analysis = anthropic_service.analyze_call(transcript)
    log.info(Phase.ANTHROPIC, "analyze_call.ok", call_id=call_id, data={"sentiment": analysis.get("sentimiento")})

    tipo_llamada = "Inbound" if "inbound" in direction.lower() else "Outbound"
    nombre = analysis.get("nombre_cliente", "") or "Cliente"

    call_record = notion_service.create_call_record(
        titulo=f"{tipo_llamada} — {nombre}",
        tipo=tipo_llamada,
        resultado="Contestada",
        telefono=phone,
        nombre_lead=nombre,
        duracion_seg=duration_sec,
        resumen=analysis.get("resumen", ""),
        sentimiento=analysis.get("sentimiento", "Neutral"),
        cita_agendada=analysis.get("cita_agendada", False),
        retell_call_id=call_id,
    )
    log.info(Phase.NOTION, "call_record.created", call_id=call_id, data={"record_id": call_record["id"]})

    lead_id = None
    if phone:
        existing = notion_service.find_lead_by_phone(phone)
        if existing:
            lead_id = existing["id"]
            notion_service.update_lead(
                page_id=lead_id,
                temperatura=analysis.get("temperatura", "Warm"),
                resumen_ia=analysis.get("resumen", ""),
                siguiente_accion=analysis.get("siguiente_accion", ""),
                estatus="Cita agendada" if analysis.get("cita_agendada") else None,
            )
            log.info(Phase.NOTION, "lead.updated", call_id=call_id, data={"lead_id": lead_id})
        else:
            lead = notion_service.create_lead(
                name=nombre,
                phone=phone,
                presupuesto=analysis.get("presupuesto"),
                zona_interes=analysis.get("zonas_interes", []),
                fuente="Llamada entrante" if tipo_llamada == "Inbound" else "Otro",
                notas=analysis.get("resumen", ""),
            )
            lead_id = lead["id"]
            log.info(Phase.NOTION, "lead.created", call_id=call_id, data={"lead_id": lead_id})

    log.info(Phase.CALL_ANALYZED, "post_call.complete", call_id=call_id, data={"lead_id": lead_id, "call_record_id": call_record["id"]})

    return {
        "status": "ok",
        "call_id": call_id,
        "call_record_id": call_record["id"],
        "lead_id": lead_id,
        "analysis": analysis,
    }
