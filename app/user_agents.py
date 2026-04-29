"""Per-user agent registry — links an authenticated email to its Retell agent.

Stored in Modal Dict `sofia-user-agents`. Key = email (lowercase), value = dict:
    {
        "email": str,
        "agent_id": str,
        "llm_id": str,
        "industry": str,
        "business_name": str,
        "city": str,
        "agent_name": str,
        "created_at": str (ISO timestamp),
    }
"""

from __future__ import annotations

from datetime import datetime, timezone

import modal

_user_agents = modal.Dict.from_name("sofia-user-agents", create_if_missing=True)


def _ts() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def link_user_to_agent(
    email: str,
    agent_id: str,
    llm_id: str,
    industry: str,
    business_name: str,
    city: str,
    agent_name: str,
) -> None:
    _user_agents[email.lower()] = {
        "email": email.lower(),
        "agent_id": agent_id,
        "llm_id": llm_id,
        "industry": industry,
        "business_name": business_name,
        "city": city,
        "agent_name": agent_name,
        "created_at": _ts(),
    }


def get_user_agent(email: str) -> dict | None:
    return _user_agents.get(email.lower())


def get_user_agent_by_agent_id(agent_id: str) -> dict | None:
    """Reverse lookup: given an agent_id, find the user it belongs to.
    Used by billing to attribute call minutes to the correct user."""
    if not agent_id:
        return None
    try:
        for _, link in _user_agents.items():
            if isinstance(link, dict) and link.get("agent_id") == agent_id:
                return link
    except Exception:
        return None
    return None


def unlink_user(email: str) -> None:
    try:
        del _user_agents[email.lower()]
    except Exception:
        pass
