"""Outbound campaigns: persisted in Modal Dict, fired by /trigger-outbound.

A campaign is a list of leads + an agent + a scheduled time. The actual call
firing reuses the existing trigger-outbound infrastructure.
"""

from __future__ import annotations

import secrets
from datetime import datetime, timezone

import modal

from app.logger import Phase, log

_campaigns_dict = modal.Dict.from_name("sofia-campaigns", create_if_missing=True)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def list_campaigns() -> list[dict]:
    items: list[dict] = []
    try:
        for _, c in _campaigns_dict.items():
            if isinstance(c, dict):
                items.append(c)
    except Exception:
        return []
    items.sort(key=lambda c: c.get("created_at", ""), reverse=True)
    return items


def create_campaign(
    name: str,
    agent_id: str,
    leads: list[dict],
    scheduled_at: str | None = None,
    notes: str = "",
) -> dict:
    if not name.strip():
        raise ValueError("El nombre de la campaña es obligatorio")
    if not agent_id:
        raise ValueError("Selecciona un agente")
    if not leads:
        raise ValueError("Agrega al menos un lead")

    cid = secrets.token_urlsafe(8)
    c = {
        "id": cid,
        "name": name.strip(),
        "agent_id": agent_id,
        "leads": leads,
        "lead_count": len(leads),
        "scheduled_at": scheduled_at,
        "notes": notes.strip(),
        "status": "scheduled" if scheduled_at else "draft",
        "created_at": _now_iso(),
        "started_at": None,
        "completed_at": None,
        "calls_made": 0,
        "calls_succeeded": 0,
    }
    _campaigns_dict[cid] = c
    log.info(
        Phase.SYSTEM,
        "campaigns.created",
        data={"id": cid, "name": name, "lead_count": len(leads)},
    )
    return c


def update_campaign(campaign_id: str, patch: dict) -> dict:
    c = _campaigns_dict.get(campaign_id)
    if not c:
        raise ValueError(f"Campaña no encontrada: {campaign_id}")
    for k in ("name", "agent_id", "scheduled_at", "notes", "status"):
        if k in patch and patch[k] is not None:
            c[k] = patch[k]
    _campaigns_dict[campaign_id] = c
    return c


def delete_campaign(campaign_id: str) -> None:
    if campaign_id in _campaigns_dict:
        del _campaigns_dict[campaign_id]
        log.info(Phase.SYSTEM, "campaigns.deleted", data={"id": campaign_id})
