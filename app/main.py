import modal
from fastapi import Body, FastAPI, Query, Request

from app import call_state
from app.logger import Phase, clear_logs, log, read_recent

modal_app = modal.App("sofia-voice-agent")
app = modal_app  # Modal CLI looks for `app` by default

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "retell-sdk>=5.0.0",
        "twilio>=9.0.0",
        "anthropic>=0.42.0",
        "notion-client>=2.2.0,<3.0.0",
        "requests>=2.32.0",
        "python-dotenv>=1.0.0",
        "fastapi>=0.115.0",
        "pyjwt>=2.8.0",
    )
    # Modal v1+ requires local Python source to be added explicitly. Without
    # this the container cannot import `app.*` and every endpoint fails with
    # ModuleNotFoundError, which surfaces to Vercel as a 504 timeout.
    .add_local_python_source("app")
)

sofia_secret = modal.Secret.from_name("sofia-credentials")
log_volume = modal.Volume.from_name("sofia-logs", create_if_missing=True)

web_app = FastAPI(title="Sofia Voice Agent")


@web_app.get("/health")
def health():
    log.info(Phase.HTTP_IN, "health.check")
    return {"status": "ok", "agent": "sofia", "version": "0.3.0"}


# ── Logs API ─────────────────────────────────────────────────────────────────


@web_app.get("/logs")
def get_logs(
    limit: int = Query(200, ge=1, le=2000),
    level: str | None = Query(None),
    call_id: str | None = Query(None),
    phase_prefix: str | None = Query(None),
):
    """Recent log entries, newest first. Filters optional."""
    entries = read_recent(limit=limit, level=level, call_id=call_id, phase_prefix=phase_prefix)
    return {"count": len(entries), "entries": entries}


@web_app.post("/logs/clear")
def post_logs_clear():
    bytes_removed = clear_logs()
    log.warn(Phase.SYSTEM, "logs.cleared", data={"bytes_removed": bytes_removed})
    return {"status": "ok", "bytes_removed": bytes_removed}


@web_app.get("/call-state/{call_id}")
def get_call_state(call_id: str):
    state = call_state.get_state(call_id)
    if not state:
        return {"status": "not_found", "call_id": call_id}
    return {"status": "ok", "state": state}


@web_app.get("/call-states")
def get_call_states_recent(limit: int = Query(20, ge=1, le=100)):
    return {"states": call_state.list_recent(limit=limit)}


# ── Retell / Twilio webhooks ─────────────────────────────────────────────────


@web_app.post("/retell-webhook")
def retell_webhook(request: dict):
    event_type = request.get("event", "unknown")
    call_obj = request.get("call") if isinstance(request.get("call"), dict) else {}
    cid = call_obj.get("call_id") or request.get("call_id") or ""
    log.info(Phase.WEBHOOK_RETELL, f"event.{event_type}", call_id=cid, data={"keys": list(request.keys())})

    from app.webhooks.retell_handler import handle_retell_event
    try:
        return handle_retell_event(request)
    except Exception as e:
        log.exception(Phase.WEBHOOK_RETELL, "handler.exception", e, call_id=cid)
        return {"status": "error", "message": str(e)}


@web_app.post("/twilio-webhook")
def twilio_webhook(request: dict):
    log.info(Phase.WEBHOOK_TWILIO, "event.received", data={"keys": list(request.keys())})
    from app.webhooks.twilio_handler import handle_twilio_event
    try:
        return handle_twilio_event(request)
    except Exception as e:
        log.exception(Phase.WEBHOOK_TWILIO, "handler.exception", e)
        return {"status": "error", "message": str(e)}


# ── Agent tools (called by Retell during a live call) ───────────────────────


@web_app.post("/search-properties")
def search_properties(request: dict):
    log.info(Phase.HTTP_IN, "search_properties.start", data=request)
    try:
        from app.services.notion_service import search_properties as _search
        args = request.get("args", request)
        results = _search(
            zona=args.get("zona"),
            presupuesto_max=args.get("presupuesto_max"),
            recamaras_min=args.get("recamaras_min"),
            tipo=args.get("tipo"),
            operacion=args.get("operacion"),
        )
        log.info(Phase.NOTION, "search_properties.ok", data={"count": len(results)})
        return {"status": "ok", "count": len(results), "properties": results}
    except Exception as e:
        log.exception(Phase.NOTION, "search_properties.fail", e, data=request)
        return {"status": "error", "message": str(e)}


@web_app.post("/create-lead")
def create_lead(request: dict):
    log.info(Phase.HTTP_IN, "create_lead.start", data=request)
    try:
        from app.services.notion_service import create_lead as _create
        args = request.get("args", request)
        lead = _create(
            name=args.get("name", ""),
            phone=args.get("phone", ""),
            email=args.get("email", ""),
            presupuesto=args.get("presupuesto"),
            zona_interes=args.get("zona_interes"),
            tipo_buscado=args.get("tipo_buscado"),
            operacion_buscada=args.get("operacion_buscada"),
            fuente=args.get("fuente", "Llamada entrante"),
            notas=args.get("notas", ""),
        )
        log.info(Phase.NOTION, "create_lead.ok", data={"lead_id": lead["id"]})
        return {"status": "ok", "lead": lead}
    except Exception as e:
        log.exception(Phase.NOTION, "create_lead.fail", e, data=request)
        return {"status": "error", "message": str(e)}


@web_app.post("/book-visit")
def book_visit(request: dict):
    log.info(Phase.HTTP_IN, "book_visit.start", data=request)
    try:
        from app.services.calcom_service import create_booking, get_available_slots
        from app.services.notion_service import find_lead_by_phone, update_lead

        args = request.get("args", request)
        phone = args.get("phone", "")
        name = args.get("name", "")
        email = args.get("email", "cliente@inmobiliaria.com")
        event_type_id = int(args.get("event_type_id", 0))
        preferred_date = args.get("preferred_date", "")
        preferred_time = args.get("preferred_time", "")

        if preferred_date and preferred_time:
            start = f"{preferred_date}T{preferred_time}:00"
            booking = create_booking(event_type_id=event_type_id, start=start, name=name, email=email)
            log.info(Phase.CALCOM, "booking.created", data={"start": start})

            if phone:
                lead = find_lead_by_phone(phone)
                if lead:
                    update_lead(
                        page_id=lead["id"],
                        estatus="Cita agendada",
                        siguiente_accion=f"Visita agendada: {preferred_date} {preferred_time}",
                    )
            return {"status": "ok", "booking": booking}

        if preferred_date:
            slots = get_available_slots(event_type_id=event_type_id, start_date=preferred_date, end_date=preferred_date)
            return {"status": "ok", "available_slots": slots}

        return {"status": "error", "message": "Se necesita al menos preferred_date"}
    except Exception as e:
        log.exception(Phase.CALCOM, "book_visit.fail", e, data=request)
        return {"status": "error", "message": str(e)}


