"""Team module: list/add/remove team members.

Persists in Modal Dict. Each member has:
  { id, name, email, role, status, created_at, invited_by }
"""

from __future__ import annotations

import secrets
import time
from datetime import datetime, timezone

import modal

from app.logger import Phase, log

_team_dict = modal.Dict.from_name("sofia-team", create_if_missing=True)

VALID_ROLES = {"owner", "admin", "editor", "viewer"}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def list_members() -> list[dict]:
    members: list[dict] = []
    try:
        for _, m in _team_dict.items():
            if isinstance(m, dict):
                members.append(m)
    except Exception:
        return []
    members.sort(key=lambda m: m.get("created_at", ""), reverse=True)
    return members


def add_member(name: str, email: str, role: str = "editor", invited_by: str = "") -> dict:
    role = role.lower().strip()
    if role not in VALID_ROLES:
        raise ValueError(f"Rol inválido: {role}. Debe ser uno de {VALID_ROLES}")

    email_norm = email.strip().lower()
    # Si ya existe, devolverlo (no duplicar)
    for _, m in _team_dict.items():
        if isinstance(m, dict) and m.get("email") == email_norm:
            raise ValueError(f"Ya existe un miembro con email {email_norm}")

    member_id = secrets.token_urlsafe(8)
    member = {
        "id": member_id,
        "name": name.strip(),
        "email": email_norm,
        "role": role,
        "status": "invited",  # invited | active
        "created_at": _now_iso(),
        "invited_by": invited_by,
    }
    _team_dict[member_id] = member
    log.info(Phase.SYSTEM, "team.member.added", data={"email": email_norm, "role": role})
    return member


def update_member(member_id: str, role: str | None = None, status: str | None = None) -> dict:
    member = _team_dict.get(member_id)
    if not member:
        raise ValueError(f"Miembro no encontrado: {member_id}")
    if role:
        if role.lower() not in VALID_ROLES:
            raise ValueError(f"Rol inválido: {role}")
        member["role"] = role.lower()
    if status:
        member["status"] = status
    _team_dict[member_id] = member
    log.info(Phase.SYSTEM, "team.member.updated", data={"id": member_id})
    return member


def remove_member(member_id: str) -> None:
    if member_id in _team_dict:
        member = _team_dict.get(member_id)
        if isinstance(member, dict) and member.get("role") == "owner":
            raise ValueError("No se puede eliminar al owner")
        del _team_dict[member_id]
        log.info(Phase.SYSTEM, "team.member.removed", data={"id": member_id})
