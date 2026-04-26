"""Integrations + webhooks module.

Two layers:
  1. INTEGRATIONS_CATALOG — static list of supported integrations (UI cards).
  2. webhooks — dynamic CRUD persisted in Modal Dict, fired on call events.
"""

from __future__ import annotations

import secrets
import time
from datetime import datetime, timezone

import modal
import requests

from app.logger import Phase, log

_webhooks_dict = modal.Dict.from_name("sofia-webhooks", create_if_missing=True)


# ── Catalog (static metadata) ───────────────────────────────────────────────
# Order matches the dashboard /integraciones grid.
# Webhook saliente (custom) is added by the frontend as a featured card.

INTEGRATIONS_CATALOG = [
    {
        "key": "google-calendar",
        "name": "Google Calendar",
        "icon": "📅",
        "category": "Citas",
        "description": "Agenda automática de citas",
        "status": "soon",
        "setup_kind": "oauth",
    },
    {
        "key": "whatsapp",
        "name": "WhatsApp",
        "icon": "💬",
        "category": "Mensajería",
        "description": "Mensajes vía WhatsApp Business",
        "status": "soon",
        "setup_kind": "native",
    },
    {
        "key": "hubspot",
        "name": "HubSpot",
        "icon": "🟧",
        "category": "CRM",
        "description": "Sincroniza leads y contactos",
        "status": "soon",
        "setup_kind": "oauth",
    },
    {
        "key": "pipedrive",
        "name": "Pipedrive",
        "icon": "🟩",
        "category": "CRM",
        "description": "CRM de ventas",
        "status": "soon",
        "setup_kind": "oauth",
    },
    {
        "key": "salesforce",
        "name": "Salesforce",
        "icon": "☁️",
        "category": "CRM",
        "description": "CRM empresarial",
        "status": "soon",
        "setup_kind": "oauth",
    },
    {
        "key": "zoho",
        "name": "Zoho CRM",
        "icon": "🔷",
        "category": "CRM",
        "description": "CRM todo en uno",
        "status": "soon",
        "setup_kind": "oauth",
    },
    {
        "key": "zapier",
        "name": "Zapier",
        "icon": "⚡",
        "category": "Automatización",
        "description": "5,000+ apps conectadas",
        "status": "soon",
        "setup_kind": "webhook",
    },
    {
        "key": "make",
        "name": "Make",
        "icon": "🟪",
        "category": "Automatización",
        "description": "Automatización visual",
        "status": "soon",
        "setup_kind": "webhook",
    },
]


VALID_EVENTS = {
    "call.started",
    "call.ended",
    "call.analyzed",
    "lead.created",
    "lead.hot",
    "appointment.scheduled",
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# ── Webhooks CRUD ────────────────────────────────────────────────────────────


def list_webhooks() -> list[dict]:
    items: list[dict] = []
    try:
        for _, w in _webhooks_dict.items():
            if isinstance(w, dict):
                items.append(w)
    except Exception:
        return []
    items.sort(key=lambda w: w.get("created_at", ""), reverse=True)
    return items


def create_webhook(
    name: str,
    url: str,
    events: list[str],
    integration: str = "custom",
    enabled: bool = True,
) -> dict:
    if not url.startswith(("http://", "https://")):
        raise ValueError("La URL del webhook debe empezar con http:// o https://")
    invalid = [e for e in events if e not in VALID_EVENTS]
    if invalid:
        raise ValueError(f"Eventos inválidos: {invalid}. Permitidos: {sorted(VALID_EVENTS)}")

    wid = secrets.token_urlsafe(8)
    w = {
        "id": wid,
        "name": name.strip() or "Webhook",
        "url": url.strip(),
        "events": events,
        "integration": integration,
        "enabled": enabled,
        "secret": secrets.token_urlsafe(24),
        "created_at": _now_iso(),
        "last_fired_at": None,
        "last_status": None,
        "fire_count": 0,
    }
    _webhooks_dict[wid] = w
    log.info(Phase.SYSTEM, "webhooks.created", data={"id": wid, "url": url, "events": events})
    return w


def update_webhook(webhook_id: str, patch: dict) -> dict:
    w = _webhooks_dict.get(webhook_id)
    if not w:
        raise ValueError(f"Webhook no encontrado: {webhook_id}")
    for k in ("name", "url", "events", "enabled"):
        if k in patch and patch[k] is not None:
            w[k] = patch[k]
    _webhooks_dict[webhook_id] = w
    return w


def delete_webhook(webhook_id: str) -> None:
    if webhook_id in _webhooks_dict:
        del _webhooks_dict[webhook_id]
        log.info(Phase.SYSTEM, "webhooks.deleted", data={"id": webhook_id})


def test_webhook(webhook_id: str) -> dict:
    w = _webhooks_dict.get(webhook_id)
    if not w:
        raise ValueError(f"Webhook no encontrado: {webhook_id}")

    payload = {
        "event": "test",
        "timestamp": _now_iso(),
        "data": {"message": "This is a test event from Sofia."},
    }
    started = time.monotonic()
    try:
        r = requests.post(
            w["url"],
            json=payload,
            headers={
                "User-Agent": "Sofia-Webhook/1.0",
                "X-Sofia-Event": "test",
                "X-Sofia-Signature": w.get("secret", ""),
            },
            timeout=8,
        )
        elapsed_ms = int((time.monotonic() - started) * 1000)
        w["last_fired_at"] = _now_iso()
        w["last_status"] = r.status_code
        w["fire_count"] = w.get("fire_count", 0) + 1
        _webhooks_dict[webhook_id] = w
        return {
            "ok": r.ok,
            "status_code": r.status_code,
            "elapsed_ms": elapsed_ms,
            "response_preview": r.text[:200],
        }
    except Exception as e:
        elapsed_ms = int((time.monotonic() - started) * 1000)
        return {
            "ok": False,
            "error": str(e)[:200],
            "elapsed_ms": elapsed_ms,
        }
