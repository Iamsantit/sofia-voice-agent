"""Public lead-capture form submissions.

Two purposes:
  1. Power the embeddable widget so users can drop a form on any
     website and receive leads in their dashboard.
  2. Track aggregate stats (count per day) for the chart widget.

Storage:
  sofia-form-submissions   key=submission_id    value=submission dict
  sofia-form-rate-limit    key=ip_address       value={count, window_started}

Submission dict:
  {
    id, agent_id, owner_email,
    name, phone, email, message,
    source_url, ip,
    created_at (ISO)
  }
"""

from __future__ import annotations

import secrets
import time
from datetime import datetime, timezone

import modal

from app.logger import Phase, log

_subs = modal.Dict.from_name("sofia-form-submissions", create_if_missing=True)
_rl = modal.Dict.from_name("sofia-form-rate-limit", create_if_missing=True)

RATE_LIMIT_WINDOW_S = 3600  # 1 hour
RATE_LIMIT_MAX = 30          # 30 submissions per hour per IP


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _now() -> float:
    return time.time()


def check_rate_limit(ip: str) -> tuple[bool, int]:
    """True if allowed. Returns (allowed, remaining)."""
    if not ip:
        return True, RATE_LIMIT_MAX
    rec = _rl.get(ip) or {"count": 0, "window_started": _now()}
    now = _now()
    if now - rec.get("window_started", now) > RATE_LIMIT_WINDOW_S:
        rec = {"count": 0, "window_started": now}
    if rec["count"] >= RATE_LIMIT_MAX:
        return False, 0
    rec["count"] = rec.get("count", 0) + 1
    _rl[ip] = rec
    return True, RATE_LIMIT_MAX - rec["count"]


def submit(
    agent_id: str,
    owner_email: str,
    name: str,
    phone: str,
    email: str,
    message: str = "",
    source_url: str = "",
    ip: str = "",
) -> dict:
    """Persist a submission. Caller is responsible for any further
    processing (creating Notion lead, sending WhatsApp notification)."""
    sid = secrets.token_urlsafe(10)
    sub = {
        "id": sid,
        "agent_id": (agent_id or "").strip(),
        "owner_email": (owner_email or "").strip().lower(),
        "name": (name or "").strip(),
        "phone": (phone or "").strip(),
        "email": (email or "").strip().lower(),
        "message": (message or "").strip()[:1000],
        "source_url": (source_url or "").strip()[:300],
        "ip": (ip or "").strip(),
        "created_at": _now_iso(),
    }
    _subs[sid] = sub
    log.info(
        Phase.SYSTEM,
        "form.submission.received",
        data={
            "owner": sub["owner_email"],
            "agent": sub["agent_id"],
            "name": sub["name"],
        },
    )
    return sub


def list_for_owner(owner_email: str, limit: int = 100) -> list[dict]:
    """Return up to `limit` most recent submissions for a given owner."""
    if not owner_email:
        return []
    owner = owner_email.strip().lower()
    out: list[dict] = []
    try:
        for _, sub in _subs.items():
            if isinstance(sub, dict) and sub.get("owner_email") == owner:
                out.append(sub)
    except Exception:
        return []
    out.sort(key=lambda s: s.get("created_at", ""), reverse=True)
    return out[:limit]


def count_per_day(owner_email: str, days: int = 7) -> list[dict]:
    """Aggregate submissions per day for the last N days. Used by the
    dashboard chart. Returns list of {date: 'YYYY-MM-DD', count: int}."""
    from datetime import timedelta

    today = datetime.now(timezone.utc).date()
    window = [today - timedelta(days=i) for i in range(days - 1, -1, -1)]
    counts = {d.isoformat(): 0 for d in window}

    subs = list_for_owner(owner_email, limit=500)
    for s in subs:
        try:
            d = (
                datetime.fromisoformat(
                    s["created_at"].replace("Z", "+00:00")
                ).date().isoformat()
            )
        except Exception:
            continue
        if d in counts:
            counts[d] += 1

    return [
        {"date": d, "count": counts[d]} for d in sorted(counts.keys())
    ]
