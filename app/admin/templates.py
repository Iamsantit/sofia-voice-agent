"""Prompt templates library.

Stores user-saved prompts so they can be reused across agents.
Each template:
  { id, name, category, description, begin_message, general_prompt,
    created_at, updated_at, times_used }
"""

from __future__ import annotations

import secrets
from datetime import datetime, timezone

import modal

from app.logger import Phase, log

_templates_dict = modal.Dict.from_name("sofia-templates", create_if_missing=True)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def list_templates() -> list[dict]:
    items: list[dict] = []
    try:
        for _, t in _templates_dict.items():
            if isinstance(t, dict):
                items.append(t)
    except Exception:
        return []
    items.sort(key=lambda t: t.get("updated_at", t.get("created_at", "")), reverse=True)
    return items


def get_template(template_id: str) -> dict | None:
    return _templates_dict.get(template_id)


def create_template(
    name: str,
    category: str,
    description: str,
    begin_message: str,
    general_prompt: str,
) -> dict:
    if not name.strip() or not general_prompt.strip():
        raise ValueError("Nombre y prompt son requeridos")

    tid = secrets.token_urlsafe(8)
    now = _now_iso()
    t = {
        "id": tid,
        "name": name.strip(),
        "category": category.strip() or "Otros",
        "description": description.strip(),
        "begin_message": begin_message.strip(),
        "general_prompt": general_prompt.strip(),
        "created_at": now,
        "updated_at": now,
        "times_used": 0,
    }
    _templates_dict[tid] = t
    log.info(Phase.SYSTEM, "templates.created", data={"id": tid, "name": name})
    return t


def update_template(template_id: str, patch: dict) -> dict:
    t = _templates_dict.get(template_id)
    if not t:
        raise ValueError(f"Plantilla no encontrada: {template_id}")
    for k in ("name", "category", "description", "begin_message", "general_prompt"):
        if k in patch and patch[k] is not None:
            t[k] = patch[k]
    t["updated_at"] = _now_iso()
    _templates_dict[template_id] = t
    log.info(Phase.SYSTEM, "templates.updated", data={"id": template_id})
    return t


def delete_template(template_id: str) -> None:
    if template_id in _templates_dict:
        del _templates_dict[template_id]
        log.info(Phase.SYSTEM, "templates.deleted", data={"id": template_id})


def increment_usage(template_id: str) -> None:
    t = _templates_dict.get(template_id)
    if t:
        t["times_used"] = t.get("times_used", 0) + 1
        _templates_dict[template_id] = t
