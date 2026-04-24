"""Structured JSON logger for Sofia.

Writes every event as a JSON line to:
  1. stdout (captured by Modal's log UI)
  2. /logs/app.jsonl inside a Modal Volume (persistent across containers)

Fields:
  ts       ISO 8601 timestamp (UTC, millisecond precision)
  level    "info" | "warn" | "error"
  phase    Logical phase — see Phase class
  event    Short event name (e.g. "retell.create_phone_call.success")
  call_id  (optional) Retell call_id when available
  data     (optional) Any serializable context
  error    (only on exceptions) {type, message, traceback}

Usage:
    from app.logger import log, Phase

    log.info(Phase.RETELL_CALL, "create_phone_call.start",
             call_id=None, data={"to": phone})
    try:
        ...
    except Exception as e:
        log.exception(Phase.RETELL_CALL, "create_phone_call.fail", e,
                      data={"to": phone})
"""

from __future__ import annotations

import json
import os
import threading
import traceback
from datetime import datetime, timezone
from pathlib import Path

# In Modal, /logs is a mounted Volume. Locally, fall back to ./logs
_LOG_DIR = Path(os.environ.get("SOFIA_LOG_DIR", "/logs"))
_LOG_FILE = _LOG_DIR / "app.jsonl"
_FILE_LOCK = threading.Lock()


class Phase:
    # HTTP entrypoints
    HTTP_IN = "http.in"
    HTTP_OUT = "http.out"

    # External services
    NOTION = "svc.notion"
    RETELL = "svc.retell"
    TWILIO = "svc.twilio"
    CALCOM = "svc.calcom"
    ANTHROPIC = "svc.anthropic"

    # Call lifecycle (business-level phases the user cares about)
    CALL_VALIDATE = "call.01_validate"
    CALL_LEAD_CREATE = "call.02_notion_lead"
    CALL_RETELL_DIAL = "call.03_retell_dial"
    CALL_TWILIO_ROUTE = "call.04_twilio_route"
    CALL_RINGING = "call.05_ringing"
    CALL_ANSWERED = "call.06_answered"
    CALL_IN_PROGRESS = "call.07_in_progress"
    CALL_ENDED = "call.08_ended"
    CALL_ANALYZED = "call.09_analyzed"
    CALL_FAILED = "call.xx_failed"

    # Dashboard webhooks
    WEBHOOK_RETELL = "webhook.retell"
    WEBHOOK_TWILIO = "webhook.twilio"

    # Generic
    SYSTEM = "system"


def _ts() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def _sanitize(obj):
    """Make anything JSON-serializable."""
    if isinstance(obj, (str, int, float, bool)) or obj is None:
        return obj
    if isinstance(obj, dict):
        return {str(k): _sanitize(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_sanitize(x) for x in obj]
    return repr(obj)[:500]


def _write(entry: dict) -> None:
    line = json.dumps(entry, ensure_ascii=False)
    # stdout — Modal captures this
    print(line, flush=True)
    # Persistent file — best-effort (volume may not be mounted locally)
    try:
        _LOG_DIR.mkdir(parents=True, exist_ok=True)
        with _FILE_LOCK, _LOG_FILE.open("a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def _emit(level: str, phase: str, event: str, call_id: str | None, data: dict | None, error: dict | None) -> None:
    entry: dict = {
        "ts": _ts(),
        "level": level,
        "phase": phase,
        "event": event,
    }
    if call_id:
        entry["call_id"] = call_id
    if data:
        entry["data"] = _sanitize(data)
    if error:
        entry["error"] = error
    _write(entry)


class _Log:
    def info(self, phase: str, event: str, call_id: str | None = None, data: dict | None = None) -> None:
        _emit("info", phase, event, call_id, data, None)

    def warn(self, phase: str, event: str, call_id: str | None = None, data: dict | None = None) -> None:
        _emit("warn", phase, event, call_id, data, None)

    def error(self, phase: str, event: str, call_id: str | None = None, data: dict | None = None, message: str = "") -> None:
        err = {"type": "Error", "message": message} if message else None
        _emit("error", phase, event, call_id, data, err)

    def exception(self, phase: str, event: str, exc: BaseException, call_id: str | None = None, data: dict | None = None) -> None:
        err = {
            "type": type(exc).__name__,
            "message": str(exc),
            "traceback": traceback.format_exc(),
        }
        _emit("error", phase, event, call_id, data, err)


log = _Log()


# ── Log reading helpers (used by /logs endpoint) ─────────────────────────────

def read_recent(limit: int = 200, level: str | None = None, call_id: str | None = None, phase_prefix: str | None = None) -> list[dict]:
    """Read the most recent log entries with optional filters.

    Reads the tail of the JSONL file and returns parsed entries, newest first.
    """
    if not _LOG_FILE.exists():
        return []

    # Read all lines (the file is append-only; for serious scale we'd tail efficiently)
    try:
        with _LOG_FILE.open("r", encoding="utf-8") as f:
            lines = f.readlines()
    except Exception:
        return []

    entries: list[dict] = []
    for raw in reversed(lines):
        raw = raw.strip()
        if not raw:
            continue
        try:
            entry = json.loads(raw)
        except Exception:
            continue

        if level and entry.get("level") != level:
            continue
        if call_id and entry.get("call_id") != call_id:
            continue
        if phase_prefix and not str(entry.get("phase", "")).startswith(phase_prefix):
            continue

        entries.append(entry)
        if len(entries) >= limit:
            break

    return entries


def clear_logs() -> int:
    """Clear the log file. Returns number of bytes removed."""
    if not _LOG_FILE.exists():
        return 0
    size = _LOG_FILE.stat().st_size
    _LOG_FILE.write_text("", encoding="utf-8")
    return size
