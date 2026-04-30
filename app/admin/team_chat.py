"""Internal team chat — WhatsApp-style messaging between team members.

Each owner has ONE team thread. Members are everyone in
sofia-team where invited_by matches the owner OR the owner themselves.

Storage:
  sofia-team-chat   key=owner_email_lower  value=list[message_dict]

Message dict:
  {
    "id": str,
    "sender_email": str,
    "sender_name": str,
    "text": str,
    "ts": str (ISO UTC),
  }

Plan gating: only Plan.has_team_chat == True can send/read. Enforcement
is done at the endpoint level in main.py.
"""

from __future__ import annotations

import secrets
from datetime import datetime, timezone

import modal

from app.logger import Phase, log

_chat_dict = modal.Dict.from_name("sofia-team-chat", create_if_missing=True)

MAX_MESSAGES = 200
MAX_TEXT_LEN = 2000


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _team_id_for(owner_email: str) -> str:
    return owner_email.strip().lower()


def list_messages(owner_email: str, limit: int = 100) -> list[dict]:
    """Return up to `limit` most recent messages for the owner's team."""
    team_id = _team_id_for(owner_email)
    msgs = _chat_dict.get(team_id) or []
    if not isinstance(msgs, list):
        return []
    # Return tail (most recent) sorted ascending so the UI can append
    return msgs[-limit:]


def send_message(
    owner_email: str,
    sender_email: str,
    sender_name: str,
    text: str,
) -> dict:
    """Append a message to the owner's team thread."""
    text = (text or "").strip()
    if not text:
        raise ValueError("Mensaje vacío")
    if len(text) > MAX_TEXT_LEN:
        raise ValueError(f"Mensaje excede {MAX_TEXT_LEN} caracteres")

    team_id = _team_id_for(owner_email)
    msg = {
        "id": secrets.token_urlsafe(8),
        "sender_email": sender_email.strip().lower(),
        "sender_name": (sender_name or "").strip() or sender_email.split("@")[0],
        "text": text,
        "ts": _now_iso(),
    }

    msgs = _chat_dict.get(team_id) or []
    if not isinstance(msgs, list):
        msgs = []
    msgs.append(msg)
    # Trim history to MAX_MESSAGES
    if len(msgs) > MAX_MESSAGES:
        msgs = msgs[-MAX_MESSAGES:]
    _chat_dict[team_id] = msgs

    log.info(
        Phase.SYSTEM,
        "team_chat.message_sent",
        data={"team": team_id, "from": sender_email, "len": len(text)},
    )
    return msg


def resolve_owner_for(email: str) -> str:
    """Given a user email, find the owner email of the team they belong to.

    The owner is themselves IF they have an entry in user_agents (i.e.
    they signed up directly). Otherwise we look them up in sofia-team
    and return their inviter (which is stored as the inviter's name —
    we'd need a stronger link, but for now we fall back to the user
    being their own owner).
    """
    email = email.strip().lower()
    # Anyone with a user_agents record is treated as their own team owner
    try:
        from app.user_agents import get_user_agent
        link = get_user_agent(email)
        if link:
            return email
    except Exception:
        pass
    # Otherwise fall through to themselves (acceptable default)
    return email