@web_app.post("/update-lead-status")
def update_lead_status(request: dict):
    log.info(Phase.HTTP_IN, "update_lead_status.start", data=request)
    try:
        from app.services.notion_service import find_lead_by_phone, update_lead

        args = request.get("args", request)
        phone = args.get("phone", "")
        page_id = args.get("lead_id", "")

        if not page_id and phone:
            lead = find_lead_by_phone(phone)
            if not lead:
                log.warn(Phase.NOTION, "update_lead.not_found", data={"phone": phone})
                return {"status": "error", "message": f"No se encontró lead con teléfono {phone}"}
            page_id = lead["id"]

        if not page_id:
            return {"status": "error", "message": "Se necesita phone o lead_id"}

        result = update_lead(
            page_id=page_id,
            estatus=args.get("estatus"),
            temperatura=args.get("temperatura"),
            siguiente_accion=args.get("siguiente_accion"),
        )
        log.info(Phase.NOTION, "update_lead.ok", data={"page_id": page_id})
        return {"status": "ok", "result": result}
    except Exception as e:
        log.exception(Phase.NOTION, "update_lead.fail", e, data=request)
        return {"status": "error", "message": str(e)}


@web_app.post("/post-call-summary")
def post_call_summary(request: dict):
    call_id = request.get("call_id", "")
    log.info(Phase.HTTP_IN, "post_call_summary.start", call_id=call_id)
    try:
        from app.webhooks.retell_handler import process_post_call
        if not call_id:
            return {"status": "error", "message": "Se necesita call_id"}
        return process_post_call(call_id)
    except Exception as e:
        log.exception(Phase.CALL_ANALYZED, "post_call.fail", e, call_id=call_id)
        return {"status": "error", "message": str(e)}


# ── Admin: Retell agents ────────────────────────────────────────────────────


@web_app.get("/admin/agents")
def admin_list_agents():
    from app.admin.retell_mgmt import list_agents
    try:
        return {"status": "ok", "agents": list_agents()}
    except Exception as e:
        log.exception(Phase.RETELL, "admin.agents.list.fail", e)
        return {"status": "error", "message": str(e)}


@web_app.get("/admin/agents/{agent_id}")
def admin_get_agent(agent_id: str):
    from app.admin.retell_mgmt import get_agent, get_llm
    try:
        agent = get_agent(agent_id)
        llm_id = (agent.get("response_engine") or {}).get("llm_id")
        llm = get_llm(llm_id) if llm_id else {}
        return {"status": "ok", "agent": agent, "llm": llm}
    except Exception as e:
        log.exception(Phase.RETELL, "admin.agents.get.fail", e)
        return {"status": "error", "message": str(e)}


@web_app.post("/admin/agents")
def admin_create_agent(request: dict):
    from app.admin.retell_mgmt import create_agent_simple
    try:
        result = create_agent_simple(
            name=request.get("name", "Nuevo agente"),
            model=request.get("model", "claude-4.5-sonnet"),
            voice_id=request.get("voice_id", "cartesia-Sofia"),
            language=request.get("language", "es-419"),
            begin_message=request.get("begin_message", "Hola, ¿en qué puedo ayudarle?"),
            general_prompt=request.get("general_prompt", "Eres un asistente profesional."),
            temperature=float(request.get("temperature", 0.4)),
            webhook_url=request.get("webhook_url"),
            timezone=request.get("timezone", "America/Mexico_City"),
        )
        return {"status": "ok", **result}
    except Exception as e:
        log.exception(Phase.RETELL, "admin.agents.create.fail", e, data=request)
        return {"status": "error", "message": str(e)}


@web_app.patch("/admin/agents/{agent_id}")
def admin_update_agent(agent_id: str, request: dict):
    from app.admin.retell_mgmt import get_agent, update_agent, update_llm
    try:
        agent_patch = {}
        for k in ("agent_name", "voice_id", "language", "timezone", "voice_speed",
                  "responsiveness", "interruption_sensitivity", "webhook_url"):
            if k in request and request[k] is not None:
                agent_patch[k] = request[k]

        llm_patch = {}
        for k in ("begin_message", "general_prompt", "model_temperature", "model"):
            if k in request and request[k] is not None:
                llm_patch[k] = request[k]

        result: dict = {"agent_updated": False, "llm_updated": False}

        if agent_patch:
            update_agent(agent_id, agent_patch)
            result["agent_updated"] = True

        if llm_patch:
            agent = get_agent(agent_id)
            llm_id = (agent.get("response_engine") or {}).get("llm_id")
            if llm_id:
                update_llm(llm_id, llm_patch)
                result["llm_updated"] = True

        return {"status": "ok", **result}
    except Exception as e:
        log.exception(Phase.RETELL, "admin.agents.update.fail", e, data=request)
        return {"status": "error", "message": str(e)}


@web_app.delete("/admin/agents/{agent_id}")
def admin_delete_agent(agent_id: str):
    from app.admin.retell_mgmt import delete_agent
    try:
        delete_agent(agent_id)
        return {"status": "ok"}
    except Exception as e:
        log.exception(Phase.RETELL, "admin.agents.delete.fail", e)
        return {"status": "error", "message": str(e)}


@web_app.get("/admin/voices")
def admin_list_voices():
    from app.admin.retell_mgmt import list_voices
    try:
        return {"status": "ok", "voices": list_voices()}
    except Exception as e:
        log.exception(Phase.RETELL, "admin.voices.list.fail", e)
        return {"status": "error", "message": str(e)}


@web_app.post("/admin/voices/clone")
def admin_clone_voice(request: dict):
    """Create a custom (cloned) voice from a sample audio URL.

    Body: { "voice_name": "Mi voz", "audio_url": "https://...wav" }
    """
    from app.admin.retell_mgmt import create_custom_voice
    voice_name = (request.get("voice_name") or "").strip()
    audio_url = (request.get("audio_url") or "").strip()
    audio_format = (request.get("audio_format") or "wav").strip()

    if not voice_name or not audio_url:
        return {"status": "error", "message": "Falta voice_name o audio_url"}

    try:
        result = create_custom_voice(voice_name, audio_url, audio_format)
        log.info(Phase.RETELL, "admin.voices.clone.ok", data={"voice_name": voice_name})
        return {"status": "ok", "voice": result}
    except Exception as e:
        log.exception(Phase.RETELL, "admin.voices.clone.fail", e, data=request)
        return {"status": "error", "message": str(e)[:300]}


@web_app.delete("/admin/voices/{voice_id}")
def admin_delete_voice(voice_id: str):
    from app.admin.retell_mgmt import delete_voice
    try:
        delete_voice(voice_id)
        return {"status": "ok"}
    except Exception as e:
        log.exception(Phase.RETELL, "admin.voices.delete.fail", e)
        return {"status": "error", "message": str(e)}


# ── Admin: Phone numbers (Twilio + Retell) ──────────────────────────────────


