"""End-to-end diagnostics for every external service Sofia depends on.

Each check returns: {service, ok, latency_ms, detail, error?}
"""

from __future__ import annotations

import os
import time

import requests

from app.logger import Phase, log


def _elapsed(start: float) -> int:
    return int((time.monotonic() - start) * 1000)


def _check(service: str, fn) -> dict:
    start = time.monotonic()
    try:
        detail = fn()
        ms = _elapsed(start)
        log.info(Phase.SYSTEM, f"diag.{service}.ok", data={"latency_ms": ms, "detail": detail})
        return {"service": service, "ok": True, "latency_ms": ms, "detail": detail}
    except Exception as e:
        ms = _elapsed(start)
        log.exception(Phase.SYSTEM, f"diag.{service}.fail", e, data={"latency_ms": ms})
        return {
            "service": service,
            "ok": False,
            "latency_ms": ms,
            "detail": None,
            "error": {"type": type(e).__name__, "message": str(e)[:400]},
        }


# ── Per-service checks ──────────────────────────────────────────────────────


def _check_modal_secret() -> dict:
    required = [
        "RETELL_API_KEY",
        "RETELL_INBOUND_AGENT_ID",
        "RETELL_OUTBOUND_AGENT_ID",
        "TWILIO_ACCOUNT_SID",
        "TWILIO_AUTH_TOKEN",
        "TWILIO_PHONE_NUMBER",
        "NOTION_API_KEY",
        "NOTION_LEADS_DB_ID",
        "NOTION_PROPIEDADES_DB_ID",
        "NOTION_LLAMADAS_DB_ID",
        "CAL_API_KEY",
        "ANTHROPIC_API_KEY",
    ]
    missing = [k for k in required if not os.environ.get(k)]
    if missing:
        raise RuntimeError(f"Missing env vars: {missing}")
    return {"vars_configured": len(required)}


def _check_notion() -> dict:
    """Query the Leads DB — simplest DB query."""
    db_id = os.environ["NOTION_LEADS_DB_ID"]
    r = requests.post(
        f"https://api.notion.com/v1/databases/{db_id}/query",
        headers={
            "Authorization": f"Bearer {os.environ['NOTION_API_KEY']}",
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
        },
        json={"page_size": 1},
        timeout=10,
    )
    r.raise_for_status()
    data = r.json()
    return {"leads_in_db": len(data.get("results", []))}


def _check_retell_agents() -> dict:
    """List agents — works without verification."""
    r = requests.get(
        "https://api.retellai.com/list-agents",
        headers={"Authorization": f"Bearer {os.environ['RETELL_API_KEY']}"},
        timeout=10,
    )
    r.raise_for_status()
    agents = r.json()
    mine = [a for a in agents if a.get("agent_id") in (
        os.environ.get("RETELL_INBOUND_AGENT_ID"),
        os.environ.get("RETELL_OUTBOUND_AGENT_ID"),
    )]
    return {"total_agents": len(agents), "sofia_agents_found": len(mine)}


def _check_retell_can_call() -> dict:
    """Test the critical endpoint: can we actually create a call?
    Uses a dummy number in a dry run-like way."""
    r = requests.post(
        "https://api.retellai.com/v2/create-web-call",
        headers={
            "Authorization": f"Bearer {os.environ['RETELL_API_KEY']}",
            "Content-Type": "application/json",
        },
        json={"agent_id": os.environ["RETELL_INBOUND_AGENT_ID"]},
        timeout=10,
    )
    if r.status_code == 201 or r.status_code == 200:
        body = r.json()
        call_id = body.get("call_id")
        # immediately cleanup test web call
        if call_id:
            try:
                requests.delete(
                    f"https://api.retellai.com/v2/delete-call/{call_id}",
                    headers={"Authorization": f"Bearer {os.environ['RETELL_API_KEY']}"},
                    timeout=5,
                )
            except Exception:
                pass
        return {"can_call": True, "http_status": r.status_code}
    # Surface the exact error reason
    raise RuntimeError(f"HTTP {r.status_code} — {r.text[:300]}")


