"""Per-call state tracker using a Modal Dict for cross-container persistence.

Stores the current phase of each outbound call so the dashboard can show
a live progress indicator while Sofia is dialing / talking / hanging up.

State shape per call_id:
    {
        "call_id": "...",
        "current_phase": "call.05_ringing",
        "history": [
            {"ts": "...", "phase": "call.03_retell_dial", "note": "..."},
            ...
        ],
        "meta": {"to": "...", "from": "...", "lead_id": "..."},
        "result": {"status": "ok" | "error", "message": "..."} (optional),
    }
"""

from __future__ import annotations

from datetime import datetime, timezone

import modal

# Persistent dict shared across all Modal containers / invocations
call_state_dict = modal.Dict.from_name("sofia-call-state", create_if_missing=True)


def _ts() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def init_call(call_id: str, meta: dict | None = None) -> None:
    call_state_dict[call_id] = {
        "call_id": call_id,
        "current_phase": "call.03_retell_dial",
        "history": [{"ts": _ts(), "phase": "call.03_retell_dial", "note": "Call created"}],
        "meta": meta or {},
        "result": None,
    }


def set_phase(call_id: str, phase: str, note: str = "") -> None:
    if not call_id:
        return
    state = call_state_dict.get(call_id, {
        "call_id": call_id,
        "current_phase": phase,
        "history": [],
        "meta": {},
        "result": None,
    })
    state["current_phase"] = phase
    state["history"] = state.get("history", []) + [
        {"ts": _ts(), "phase": phase, "note": note}
    ]
    call_state_dict[call_id] = state


def set_result(call_id: str, status: str, message: str = "") -> None:
    if not call_id:
        return
    state = call_state_dict.get(call_id)
    if not state:
        return
    state["result"] = {"status": status, "message": message}
    call_state_dict[call_id] = state


def get_state(call_id: str) -> dict | None:
    return call_state_dict.get(call_id)


def list_recent(limit: int = 20) -> list[dict]:
    """Return most recent call states (unordered — Modal Dict doesn't keep order).

    For a small dict this is fine; for large ones we'd use a separate index.
    """
    items: list[dict] = []
    try:
        for _, state in call_state_dict.items():
            if isinstance(state, dict):
                items.append(state)
    except Exception:
        return []

    # Sort by most recent history entry (best effort)
    def _last_ts(s: dict) -> str:
        hist = s.get("history") or []
        return hist[-1]["ts"] if hist else ""

    items.sort(key=_last_ts, reverse=True)
    return items[:limit]