@web_app.get("/admin/phone-numbers")
def admin_list_numbers():
    from app.admin import retell_mgmt, twilio_mgmt
    try:
        twilio_nums = twilio_mgmt.list_numbers()
        retell_nums = retell_mgmt.list_phone_numbers()
        trunks = twilio_mgmt.list_trunks()
        balance = twilio_mgmt.get_balance()
        # Cross-reference: mark which Twilio numbers are imported in Retell
        retell_set = {p["phone_number"] for p in retell_nums}
        for n in twilio_nums:
            n["imported_in_retell"] = n["phone_number"] in retell_set
        return {
            "status": "ok",
            "twilio_numbers": twilio_nums,
            "retell_numbers": retell_nums,
            "twilio_trunks": trunks,
            "twilio_balance": balance,
        }
    except Exception as e:
        log.exception(Phase.SYSTEM, "admin.numbers.list.fail", e)
        return {"status": "error", "message": str(e)}


@web_app.get("/admin/phone-numbers/available")
def admin_search_numbers(
    country: str = "US",
    area_code: str | None = None,
    contains: str | None = None,
):
    from app.admin.twilio_mgmt import search_available
    try:
        return {"status": "ok", "available": search_available(country=country, area_code=area_code, contains=contains)}
    except Exception as e:
        log.exception(Phase.TWILIO, "admin.numbers.search.fail", e)
        return {"status": "error", "message": str(e)}


@web_app.post("/admin/phone-numbers/buy")
def admin_buy_number(request: dict):
    from app.admin import twilio_mgmt
    try:
        result = twilio_mgmt.buy_number(
            phone_number=request["phone_number"],
            friendly_name=request.get("friendly_name", "Sofia"),
        )
        # Optionally: associate to trunk if trunk_sid provided
        if request.get("trunk_sid"):
            twilio_mgmt.associate_number_to_trunk(request["trunk_sid"], result["sid"])
        return {"status": "ok", **result}
    except Exception as e:
        log.exception(Phase.TWILIO, "admin.numbers.buy.fail", e, data=request)
        return {"status": "error", "message": str(e)}


@web_app.delete("/admin/phone-numbers/twilio/{sid}")
def admin_release_number(sid: str):
    from app.admin.twilio_mgmt import release_number
    try:
        release_number(sid)
        return {"status": "ok"}
    except Exception as e:
        log.exception(Phase.TWILIO, "admin.numbers.release.fail", e)
        return {"status": "error", "message": str(e)}


@web_app.post("/admin/phone-numbers/retell/import")
def admin_retell_import_number(request: dict):
    from app.admin.retell_mgmt import import_phone_number
    try:
        result = import_phone_number(
            phone_number=request["phone_number"],
            termination_uri=request["termination_uri"],
            inbound_agent_id=request.get("inbound_agent_id"),
            outbound_agent_id=request.get("outbound_agent_id"),
            nickname=request.get("nickname", ""),
        )
        return {"status": "ok", "data": result}
    except Exception as e:
        log.exception(Phase.RETELL, "admin.retell.import.fail", e, data=request)
        return {"status": "error", "message": str(e)}


@web_app.patch("/admin/phone-numbers/retell/{phone_number}")
def admin_retell_update_number(phone_number: str, request: dict):
    from app.admin.retell_mgmt import update_phone_number
    try:
        patch = {k: v for k, v in request.items() if v is not None and k in (
            "inbound_agent_id", "outbound_agent_id", "nickname"
        )}
        if not patch:
            return {"status": "error", "message": "Nothing to update"}
        update_phone_number(phone_number, patch)
        return {"status": "ok"}
    except Exception as e:
        log.exception(Phase.RETELL, "admin.retell.update_number.fail", e)
        return {"status": "error", "message": str(e)}


@web_app.delete("/admin/phone-numbers/retell/{phone_number}")
def admin_retell_delete_number(phone_number: str):
    from app.admin.retell_mgmt import delete_phone_number
    try:
        delete_phone_number(phone_number)
        return {"status": "ok"}
    except Exception as e:
        log.exception(Phase.RETELL, "admin.retell.delete_number.fail", e)
        return {"status": "error", "message": str(e)}


# ── Auth: OTP + JWT session ────────────────────────────────────────────────


@web_app.post("/auth/quick-signin")
def auth_quick_signin(request: dict):
    """Passwordless sign-in: receives an email, issues a JWT immediately.

    NO email verification. Use only for development or when domain is not yet
    verified in Resend. Switch back to OTP flow (/auth/request-code +
    /auth/verify-code) once a verified sender is configured.
    """
    from app.auth import create_session_token

    email = (request.get("email") or "").strip().lower()
    if not email or "@" not in email:
        return {"status": "error", "message": "Email inválido"}

    token = create_session_token(email)
    log.info(Phase.SYSTEM, "auth.quick_signin", data={"email": email})
    return {"status": "ok", "token": token, "email": email}


@web_app.post("/auth/request-code")
def auth_request_code(request: dict):
    """Generate OTP, store it, and email it to the user."""
    from app.auth import generate_otp, send_otp_email, store_otp

    email = (request.get("email") or "").strip().lower()
    if not email or "@" not in email:
        return {"status": "error", "message": "Email inválido"}

    code = generate_otp()
    store_otp(email, code)
    log.info(Phase.SYSTEM, "auth.request_code", data={"email": email})

    try:
        delivery = send_otp_email(email, code)
        sandbox = bool(delivery.get("sandbox_redirect"))
        msg = "Código enviado"
        if sandbox:
            msg = "Modo sandbox: copia el código de la pantalla"
        response: dict = {
            "status": "ok",
            "message": msg,
            "sent_to": delivery.get("sent_to"),
            "sandbox_redirect": sandbox,
            "email_sent": True,
        }
        # When in sandbox (no domain verified in Resend), expose the code so
        # the frontend can show it directly. When a domain is verified in Resend,
        # sandbox_redirect is False and dev_code is NOT exposed.
        if sandbox:
            response["dev_code"] = code
        return response
    except Exception as e:
        # Email failed — fallback: devolver el código directo al cliente para
        # que lo pueda mostrar en pantalla (development only, sin verificación
        # real). En producción con dominio Resend verificado, esto nunca se
        # ejecuta porque send_otp_email no lanza excepción.
        log.warn(
            Phase.SYSTEM,
            "auth.request_code.fallback_inline",
            data={"email": email, "reason": str(e)[:200]},
        )
        return {
            "status": "ok",
            "message": "Email no enviado. Usa el código que aparece abajo.",
            "sent_to": None,
            "sandbox_redirect": False,
            "email_sent": False,
            "dev_code": code,
            "delivery_error": str(e)[:200],
        }


@web_app.post("/auth/verify-code")
def auth_verify_code(request: dict):
    """Verify OTP, issue JWT on success."""
    from app.auth import create_session_token, verify_otp

    email = (request.get("email") or "").strip().lower()
    code = (request.get("code") or "").strip()

    if not email or not code:
        return {"status": "error", "message": "Faltan email o código"}

    ok, reason = verify_otp(email, code)
    if not ok:
        log.warn(Phase.SYSTEM, "auth.verify_code.fail", data={"email": email, "reason": reason})
        return {"status": "error", "message": reason}

    token = create_session_token(email)
    log.info(Phase.SYSTEM, "auth.verify_code.ok", data={"email": email})
    return {"status": "ok", "token": token, "email": email}