def _check_twilio_balance() -> dict:
    sid = os.environ["TWILIO_ACCOUNT_SID"]
    tok = os.environ["TWILIO_AUTH_TOKEN"]
    r = requests.get(
        f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Balance.json",
        auth=(sid, tok),
        timeout=10,
    )
    r.raise_for_status()
    j = r.json()
    return {"balance": f"{j.get('balance', '?')} {j.get('currency', '')}"}


def _check_twilio_number() -> dict:
    sid = os.environ["TWILIO_ACCOUNT_SID"]
    tok = os.environ["TWILIO_AUTH_TOKEN"]
    phone = os.environ["TWILIO_PHONE_NUMBER"]
    r = requests.get(
        f"https://api.twilio.com/2010-04-01/Accounts/{sid}/IncomingPhoneNumbers.json",
        auth=(sid, tok),
        timeout=10,
    )
    r.raise_for_status()
    nums = r.json().get("incoming_phone_numbers", [])
    match = [n for n in nums if n.get("phone_number") == phone]
    if not match:
        raise RuntimeError(f"Phone number {phone} not found in Twilio account")
    n = match[0]
    return {
        "phone": phone,
        "voice": n.get("capabilities", {}).get("voice"),
        "sms": n.get("capabilities", {}).get("sms"),
    }


def _check_twilio_geo_colombia() -> dict:
    sid = os.environ["TWILIO_ACCOUNT_SID"]
    tok = os.environ["TWILIO_AUTH_TOKEN"]
    r = requests.get(
        "https://voice.twilio.com/v1/DialingPermissions/Countries/CO",
        auth=(sid, tok),
        timeout=10,
    )
    r.raise_for_status()
    j = r.json()
    if not j.get("low_risk_numbers_enabled"):
        raise RuntimeError("Colombia (CO) is NOT enabled in Twilio Geo Permissions")
    return {"colombia_enabled": True}


def _check_anthropic() -> dict:
    r = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": os.environ["ANTHROPIC_API_KEY"],
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        },
        json={
            "model": "claude-haiku-4-5",
            "max_tokens": 10,
            "messages": [{"role": "user", "content": "Say OK"}],
        },
        timeout=15,
    )
    if not r.ok:
        try:
            err = r.json().get("error", {})
            msg = err.get("message", r.text[:200])
        except Exception:
            msg = r.text[:200]
        raise RuntimeError(f"HTTP {r.status_code}: {msg}")
    j = r.json()
    text = "".join(b.get("text", "") for b in j.get("content", []) if b.get("type") == "text")
    return {"model": j.get("model"), "reply": text.strip()[:30]}


def _check_calcom() -> dict:
    r = requests.get(
        "https://api.cal.com/v2/event-types",
        headers={
            "Authorization": f"Bearer {os.environ['CAL_API_KEY']}",
            "cal-api-version": "2024-06-14",
        },
        timeout=10,
    )
    if r.status_code in (200, 201):
        j = r.json()
        types = j.get("data", j.get("event_types", []))
        return {"event_types_count": len(types) if isinstance(types, list) else 0}
    # Fallback to v1
    r = requests.get(
        f"https://api.cal.com/v1/event-types?apiKey={os.environ['CAL_API_KEY']}",
        timeout=10,
    )
    r.raise_for_status()
    return {"api_version": "v1", "event_types_count": len(r.json().get("event_types", []))}


# ── Public entrypoint ───────────────────────────────────────────────────────


def run_all() -> dict:
    log.info(Phase.SYSTEM, "diagnostics.start")
    checks = [
        ("env.modal_secret", _check_modal_secret),
        ("notion", _check_notion),
        ("retell.agents", _check_retell_agents),
        ("retell.can_call", _check_retell_can_call),
        ("twilio.balance", _check_twilio_balance),
        ("twilio.number", _check_twilio_number),
        ("twilio.geo_colombia", _check_twilio_geo_colombia),
        ("anthropic", _check_anthropic),
        ("calcom", _check_calcom),
    ]
    results = [_check(name, fn) for name, fn in checks]
    ok_count = sum(1 for r in results if r["ok"])
    summary = {
        "total": len(results),
        "passed": ok_count,
        "failed": len(results) - ok_count,
        "results": results,
    }
    log.info(Phase.SYSTEM, "diagnostics.complete", data={"passed": ok_count, "failed": summary["failed"]})
    return summary
