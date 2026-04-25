"""Retell admin operations: agents + phone numbers CRUD."""

from __future__ import annotations

import os

import requests

from app.logger import Phase, log

RETELL_BASE = "https://api.retellai.com"


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {os.environ['RETELL_API_KEY']}",
        "Content-Type": "application/json",
    }


def _req(method: str, path: str, json_body: dict | None = None) -> tuple[int, dict | list]:
    r = requests.request(method, f"{RETELL_BASE}{path}", headers=_headers(), json=json_body, timeout=20)
    try:
        return r.status_code, r.json() if r.content else {}
    except Exception:
        return r.status_code, {"_raw": r.text[:500]}


# ── Agents ──────────────────────────────────────────────────────────────────


def list_agents() -> list[dict]:
    code, data = _req("GET", "/list-agents")
    if code != 200 or not isinstance(data, list):
        log.warn(Phase.RETELL, "list_agents.unexpected", data={"code": code})
        return []
    # Return simplified view
    return [
        {
            "agent_id": a.get("agent_id"),
            "name": a.get("agent_name"),
            "voice_id": a.get("voice_id"),
            "language": a.get("language"),
            "llm_id": (a.get("response_engine") or {}).get("llm_id"),
            "webhook_url": a.get("webhook_url"),
            "last_modification": a.get("last_modification_timestamp"),
        }
        for a in data
    ]


def get_agent(agent_id: str) -> dict:
    code, data = _req("GET", f"/get-agent/{agent_id}")
    if code != 200:
        raise RuntimeError(f"Retell get_agent HTTP {code}: {data}")
    return data


def delete_agent(agent_id: str) -> None:
    code, _ = _req("DELETE", f"/delete-agent/{agent_id}")
    if code not in (200, 204):
        raise RuntimeError(f"Retell delete_agent HTTP {code}")


def get_llm(llm_id: str) -> dict:
    code, data = _req("GET", f"/get-retell-llm/{llm_id}")
    if code != 200:
        raise RuntimeError(f"Retell get_llm HTTP {code}: {data}")
    return data


def update_llm(llm_id: str, patch: dict) -> dict:
    code, data = _req("PATCH", f"/update-retell-llm/{llm_id}", patch)
    if code != 200:
        raise RuntimeError(f"Retell update_llm HTTP {code}: {data}")
    return data


def update_agent(agent_id: str, patch: dict) -> dict:
    code, data = _req("PATCH", f"/update-agent/{agent_id}", patch)
    if code != 200:
        raise RuntimeError(f"Retell update_agent HTTP {code}: {data}")
    return data


def create_agent_simple(
    name: str,
    model: str = "claude-4.5-sonnet",
    voice_id: str = "cartesia-Sofia",
    language: str = "es-419",
    begin_message: str = "Hola, ¿en qué puedo ayudarle?",
    general_prompt: str = "Eres un asistente profesional.",
    temperature: float = 0.4,
    webhook_url: str | None = None,
    timezone: str = "America/Mexico_City",
) -> dict:
    """Create an agent end-to-end: LLM + Agent in two API calls."""
    llm_code, llm = _req("POST", "/create-retell-llm", {
        "model": model,
        "begin_message": begin_message,
        "general_prompt": general_prompt,
        "model_temperature": temperature,
    })
    if llm_code not in (200, 201):
        raise RuntimeError(f"create_retell_llm HTTP {llm_code}: {llm}")

    llm_id = llm["llm_id"]
    log.info(Phase.RETELL, "admin.llm.created", data={"llm_id": llm_id})

    agent_body = {
        "agent_name": name,
        "voice_id": voice_id,
        "language": language,
        "response_engine": {"type": "retell-llm", "llm_id": llm_id},
        "timezone": timezone,
        "enable_backchannel": True,
        "responsiveness": 0.8,
        "interruption_sensitivity": 0.7,
    }
    if webhook_url:
        agent_body["webhook_url"] = webhook_url
        agent_body["webhook_events"] = ["call_started", "call_ended", "call_analyzed"]

    ag_code, agent = _req("POST", "/create-agent", agent_body)
    if ag_code not in (200, 201):
        # Rollback LLM
        try:
            _req("DELETE", f"/delete-retell-llm/{llm_id}")
        except Exception:
            pass
        raise RuntimeError(f"create_agent HTTP {ag_code}: {agent}")

    log.info(Phase.RETELL, "admin.agent.created", data={"agent_id": agent.get("agent_id")})
    return {
        "agent_id": agent.get("agent_id"),
        "llm_id": llm_id,
        "agent_name": agent.get("agent_name"),
    }