@web_app.get("/auth/me")
def auth_me(request: Request):
    """Return current session info. Reads token from Authorization header or cookie."""
    from app.auth import verify_session_token

    token = None
    auth_hdr = request.headers.get("authorization", "")
    if auth_hdr.lower().startswith("bearer "):
        token = auth_hdr[7:].strip()
    if not token:
        token = request.cookies.get("sofia_session")

    if not token:
        return {"status": "anonymous"}

    payload = verify_session_token(token)
    if not payload:
        return {"status": "anonymous"}

    return {"status": "authenticated", "email": payload.get("sub")}


# ── Admin: Team ─────────────────────────────────────────────────────────────


@web_app.get("/admin/team")
def admin_list_team():
    from app.admin import team
    try:
        return {"status": "ok", "members": team.list_members()}
    except Exception as e:
        log.exception(Phase.SYSTEM, "admin.team.list.fail", e)
        return {"status": "error", "message": str(e)}


@web_app.post("/admin/team")
def admin_add_member(request: dict):
    from app.admin import team
    try:
        member = team.add_member(
            name=request.get("name", ""),
            email=request.get("email", ""),
            role=request.get("role", "editor"),
            invited_by=request.get("invited_by", ""),
        )
        return {"status": "ok", "member": member}
    except Exception as e:
        log.exception(Phase.SYSTEM, "admin.team.add.fail", e, data=request)
        return {"status": "error", "message": str(e)}


@web_app.patch("/admin/team/{member_id}")
def admin_update_member(member_id: str, request: dict):
    from app.admin import team
    try:
        member = team.update_member(member_id, role=request.get("role"), status=request.get("status"))
        return {"status": "ok", "member": member}
    except Exception as e:
        log.exception(Phase.SYSTEM, "admin.team.update.fail", e)
        return {"status": "error", "message": str(e)}


@web_app.delete("/admin/team/{member_id}")
def admin_delete_member(member_id: str):
    from app.admin import team
    try:
        team.remove_member(member_id)
        return {"status": "ok"}
    except Exception as e:
        log.exception(Phase.SYSTEM, "admin.team.delete.fail", e)
        return {"status": "error", "message": str(e)}


# ── Admin: Templates ────────────────────────────────────────────────────────


@web_app.get("/admin/templates")
def admin_list_templates():
    from app.admin import templates as tpl
    try:
        return {"status": "ok", "templates": tpl.list_templates()}
    except Exception as e:
        log.exception(Phase.SYSTEM, "admin.templates.list.fail", e)
        return {"status": "error", "message": str(e)}


@web_app.post("/admin/templates")
def admin_create_template(request: dict):
    from app.admin import templates as tpl
    try:
        t = tpl.create_template(
            name=request.get("name", ""),
            category=request.get("category", "Otros"),
            description=request.get("description", ""),
            begin_message=request.get("begin_message", ""),
            general_prompt=request.get("general_prompt", ""),
        )
        return {"status": "ok", "template": t}
    except Exception as e:
        log.exception(Phase.SYSTEM, "admin.templates.create.fail", e, data=request)
        return {"status": "error", "message": str(e)}


@web_app.patch("/admin/templates/{template_id}")
def admin_update_template_endpoint(template_id: str, request: dict):
    from app.admin import templates as tpl
    try:
        t = tpl.update_template(template_id, request)
        return {"status": "ok", "template": t}
    except Exception as e:
        log.exception(Phase.SYSTEM, "admin.templates.update.fail", e)
        return {"status": "error", "message": str(e)}


@web_app.delete("/admin/templates/{template_id}")
def admin_delete_template(template_id: str):
    from app.admin import templates as tpl
    try:
        tpl.delete_template(template_id)
        return {"status": "ok"}
    except Exception as e:
        log.exception(Phase.SYSTEM, "admin.templates.delete.fail", e)
        return {"status": "error", "message": str(e)}


@web_app.post("/admin/templates/{template_id}/apply")
def admin_apply_template(template_id: str, request: dict):
    """Apply a template to an agent (updates its LLM begin_message + prompt)."""
    from app.admin import templates as tpl
    from app.admin.retell_mgmt import get_agent, update_llm

    agent_id = (request.get("agent_id") or "").strip()
    if not agent_id:
        return {"status": "error", "message": "agent_id requerido"}

    t = tpl.get_template(template_id)
    if not t:
        return {"status": "error", "message": "Plantilla no encontrada"}

    try:
        agent = get_agent(agent_id)
        llm_id = (agent.get("response_engine") or {}).get("llm_id")
        if not llm_id:
            return {"status": "error", "message": "Agente no tiene LLM asociado"}
        patch: dict = {}
        if t.get("begin_message"):
            patch["begin_message"] = t["begin_message"]
        if t.get("general_prompt"):
            patch["general_prompt"] = t["general_prompt"]
        update_llm(llm_id, patch)
        tpl.increment_usage(template_id)
        return {"status": "ok", "applied_to": agent_id}
    except Exception as e:
        log.exception(Phase.SYSTEM, "admin.templates.apply.fail", e)
        return {"status": "error", "message": str(e)}


# ── Admin: WhatsApp (Twilio Sandbox passthrough) ────────────────────────────


@web_app.get("/admin/whatsapp")
def admin_whatsapp_state():
    from app.admin import whatsapp as wa
    try:
        return {
            "status": "ok",
            "sandbox": wa.get_sandbox_info(),
            "subscribers": wa.list_subscribers(),
        }
    except Exception as e:
        log.exception(Phase.SYSTEM, "admin.whatsapp.list.fail", e)
        return {"status": "error", "message": str(e)}


@web_app.post("/admin/whatsapp/connect")
def admin_whatsapp_connect(request: dict):
    from app.admin import whatsapp as wa
    phone = (request.get("phone_number") or "").strip()
    label = (request.get("label") or "").strip()
    if not phone:
        return {"status": "error", "message": "Falta phone_number"}
    try:
        sub = wa.add_subscriber(phone, label)
        return {"status": "ok", "subscriber": sub, "sandbox": wa.get_sandbox_info()}
    except Exception as e:
        log.exception(Phase.SYSTEM, "admin.whatsapp.connect.fail", e, data=request)
        return {"status": "error", "message": str(e)}


@web_app.post("/admin/whatsapp/{sub_id}/retry")
def admin_whatsapp_retry(sub_id: str):
    from app.admin import whatsapp as wa
    try:
        sub = wa.retry_subscriber(sub_id)
        return {"status": "ok", "subscriber": sub}
    except Exception as e:
        log.exception(Phase.SYSTEM, "admin.whatsapp.retry.fail", e)
        return {"status": "error", "message": str(e)}


@web_app.delete("/admin/whatsapp/{sub_id}")
def admin_whatsapp_remove(sub_id: str):
    from app.admin import whatsapp as wa
    try:
        wa.remove_subscriber(sub_id)
        return {"status": "ok"}
    except Exception as e:
        log.exception(Phase.SYSTEM, "admin.whatsapp.remove.fail", e)
        return {"status": "error", "message": str(e)}


# ── Admin: Integrations + Webhooks ──────────────────────────────────────────


