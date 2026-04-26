"""WhatsApp integration via Twilio Sandbox.

User-facing flow: user pastes their WhatsApp number → Voicely sends a
welcome message via Twilio. If the number hasn't joined the Sandbox, the
welcome message fails and we surface the join code to the user.

Persists subscribers in a Modal Dict, with status tracking. When events
fire (lead.hot, appointment.scheduled), Voicely loops over subscribers
and sends them the message.
"""

from __future__ import annotations

import os
import secrets
from datetime import datetime, timezone

import modal
from twilio.base.exceptions import TwilioRestException
from twilio.rest import Client

from app.logger import Phase, log

_whatsapp_dict = modal.Dict.from_name("sofia-whatsapp", create_if_missing=True)

# Twilio's WhatsApp Sandbox public number (same for all accounts)
SANDBOX_NUMBER = "+14155238886"


def _client() -> Client:
    return Client(os.environ["TWILIO_ACCOUNT_SID"], os.environ["TWILIO_AUTH_TOKEN"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _normalize(phone: str) -> str:
    p = phone.strip()
    if not p.startswith("+"):
        p = "+" + p
    # Remove any spaces, dashes, parens
    return "+" + "".join(c for c in p[1:] if c.isdigit())


# ── Sandbox info ────────────────────────────────────────────────────────────


def get_sandbox_info() -> dict:
    """Get the current join code of the WhatsApp Sandbox.

    Twilio's API doesn't expose the join code directly via REST; it must be
    set in the Twilio Console. We surface a generic instruction and the
    sandbox phone number so users can paste it into their WhatsApp.
    """
    return {
        "sandbox_number": SANDBOX_NUMBER,
        "join_instruction": (
            "Desde tu WhatsApp envía un mensaje al "
            f"{SANDBOX_NUMBER} con el texto que encontrarás en tu Twilio Console "
            "→ Messaging → Try it out → WhatsApp Sandbox (algo como "
            "'join apple-banana')"
        ),
    }


# ── CRUD subscribers ─────────────────────────────────────────────────────────


def list_subscribers() -> list[dict]:
    items: list[dict] = []
    try:
        for _, s in _whatsapp_dict.items():
            if isinstance(s, dict):
                items.append(s)
    except Exception:
        return []
    items.sort(key=lambda s: s.get("created_at", ""), reverse=True)
    return items


def add_subscriber(phone_number: str, label: str = "") -> dict:
    """Add a number and immediately try to send a welcome message.

    If Twilio rejects with 63007 ('not a valid WhatsApp endpoint'), the
    number isn't in the sandbox yet — we save the subscriber as 'pending'
    and return the join instruction.
    """
    phone = _normalize(phone_number)

    # If already exists, return existing
    for sid, s in _whatsapp_dict.items():
        if isinstance(s, dict) and s.get("phone_number") == phone:
            return s

    sub_id = secrets.token_urlsafe(8)
    sub = {
        "id": sub_id,
        "phone_number": phone,
        "label": label.strip() or phone,
        "status": "pending",  # pending | active | failed
        "created_at": _now_iso(),
        "last_error": None,
    }

    # Attempt welcome message
    try:
        result = _send_message(phone, _welcome_text())
        sub["status"] = "active"
        sub["last_message_sid"] = result.get("sid")
        log.info(Phase.SYSTEM, "whatsapp.subscriber.activated", data={"phone": phone})
    except TwilioRestException as e:
        sub["last_error"] = f"{e.code}: {str(e)[:200]}"
        # Code 63007 = "not a valid WhatsApp endpoint" (not in sandbox)
        # Code 21608 = "channel not authorized" (also sandbox)
        if e.code in (63007, 21608, 63016):
            sub["status"] = "needs_join"
        else:
            sub["status"] = "failed"
        log.warn(
            Phase.SYSTEM,
            "whatsapp.subscriber.welcome_fail",
            data={"phone": phone, "code": e.code, "msg": str(e)[:200]},
        )
    except Exception as e:
        sub["status"] = "failed"
        sub["last_error"] = str(e)[:200]
        log.exception(Phase.SYSTEM, "whatsapp.subscriber.error", e, data={"phone": phone})

    _whatsapp_dict[sub_id] = sub
    return sub


def remove_subscriber(sub_id: str) -> None:
    if sub_id in _whatsapp_dict:
        del _whatsapp_dict[sub_id]
        log.info(Phase.SYSTEM, "whatsapp.subscriber.removed", data={"id": sub_id})


def retry_subscriber(sub_id: str) -> dict:
    """Retry sending the welcome message — useful after the user joins."""
    sub = _whatsapp_dict.get(sub_id)
    if not sub:
        raise ValueError(f"Subscriber not found: {sub_id}")
    try:
        result = _send_message(sub["phone_number"], _welcome_text())
        sub["status"] = "active"
        sub["last_message_sid"] = result.get("sid")
        sub["last_error"] = None
    except TwilioRestException as e:
        sub["last_error"] = f"{e.code}: {str(e)[:200]}"
        if e.code in (63007, 21608, 63016):
            sub["status"] = "needs_join"
        else:
            sub["status"] = "failed"
    _whatsapp_dict[sub_id] = sub
    return sub


# ── Send message (used by webhooks/events) ──────────────────────────────────


def _send_message(to_phone: str, body: str) -> dict:
    client = _client()
    msg = client.messages.create(
        from_=f"whatsapp:{SANDBOX_NUMBER}",
        to=f"whatsapp:{to_phone}",
        body=body,
    )
    return {"sid": msg.sid, "status": msg.status}


def send_to_all_active(body: str) -> dict:
    """Broadcast a message to all active subscribers.

    Returns counts of sent/failed.
    """
    sent = 0
    failed = 0
    for sub_id, sub in list(_whatsapp_dict.items()):
        if not isinstance(sub, dict) or sub.get("status") != "active":
            continue
        try:
            _send_message(sub["phone_number"], body)
            sent += 1
        except Exception as e:
            failed += 1
            sub["last_error"] = str(e)[:200]
            sub["status"] = "failed"
            _whatsapp_dict[sub_id] = sub
    log.info(Phase.SYSTEM, "whatsapp.broadcast", data={"sent": sent, "failed": failed})
    return {"sent": sent, "failed": failed}


def _welcome_text() -> str:
    return (
        "👋 ¡Hola! Te conectaste con Voicely.\n\n"
        "A partir de ahora vas a recibir aquí las alertas de tu agente IA "
        "(leads calientes, citas agendadas, llamadas importantes).\n\n"
        "Si quieres dejar de recibir mensajes, ve al panel de Voicely → "
        "Integraciones → WhatsApp."
    )
