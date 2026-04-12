"""Worker outbound: revisa leads pendientes y les dispara llamada con Sofia."""

import time

from app.services import notion_service, retell_service


def run_outbound_cycle() -> dict:
    """Ejecuta un ciclo completo del worker outbound.

    1. Consulta leads con estatus "Pendiente de llamar"
    2. Cambia su estatus a "En proceso" para evitar duplicados
    3. Dispara llamada outbound con datos personalizados
    4. Espera entre llamadas para no saturar
    """
    leads = notion_service.get_pending_leads()

    if not leads:
        print("[Outbound] No hay leads pendientes de llamar.")
        return {"status": "ok", "leads_found": 0, "calls_made": 0}

    print(f"[Outbound] Encontrados {len(leads)} leads pendientes.")

    calls_made = 0
    errors = []

    for i, lead in enumerate(leads):
        nombre = lead["nombre"]
        telefono = lead["telefono"]
        lead_id = lead["id"]

        if not telefono:
            print(f"[Outbound] {nombre}: sin teléfono, saltando.")
            continue

        # Cambiar estatus ANTES de llamar para no duplicar
        try:
            notion_service.update_lead(
                page_id=lead_id,
                estatus="En proceso",
                intentos=int(lead["intentos"]) + 1,
            )
        except Exception as e:
            print(f"[Outbound] Error actualizando {nombre}: {e}")
            errors.append({"lead": nombre, "error": str(e)})
            continue

        # Preparar variables dinámicas
        zonas = ", ".join(lead["zona_interes"]) if lead["zona_interes"] else "Ciudad de México"
        tipos = ", ".join(lead["tipo_buscado"]) if lead["tipo_buscado"] else "propiedad"
        presupuesto = f"${lead['presupuesto']:,.0f}" if lead["presupuesto"] else "no especificado"

        # Disparar llamada
        try:
            result = retell_service.create_outbound_call(
                to_number=telefono,
                lead_name=nombre,
                zona_interes=zonas,
                tipo_buscado=tipos,
                presupuesto=presupuesto,
                notas=lead["notas"] or "Lead nuevo, primer contacto outbound",
            )
            calls_made += 1
            print(f"[Outbound] Llamada {calls_made}: {nombre} ({telefono}) → call_id={result['call_id']}")
        except Exception as e:
            print(f"[Outbound] Error llamando a {nombre}: {e}")
            errors.append({"lead": nombre, "error": str(e)})
            # Revertir estatus si la llamada falló
            try:
                notion_service.update_lead(page_id=lead_id, estatus="Pendiente de llamar")
            except Exception:
                pass
            continue

        # Esperar 30 segundos entre llamadas para no saturar
        if i < len(leads) - 1:
            print(f"[Outbound] Esperando 30s antes de la siguiente llamada...")
            time.sleep(30)

    print(f"[Outbound] Ciclo completo: {calls_made}/{len(leads)} llamadas realizadas.")
    return {
        "status": "ok",
        "leads_found": len(leads),
        "calls_made": calls_made,
        "errors": errors,
    }
