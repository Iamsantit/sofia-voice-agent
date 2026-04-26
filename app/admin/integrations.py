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


INTEGRATIONS_CATALOG = [
    {
        "key": "slack",
        "name": "Slack",
        "icon": "💬",
        "category": "Notificaciones",
        "description": "Recibe alertas en un canal cuando una llamada termina o un lead califica como Hot.",
        "status": "available",
        "setup_kind": "webhook",
        "setup_url": "https://api.slack.com/messaging/webhooks",
        "setup_steps": [
            "Abre api.slack.com/messaging/webhooks → 'Create your Slack app'",
            "Activa 'Incoming Webhooks' → 'Add New Webhook to Workspace'",
            "Elige el canal donde quieres recibir las alertas",
            "Copia el 'Webhook URL' (formato https://hooks.slack.com/services/...)",
            "Pégalo abajo y elige los eventos a notificar",
        ],
        "default_events": ["lead.hot", "appointment.scheduled"],
    },
    {
        "key": "discord",
        "name": "Discord",
        "icon": "🎮",
        "category": "Notificaciones",
        "description": "Notifica a tu servidor cuando hay nuevas llamadas o leads.",
        "status": "available",
        "setup_kind": "webhook",
        "setup_url": "https://support.discord.com/hc/en-us/articles/228383668",
        "setup_steps": [
            "En Discord, abre Server Settings → Integrations",
            "Click 'Webhooks' → 'New Webhook'",
            "Elige el canal y copia el 'Webhook URL'",
            "Pégalo abajo y elige los eventos a notificar",
        ],
        "default_events": ["call.ended", "lead.hot"],
    },
    {
        "key": "zapier",
        "name": "Zapier",
        "icon": "⚡",
        "category": "Automatización",
        "description": "Conecta Sofia con 6,000+ apps mediante webhooks de Zapier.",
        "status": "available",
        "setup_kind": "webhook",
        "setup_url": "https://zapier.com/apps/webhook/integrations",
        "setup_steps": [
            "En Zapier, crea un nuevo Zap",
            "Trigger: 'Webhooks by Zapier' → 'Catch Hook'",
            "Copia la URL personalizada que te da Zapier",
            "Pégala abajo y elige los eventos a enviar",
            "Configura las acciones que quieras en Zapier",
        ],
        "default_events": ["call.ended", "lead.created"],
    },
    {
        "key": "make",
        "name": "Make (Integromat)",
        "icon": "🛠️",
        "category": "Automatización",
        "description": "Diseña flows visuales que disparan en cada evento de Sofia.",
        "status": "available",
        "setup_kind": "webhook",
        "setup_url": "https://www.make.com/en/help/tools/webhooks",
        "setup_steps": [
            "En Make, crea un nuevo escenario",
            "Agrega el módulo 'Webhooks' → 'Custom webhook'",
            "Copia la URL que te da Make",
            "Pégala abajo y elige los eventos",
        ],
        "default_events": ["call.ended", "lead.created"],
    },
    {
        "key": "hubspot",
        "name": "HubSpot",
        "icon": "🧲",
        "category": "CRM",
        "description": "Sincroniza leads y llamadas directo a tu pipeline de HubSpot vía Workflows.",
        "status": "available",
        "setup_kind": "webhook",
        "setup_url": "https://knowledge.hubspot.com/workflows/use-webhooks-with-workflows",
        "setup_steps": [
            "En HubSpot ve a Automation → Workflows → Create workflow",
            "Trigger: 'When a webhook is received' (o desde un contact filter)",
            "Como acción agrega 'Webhooks' → recibirás un endpoint URL",
            "Si quieres flujo inverso: pega abajo la URL de tu workflow Webhook trigger",
            "Sofia disparará el webhook con el lead/llamada en el body",
        ],
        "default_events": ["lead.created", "lead.hot", "call.ended"],
    },
    {
        "key": "salesforce",
        "name": "Salesforce",
        "icon": "☁️",
        "category": "CRM",
        "description": "Crea contactos y tasks en tu org via Flow Builder + Inbound Webhook.",
        "status": "available",
        "setup_kind": "webhook",
        "setup_url": "https://help.salesforce.com/s/articleView?id=sf.flow_concepts_trigger_platformevent.htm",
        "setup_steps": [
            "En Salesforce Setup → Flows → New Flow → Platform Event-Triggered Flow",
            "O usa AppExchange 'Webhook' apps (gratis) que generan endpoints",
            "Copia la URL del trigger HTTP",
            "Pégala abajo, mapea los campos del payload (lead, call) a tu objeto",
        ],
        "default_events": ["lead.created", "lead.hot"],
    },
    {
        "key": "google-sheets",
        "name": "Google Sheets",
        "icon": "📊",
        "category": "Datos",
        "description": "Vuelca cada llamada a una hoja vía Apps Script (sin OAuth).",
        "status": "available",
        "setup_kind": "webhook",
        "setup_url": "https://developers.google.com/apps-script/guides/web",
        "setup_steps": [
            "Abre tu hoja → Extensiones → Apps Script",
            "Pega un script con función 'doPost(e)' que append a la hoja",
            "Deploy → New deployment → Type: Web app → Anyone (con tu acceso)",
            "Copia la URL Web App (formato https://script.google.com/macros/s/.../exec)",
            "Pégala abajo y elige los eventos",
        ],
        "default_events": ["call.ended", "lead.created"],
    },
    {
        "key": "calendly",
        "name": "Calendly",
        "icon": "🗓️",
        "category": "Citas",
        "description": "Recibe notificaciones cuando se agenda o cancela una cita en Calendly.",
        "status": "available",
        "setup_kind": "webhook",
        "setup_url": "https://developer.calendly.com/api-docs/ZG9jOjE0NTYwNDA0-webhook-subscriptions",
        "setup_steps": [
            "Para enviar EVENTOS de Voicely a Calendly: usa Zapier/Make como puente",
            "Para recibir EVENTOS de Calendly en Voicely: configura webhook en Calendly Settings",
            "Pega abajo la URL de Voicely (mira más arriba) que Calendly te pedirá",
            "Selecciona los eventos a notificar",
        ],
        "default_events": ["appointment.scheduled"],
    },
    {
        "key": "whatsapp",
        "name": "WhatsApp Business",
        "icon": "📱",
        "category": "Mensajería",
        "description": "Manda mensajes via Twilio WhatsApp Sandbox (cuenta ya conectada).",
        "status": "available",
        "setup_kind": "webhook",
        "setup_url": "https://www.twilio.com/docs/whatsapp/sandbox",
        "setup_steps": [
            "Tu cuenta Twilio ya está configurada para WhatsApp Sandbox",
            "Ve a Twilio Console → Messaging → Try it out → WhatsApp Sandbox",
            "Sigue 1 paso: envía 'join <código>' al +1 415 523 8886 desde tu WhatsApp",
            "Copia la URL del Sandbox y pégala abajo",
            "Sofia mandará un WhatsApp después de cada llamada Hot",
        ],
        "default_events": ["lead.hot", "appointment.scheduled"],
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
