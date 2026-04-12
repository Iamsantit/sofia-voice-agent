def handle_twilio_event(request: dict) -> dict:
    """Procesa eventos de Twilio: SMS entrantes, status de llamadas."""
    message_body = request.get("Body", "")
    from_number = request.get("From", "")
    event_type = request.get("EventType", request.get("MessageStatus", "sms_incoming"))

    if message_body:
        return _on_sms_received(from_number, message_body)
    else:
        return _on_status_update(request, event_type)


def _on_sms_received(from_number: str, body: str) -> dict:
    print(f"[Sofia] SMS de {from_number}: {body}")
    # TODO: procesar mensaje, buscar lead en Notion, responder
    return {"status": "ok", "type": "sms_received"}


def _on_status_update(data: dict, event_type: str) -> dict:
    print(f"[Sofia] Twilio status update: {event_type}")
    return {"status": "ok", "type": event_type}