@web_app.get("/admin/integrations")
def admin_list_integrations():
    from app.admin.integrations import INTEGRATIONS_CATALOG, list_webhooks
    return {
        "status": "ok",
        "catalog": INTEGRATIONS_CATALOG,
        "webhooks": list_webhooks(),
    }


@web_app.post("/admin/webhooks")
def admin_create_webhook(request: dict):
    from app.admin import integrations as ints
    try:
        w = ints.create_webhook(
            name=request.get("name", "Webhook"),
            url=request.get("url", ""),
            events=request.get("events", []),
            integration=request.get("integration", "custom"),
            enabled=bool(request.get("enabled", True)),
        )
        return {"status": "ok", "webhook": w}
    except Exception as e:
        log.exception(Phase.SYSTEM, "admin.webhooks.create.fail", e, data=request)
        return {"status": "error", "message": str(e)}


@web_app.patch("/admin/webhooks/{webhook_id}")
def admin_update_webhook(webhook_id: str, request: dict):
    from app.admin import integrations as ints
    try:
        w = ints.update_webhook(webhook_id, request)
        return {"status": "ok", "webhook": w}
    except Exception as e:
        log.exception(Phase.SYSTEM, "admin.webhooks.update.fail", e)
        return {"status": "error", "message": str(e)}


@web_app.delete("/admin/webhooks/{webhook_id}")
def admin_delete_webhook(webhook_id: str):
    from app.admin import integrations as ints
    try:
        ints.delete_webhook(webhook_id)
        return {"status": "ok"}
    except Exception as e:
        log.exception(Phase.SYSTEM, "admin.webhooks.delete.fail", e)
        return {"status": "error", "message": str(e)}


@web_app.post("/admin/webhooks/{webhook_id}/test")
def admin_test_webhook(webhook_id: str):
    from app.admin import integrations as ints
    try:
        result = ints.test_webhook(webhook_id)
        return {"status": "ok", "result": result}
    except Exception as e:
        log.exception(Phase.SYSTEM, "admin.webhooks.test.fail", e)
        return {"status": "error", "message": str(e)}


# ── Campaigns ───────────────────────────────────────────────────────────────


@web_app.get("/admin/campaigns")
def admin_list_campaigns():
    from app.admin.campaigns import list_campaigns
    try:
        return {"status": "ok", "campaigns": list_campaigns()}
    except Exception as e:
        log.exception(Phase.SYSTEM, "campaigns.list.fail", e)
        return {"status": "error", "message": str(e)}


@web_app.post("/admin/campaigns")
def admin_create_campaign(request: dict):
    from app.admin.campaigns import create_campaign
    try:
        c = create_campaign(
            name=request.get("name", ""),
            agent_id=request.get("agent_id", ""),
            leads=request.get("leads") or [],
            scheduled_at=request.get("scheduled_at"),
            notes=request.get("notes", ""),
        )
        return {"status": "ok", "campaign": c}
    except ValueError as e:
        return {"status": "error", "message": str(e)}
    except Exception as e:
        log.exception(Phase.SYSTEM, "campaigns.create.fail", e, data=request)
        return {"status": "error", "message": str(e)}


@web_app.patch("/admin/campaigns/{campaign_id}")
def admin_update_campaign(campaign_id: str, request: dict):
    from app.admin.campaigns import update_campaign
    try:
        c = update_campaign(campaign_id, request)
        return {"status": "ok", "campaign": c}
    except ValueError as e:
        return {"status": "error", "message": str(e)}
    except Exception as e:
        log.exception(Phase.SYSTEM, "campaigns.update.fail", e, data=request)
        return {"status": "error", "message": str(e)}


@web_app.delete("/admin/campaigns/{campaign_id}")
def admin_delete_campaign(campaign_id: str):
    from app.admin.campaigns import delete_campaign
    try:
        delete_campaign(campaign_id)
        return {"status": "ok"}
    except Exception as e:
        log.exception(Phase.SYSTEM, "campaigns.delete.fail", e)
        return {"status": "error", "message": str(e)}


# ── Knowledge base ──────────────────────────────────────────────────────────


@web_app.get("/admin/knowledge")
def admin_list_knowledge():
    from app.admin.knowledge import list_documents
    try:
        return {"status": "ok", "documents": list_documents()}
    except Exception as e:
        log.exception(Phase.SYSTEM, "knowledge.list.fail", e)
        return {"status": "error", "message": str(e)}


@web_app.post("/admin/knowledge")
def admin_create_knowledge(request: dict):
    from app.admin.knowledge import create_document
    try:
        d = create_document(
            title=request.get("title", ""),
            content=request.get("content", ""),
            tags=request.get("tags") or [],
        )
        return {"status": "ok", "document": d}
    except ValueError as e:
        return {"status": "error", "message": str(e)}
    except Exception as e:
        log.exception(Phase.SYSTEM, "knowledge.create.fail", e, data=request)
        return {"status": "error", "message": str(e)}


@web_app.patch("/admin/knowledge/{doc_id}")
def admin_update_knowledge(doc_id: str, request: dict):
    from app.admin.knowledge import update_document
    try:
        d = update_document(doc_id, request)
        return {"status": "ok", "document": d}
    except ValueError as e:
        return {"status": "error", "message": str(e)}
    except Exception as e:
        log.exception(Phase.SYSTEM, "knowledge.update.fail", e, data=request)
        return {"status": "error", "message": str(e)}


@web_app.delete("/admin/knowledge/{doc_id}")
def admin_delete_knowledge(doc_id: str):
    from app.admin.knowledge import delete_document
    try:
        delete_document(doc_id)
        return {"status": "ok"}
    except Exception as e:
        log.exception(Phase.SYSTEM, "knowledge.delete.fail", e)
        return {"status": "error", "message": str(e)}


# ── Onboarding / Industries ────────────────────────────────────────────────


@web_app.get("/admin/industries")
def admin_list_industries():
    from app.industries import list_industries
    return {"status": "ok", "industries": list_industries()}