# ── Phone Numbers ───────────────────────────────────────────────────────────


def list_phone_numbers() -> list[dict]:
    code, data = _req("GET", "/list-phone-numbers")
    if code != 200 or not isinstance(data, list):
        return []
    return [
        {
            "phone_number": p.get("phone_number"),
            "nickname": p.get("nickname"),
            "inbound_agent_id": p.get("inbound_agent_id"),
            "outbound_agent_id": p.get("outbound_agent_id"),
            "termination_uri": (p.get("sip_outbound_trunk_config") or {}).get("termination_uri"),
            "creation_timestamp": p.get("creation_timestamp"),
        }
        for p in data
    ]


def import_phone_number(
    phone_number: str,
    termination_uri: str,
    inbound_agent_id: str | None = None,
    outbound_agent_id: str | None = None,
    nickname: str = "",
) -> dict:
    body: dict = {
        "phone_number": phone_number,
        "termination_uri": termination_uri,
        "nickname": nickname,
    }
    if inbound_agent_id:
        body["inbound_agent_id"] = inbound_agent_id
    if outbound_agent_id:
        body["outbound_agent_id"] = outbound_agent_id
    code, data = _req("POST", "/import-phone-number", body)
    if code not in (200, 201):
        raise RuntimeError(f"import_phone_number HTTP {code}: {data}")
    log.info(Phase.RETELL, "admin.number.imported", data={"phone": phone_number})
    return data


def update_phone_number(phone_number: str, patch: dict) -> dict:
    code, data = _req("PATCH", f"/update-phone-number/{phone_number}", patch)
    if code != 200:
        raise RuntimeError(f"update_phone_number HTTP {code}: {data}")
    log.info(Phase.RETELL, "admin.number.updated", data={"phone": phone_number, "fields": list(patch.keys())})
    return data


def delete_phone_number(phone_number: str) -> None:
    code, _ = _req("DELETE", f"/delete-phone-number/{phone_number}")
    if code not in (200, 204):
        raise RuntimeError(f"delete_phone_number HTTP {code}")
    log.info(Phase.RETELL, "admin.number.deleted", data={"phone": phone_number})


# ── Voices ──────────────────────────────────────────────────────────────────


def list_voices() -> list[dict]:
    """List available Retell voices (used for the 'create agent' form dropdown)."""
    code, data = _req("GET", "/list-voices")
    if code != 200 or not isinstance(data, list):
        return []
    return [
        {
            "voice_id": v.get("voice_id"),
            "voice_name": v.get("voice_name"),
            "provider": v.get("provider"),
            "gender": v.get("gender"),
            "accent": v.get("accent"),
            "preview_audio_url": v.get("preview_audio_url"),
            "is_custom": v.get("voice_type") == "custom",
        }
        for v in data
    ]


def create_custom_voice(voice_name: str, audio_url: str, audio_format: str = "wav") -> dict:
    """Create a custom voice (clone) from an audio sample.

    Retell expects an audio_url accessible from their backend.
    Audio: 30s-3min, single speaker, clean, mono preferred.
    """
    code, data = _req("POST", "/create-voice", {
        "voice_name": voice_name,
        "audio_url": audio_url,
        "audio_format": audio_format,
    })
    if code not in (200, 201):
        raise RuntimeError(f"create_voice HTTP {code}: {data}")
    return data


def delete_voice(voice_id: str) -> None:
    code, _ = _req("DELETE", f"/delete-voice/{voice_id}")
    if code not in (200, 204):
        raise RuntimeError(f"delete_voice HTTP {code}")