@web_app.post("/admin/generate-prompt")
def admin_generate_prompt(request: dict):
    """Generate a custom agent prompt from a business description using Claude.

    Body: { "description": "...", "agent_name": "...", "business_name": "...", "city": "..." }
    Returns: { "begin_message": "...", "general_prompt": "..." }
    """
    import os

    import anthropic

    description = (request.get("description") or "").strip()
    agent_name = (request.get("agent_name") or "Sofía").strip()
    business_name = (request.get("business_name") or "tu negocio").strip()
    city = (request.get("city") or "tu ciudad").strip()

    if len(description) < 30:
        return {"status": "error", "message": "Describe tu negocio con más detalle (mínimo 30 caracteres)."}

    log.info(Phase.SYSTEM, "generate_prompt.start", data={
        "desc_len": len(description),
        "agent_name": agent_name,
        "business_name": business_name,
    })

    system_instruction = """Eres un experto en diseño de agentes de voz para atención al cliente. Tu tarea: crear el prompt de sistema de un agente virtual que contesta el teléfono de un negocio.

Responderás ÚNICAMENTE con un JSON válido (sin markdown, sin backticks) con exactamente esta estructura:
{
  "begin_message": "La primera frase que dice el agente al contestar. Debe mencionar el nombre del negocio y del agente, y preguntar en qué puede ayudar. 1 oración.",
  "general_prompt": "El prompt completo del agente con 4 secciones: ## Personalidad (3-4 bullets), ## Flujo (4-6 pasos numerados), ## Reglas (3-4 bullets). Entre 300 y 600 palabras. Usa markdown."
}

El agente debe hablar español mexicano/latinoamericano natural, ser breve (es llamada telefónica), y nunca inventar información del negocio."""

    user_prompt = f"""Negocio: {business_name} (en {city})
Nombre del agente: {agent_name}
Descripción del negocio: {description}

Genera el JSON del prompt del agente."""

    try:
        client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
        message = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=2000,
            system=system_instruction,
            messages=[{"role": "user", "content": user_prompt}],
        )
        raw = message.content[0].text.strip()

        # Strip markdown fences if Claude slipped any
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
            if raw.endswith("```"):
                raw = raw[:-3]
            raw = raw.strip()

        import json as _json
        parsed = _json.loads(raw)
        begin = parsed.get("begin_message", "").strip()
        prompt = parsed.get("general_prompt", "").strip()

        if not begin or not prompt:
            raise ValueError("Respuesta de Claude sin campos requeridos")

        log.info(Phase.ANTHROPIC, "generate_prompt.ok", data={
            "begin_len": len(begin),
            "prompt_len": len(prompt),
        })
        return {
            "status": "ok",
            "begin_message": begin,
            "general_prompt": prompt,
        }
    except Exception as e:
        log.exception(Phase.ANTHROPIC, "generate_prompt.fail", e, data=request)
        return {"status": "error", "message": str(e)[:300]}


def _email_from_request(request: Request) -> str | None:
    """Extract authenticated email from Authorization bearer or cookie."""
    from app.auth import verify_session_token

    token = None
    auth_hdr = request.headers.get("authorization", "")
    if auth_hdr.lower().startswith("bearer "):
        token = auth_hdr[7:].strip()
    if not token:
        token = request.cookies.get("sofia_session")
    if not token:
        return None
    payload = verify_session_token(token)
    return payload.get("sub") if payload else None


@web_app.get("/admin/my-agent")
def admin_my_agent(request: Request):
    """Return the agent linked to the authenticated user, plus its LLM config."""
    from app.admin.retell_mgmt import get_agent, get_llm
    from app.user_agents import get_user_agent

    email = _email_from_request(request)
    if not email:
        return {"status": "unauthenticated"}

    link = get_user_agent(email)
    if not link:
        return {"status": "no_agent", "email": email}

    try:
        agent = get_agent(link["agent_id"])
        llm_id = (agent.get("response_engine") or {}).get("llm_id") or link.get("llm_id")
        llm = get_llm(llm_id) if llm_id else {}
        return {
            "status": "ok",
            "email": email,
            "link": link,
            "agent": agent,
            "llm": llm,
        }
    except Exception as e:
        log.exception(Phase.RETELL, "admin.my_agent.fail", e, data={"email": email})
        return {"status": "error", "message": str(e), "link": link}


@web_app.patch("/admin/my-agent/llm")
def admin_update_my_llm(request: Request, body: dict = Body(...)):
    """Update the authenticated user's agent LLM (begin_message, prompt, temperature)."""
    from app.admin.retell_mgmt import update_llm
    from app.user_agents import get_user_agent

    email = _email_from_request(request)
    if not email:
        return {"status": "unauthenticated"}

    link = get_user_agent(email)
    if not link:
        return {"status": "error", "message": "No agent linked to this user"}

    patch = {}
    if "begin_message" in body:
        patch["begin_message"] = body["begin_message"]
    if "general_prompt" in body:
        patch["general_prompt"] = body["general_prompt"]
    if "model_temperature" in body:
        patch["model_temperature"] = float(body["model_temperature"])

    if not patch:
        return {"status": "error", "message": "Nothing to update"}

    try:
        result = update_llm(link["llm_id"], patch)
        log.info(Phase.RETELL, "admin.my_llm.updated", data={"email": email, "fields": list(patch.keys())})
        return {"status": "ok", "llm_id": result.get("llm_id")}
    except Exception as e:
        log.exception(Phase.RETELL, "admin.my_llm.fail", e)
        return {"status": "error", "message": str(e)}


@web_app.post("/admin/generate-prompt")
def admin_generate_prompt(request: dict):
    """Use Claude to generate a custom agent prompt from a business description.

    Body: {
      "business_name": "...",
      "city": "...",
      "agent_name": "...",
      "description": "describe your business in 2-3 sentences"
    }
    """
    import os
    from anthropic import Anthropic

    business_name = (request.get("business_name") or "").strip()
    city = (request.get("city") or "").strip()
    agent_name = (request.get("agent_name") or "Sofía").strip()
    description = (request.get("description") or "").strip()

    if not description:
        return {"status": "error", "message": "Falta descripción del negocio"}

    log.info(Phase.ANTHROPIC, "generate_prompt.start", data={"business": business_name, "desc_len": len(description)})

    system_prompt = """Eres un experto en diseñar prompts para agentes de voz con IA. Tu tarea es crear un prompt personalizado para un agente de voz que recibirá llamadas de clientes de un negocio específico.

Genera un prompt en español que incluya:
1. Identidad del agente (nombre + empresa + ciudad)
2. Personalidad (profesional, amable, adaptada al tipo de negocio)
3. Flujo típico de llamada (4-6 pasos claros)
4. Reglas importantes (qué hacer/no hacer)

El prompt debe:
- Estar en segunda persona ("Eres...")
- Ser directo y conciso (máximo 800 palabras)
- Usar markdown con ## secciones
- Adaptarse al tono natural del negocio descrito
- Nunca inventar información que el agente no pueda verificar

Responde ÚNICAMENTE con el texto del prompt generado. Sin comentarios previos, sin markdown code fences, sin texto adicional."""

    user_msg = f"""Genera un prompt personalizado para el siguiente negocio:

**Negocio:** {business_name or "(sin nombre)"}
**Ciudad:** {city or "(no especificada)"}
**Nombre del agente:** {agent_name}

**Descripción del negocio (del dueño):**
{description}

Genera el prompt ahora."""

    try:
        client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
        msg = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=2000,
            system=system_prompt,
            messages=[{"role": "user", "content": user_msg}],
        )
        generated = "".join(b.text for b in msg.content if hasattr(b, "text")).strip()

        # Also generate a natural greeting
        greeting_msg = f"""Basado en este prompt de agente, genera el mensaje de saludo inicial (2-3 líneas máximo) que el agente dirá al contestar una llamada entrante. Responde ÚNICAMENTE con el texto del saludo, sin comillas.

Agente: {agent_name}
Negocio: {business_name}
Descripción: {description[:200]}"""

        greeting_resp = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=200,
            messages=[{"role": "user", "content": greeting_msg}],
        )
        greeting = "".join(b.text for b in greeting_resp.content if hasattr(b, "text")).strip().strip('"')

        log.info(Phase.ANTHROPIC, "generate_prompt.ok", data={"prompt_len": len(generated)})
        return {
            "status": "ok",
            "general_prompt": generated,
            "begin_message": greeting,
        }
    except Exception as e:
        log.exception(Phase.ANTHROPIC, "generate_prompt.fail", e)
        return {"status": "error", "message": str(e)}


@web_app.post("/admin/generate-prompt")
def admin_generate_prompt(request: dict):
    """Generate an agent prompt from a free-form business description using Claude.

    Body: { business_name, city, agent_name, description }
    Returns: { status: "ok", begin_message, general_prompt }
    """
    import json
    import os
    import anthropic

    business_name = (request.get("business_name") or "").strip()
    city = (request.get("city") or "").strip()
    agent_name = (request.get("agent_name") or "Sofía").strip()
    description = (request.get("description") or "").strip()

    if not description or len(description) < 10:
        return {"status": "error", "message": "Describe tu negocio con al menos 10 caracteres."}

    log.info(Phase.ANTHROPIC, "generate_prompt.start", data={
        "business": business_name,
        "desc_len": len(description),
    })

    system_instructions = """Eres un experto en diseño de agentes de voz IA para negocios.

A partir de la descripción de un negocio, generas UN prompt completo para un recepcionista virtual que contesta llamadas telefónicas.

El prompt que generes debe tener esta estructura:

## Personalidad
- Tono apropiado al negocio (cálido/formal/energético/etc.)
- Uso de "tú" o "usted" según industria
- 2-3 características clave

## Flujo de llamada
1-6 pasos numerados de qué hacer en una llamada típica.

## Reglas
- 3-5 reglas importantes para el agente (qué evitar, qué priorizar).

Responde SOLO con JSON válido (sin markdown, sin backticks):
{
  "begin_message": "saludo corto inicial que diga el agente al contestar (máx 25 palabras)",
  "general_prompt": "el prompt completo con las secciones arriba, en español"
}

El begin_message debe mencionar el nombre del negocio y del agente."""

    user_content = f"""Negocio: {business_name}
Ciudad: {city or "no especificada"}
Nombre del agente: {agent_name}

Descripción del negocio:
{description}

Genera el prompt del agente."""

    try:
        client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
        message = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=2000,
            system=system_instructions,
            messages=[{"role": "user", "content": user_content}],
        )
        raw = message.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
            if raw.endswith("```"):
                raw = raw[:-3]
            raw = raw.strip()

        data = json.loads(raw)
        log.info(Phase.ANTHROPIC, "generate_prompt.ok", data={
            "begin_len": len(data.get("begin_message", "")),
            "prompt_len": len(data.get("general_prompt", "")),
        })
        return {
            "status": "ok",
            "begin_message": data.get("begin_message", ""),
            "general_prompt": data.get("general_prompt", ""),
        }
    except json.JSONDecodeError as e:
        log.exception(Phase.ANTHROPIC, "generate_prompt.parse_fail", e)
        return {"status": "error", "message": f"Respuesta de Claude no parseable: {str(e)[:150]}"}
    except Exception as e:
        log.exception(Phase.ANTHROPIC, "generate_prompt.fail", e)
        return {"status": "error", "message": str(e)[:300]}


@web_app.post("/admin/onboarding")
def admin_onboarding(request: dict):
    """Create an agent from an industry template using user-provided data.

    Expected body:
      {
        "industry": "dental",
        "business_name": "Clínica Sonríe",
        "city": "Bogotá",
        "owner_name": "Juan",
        "owner_email": "juan@example.com",
        "owner_phone": "+573001234567",
        "agent_name": "Ana",               // optional, uses template default
        "begin_message_override": "...",   // optional
        "general_prompt_override": "..."   // optional
      }
    """
    from app.admin.retell_mgmt import create_agent_simple
    from app.industries import get_template, render_template
    import os

    industry = request.get("industry", "otro")
    template = get_template(industry)
    if not template:
        return {"status": "error", "message": f"Industria desconocida: {industry}"}

    business_name = (request.get("business_name") or "").strip()
    city = (request.get("city") or "").strip()
    owner_name = (request.get("owner_name") or "").strip()
    agent_name = (request.get("agent_name") or template["default_agent_name"]).strip()

    if not business_name:
        return {"status": "error", "message": "Falta business_name"}

    render_data = {
        "business_name": business_name,
        "city": city or "tu ciudad",
        "agent_name": agent_name,
        "owner_name": owner_name,
    }

    begin_message = request.get("begin_message_override") or render_template(
        template["begin_message_template"], render_data
    )
    general_prompt = request.get("general_prompt_override") or render_template(
        template["general_prompt_template"], render_data
    )

    modal_base = os.environ.get("MODAL_BASE_URL", "").rstrip("/")
    webhook_url = f"{modal_base}/retell-webhook" if modal_base else None

    log.info(Phase.SYSTEM, "onboarding.start", data={
        "industry": industry,
        "business": business_name,
        "agent_name": agent_name,
    })

    try:
        result = create_agent_simple(
            name=f"{agent_name} — {business_name}",
            voice_id=template["voice_id"],
            language=template["language"],
            begin_message=begin_message,
            general_prompt=general_prompt,
            temperature=float(request.get("temperature", 0.4)),
            webhook_url=webhook_url,
        )

        # Link agent to user (if email provided)
        owner_email = (request.get("owner_email") or "").strip().lower()
        if owner_email:
            try:
                from app.user_agents import link_user_to_agent
                link_user_to_agent(
                    email=owner_email,
                    agent_id=result["agent_id"],
                    llm_id=result["llm_id"],
                    industry=industry,
                    business_name=business_name,
                    city=city or "",
                    agent_name=agent_name,
                )
            except Exception as le:
                log.exception(Phase.SYSTEM, "onboarding.link_user.fail", le, data={"email": owner_email})

        log.info(Phase.SYSTEM, "onboarding.complete", data={
            "agent_id": result["agent_id"],
            "business": business_name,
            "industry": industry,
            "email": owner_email,
        })
        return {
            "status": "ok",
            "agent_id": result["agent_id"],
            "llm_id": result["llm_id"],
            "agent_name": agent_name,
            "business_name": business_name,
            "industry": industry,
            "begin_message": begin_message,
        }
    except Exception as e:
        log.exception(Phase.SYSTEM, "onboarding.fail", e, data=request)
        return {"status": "error", "message": str(e)}


@web_app.get("/diagnostics")
def diagnostics():
    """Run end-to-end checks against every service."""
    from app.diagnostics import run_all
    try:
        return run_all()
    except Exception as e:
        log.exception(Phase.SYSTEM, "diagnostics.crash", e)
        return {"error": str(e)}


@web_app.post("/twilio-direct-call")
def twilio_direct_call(request: dict):
    """Llamada de prueba usando SOLO Twilio (bypass de Retell).

    Usa Twilio TTS nativo para decir un mensaje. No usa Sofia.
    Sirve para probar que la telefonía funciona sin depender de Retell.
    """
    import os
    from twilio.rest import Client

    to = (request.get("phone") or "").strip()
    message = (request.get("message") or
               "Hola, esta es una llamada de prueba desde Sofía. "
               "Si estás escuchando esto, la telefonía está funcionando correctamente. "
               "Adiós.").strip()

    log.info(Phase.HTTP_IN, "twilio_direct_call.start", data={"to": to, "msg_len": len(message)})

    if not to:
        return {"status": "error", "message": "Falta campo 'phone'"}

    twiml = (
        f'<Response>'
        f'<Say voice="Polly.Lucia" language="es-MX">{message}</Say>'
        f'<Pause length="1"/>'
        f'<Say voice="Polly.Lucia" language="es-MX">Llamada de prueba finalizada.</Say>'
        f'</Response>'
    )

    try:
        log.info(Phase.CALL_TWILIO_ROUTE, "twilio.api.start", data={"to": to})
        client = Client(os.environ["TWILIO_ACCOUNT_SID"], os.environ["TWILIO_AUTH_TOKEN"])
        call = client.calls.create(
            to=to,
            from_=os.environ["TWILIO_PHONE_NUMBER"],
            twiml=twiml,
        )
        log.info(Phase.CALL_RINGING, "twilio.call.created", data={"call_sid": call.sid, "status": call.status, "to": to})
        return {
            "status": "ok",
            "call_sid": call.sid,
            "call_status": call.status,
            "from": os.environ["TWILIO_PHONE_NUMBER"],
            "to": to,
        }
    except Exception as e:
        log.exception(Phase.CALL_TWILIO_ROUTE, "twilio.call.fail", e, data={"to": to})
        return {"status": "error", "stage": "twilio", "message": str(e)}


@web_app.get("/twilio-call-status/{call_sid}")
def twilio_call_status(call_sid: str):
    """Get status of a Twilio call (queued/ringing/in-progress/completed/failed)."""
    import os
    from twilio.rest import Client
    try:
        client = Client(os.environ["TWILIO_ACCOUNT_SID"], os.environ["TWILIO_AUTH_TOKEN"])
        call = client.calls(call_sid).fetch()
        return {
            "status": "ok",
            "call_status": call.status,
            "duration": call.duration,
            "start_time": str(call.start_time) if call.start_time else None,
            "end_time": str(call.end_time) if call.end_time else None,
            "price": call.price,
        }
    except Exception as e:
        log.exception(Phase.SYSTEM, "twilio_call_status.fail", e, data={"call_sid": call_sid})
        return {"status": "error", "message": str(e)}


@web_app.post("/trigger-outbound")
def trigger_outbound():
    log.info(Phase.HTTP_IN, "trigger_outbound.start")
    try:
        from app.outbound_worker import run_outbound_cycle
        return run_outbound_cycle()
    except Exception as e:
        log.exception(Phase.HTTP_IN, "trigger_outbound.fail", e)
        return {"status": "error", "message": str(e)}


@web_app.post("/test-outbound-call")
def test_outbound_call(request: dict):
    """Llamada de prueba directa con tracking de fase completo.

    Fases:
      01 validate  — validar payload
      02 notion_lead — crear lead en Notion
      03 retell_dial — pedir a Retell que dispare la llamada
      04 twilio_route — (implícito en Retell, se marca al recibir call_id)
    Webhooks luego actualizan:
      05 ringing, 06 answered, 07 in_progress, 08 ended, 09 analyzed
    """
    from app.services import notion_service, retell_service

    name = (request.get("name") or "").strip()
    phone = (request.get("phone") or "").strip()
    interest = (request.get("interest") or "").strip()

    log.info(Phase.CALL_VALIDATE, "test_call.start", data={"name": name, "phone": phone, "interest_len": len(interest)})

    if not name or not phone:
        log.warn(Phase.CALL_VALIDATE, "test_call.invalid", data={"reason": "missing name or phone"})
        return {"status": "error", "stage": "validate", "message": "Faltan campos: name y phone son requeridos."}

    # 02 — Crear lead en Notion
    log.info(Phase.CALL_LEAD_CREATE, "notion.create_lead.start", data={"name": name, "phone": phone})
    try:
        lead = notion_service.create_lead(
            name=name,
            phone=phone,
            fuente="Llamada saliente",
            notas=interest or "Llamada de prueba desde dashboard",
        )
        log.info(Phase.CALL_LEAD_CREATE, "notion.create_lead.ok", data={"lead_id": lead["id"]})
    except Exception as e:
        log.exception(Phase.CALL_LEAD_CREATE, "notion.create_lead.fail", e, data={"name": name, "phone": phone})
        return {"status": "error", "stage": "notion", "message": str(e)}

    # 03 — Disparar llamada via Retell
    log.info(Phase.CALL_RETELL_DIAL, "retell.create_phone_call.start", data={"to": phone})
    try:
        call = retell_service.create_outbound_call(
            to_number=phone,
            lead_name=name,
            notas=interest or "Primer contacto — sin detalles previos",
        )
        call_id = call["call_id"]
        log.info(Phase.CALL_RETELL_DIAL, "retell.create_phone_call.ok", call_id=call_id, data={"status": call["status"]})

        # Initialize call state for dashboard polling
        call_state.init_call(call_id, meta={"to": phone, "name": name, "lead_id": lead["id"]})
        # Mark that Twilio routing is now in play (Retell hands it to Twilio at this point)
        call_state.set_phase(call_id, Phase.CALL_TWILIO_ROUTE, note="Retell accepted, Twilio routing")
        log.info(Phase.CALL_TWILIO_ROUTE, "twilio.routing.start", call_id=call_id, data={"from": "twilio", "to": phone})

    except Exception as e:
        log.exception(Phase.CALL_RETELL_DIAL, "retell.create_phone_call.fail", e, data={"to": phone, "lead_id": lead["id"]})
        return {
            "status": "error",
            "stage": "retell",
            "message": str(e),
            "lead_id": lead["id"],
        }

    return {
        "status": "ok",
        "lead_id": lead["id"],
        "call_id": call_id,
        "call_status": call["status"],
    }


# ── Modal bindings ──────────────────────────────────────────────────────────


@modal_app.function(
    image=image,
    secrets=[sofia_secret],
    volumes={"/logs": log_volume},
)
@modal.asgi_app()
def api():
    log.info(Phase.SYSTEM, "api.boot", data={"version": "0.3.0"})
    return web_app


@modal_app.function(
    image=image,
    secrets=[sofia_secret],
    volumes={"/logs": log_volume},
    schedule=modal.Cron("0 * * * *"),
    timeout=600,
)
def outbound_cron():
    """Cron job: revisa leads pendientes y les llama cada hora."""
    from app.outbound_worker import run_outbound_cycle
    log.info(Phase.SYSTEM, "outbound_cron.start")
    try:
        result = run_outbound_cycle()
        log.info(Phase.SYSTEM, "outbound_cron.done", data=result)
        return result
    except Exception as e:
        log.exception(Phase.SYSTEM, "outbound_cron.fail", e)
        raise
