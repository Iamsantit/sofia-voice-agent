"""Plans + credits enforcement.

Three tiers:

  BASIC   $0/mo    50 min/mo · 1 agent · 1 number · email support
  PRO     $49/mo   1,000 min/mo · 3 agents · 3 numbers · WhatsApp + Calendar
  PLUS    $149/mo  UNLIMITED · 10 agents · 10 numbers · all integrations

Each user has a record in `sofia-credits` Modal Dict:
  {
    "email": str,
    "plan": "basic" | "pro" | "plus",
    "minutes_used_this_period": float,   # rolling 30-day window
    "period_started_at": str (ISO UTC),
    "created_at": str,
    "updated_at": str,
  }

Quota constants below are the source of truth for both backend
enforcement and the dashboard's /facturacion page.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Literal

import modal

PlanKey = Literal["basic", "pro", "plus"]

UNLIMITED = float("inf")


@dataclass(frozen=True)
class Plan:
    key: PlanKey
    name: str
    monthly_price_usd: int
    annual_price_usd: int
    minutes_included: float           # per period
    max_agents: int
    max_phone_numbers: int
    integrations: tuple[str, ...]     # whitelist of integration keys
    can_clone_voice: bool
    has_priority_support: bool
    # Trial: if > 0, the plan auto-locks after this many days from signup.
    # Used to gate the Basic/Starter plan to a 14-day free trial.
    trial_days: int = 0


PLANS: dict[PlanKey, Plan] = {
    "basic": Plan(
        key="basic",
        name="Starter",
        monthly_price_usd=0,
        annual_price_usd=0,
        minutes_included=50,
        max_agents=1,
        max_phone_numbers=1,
        integrations=("custom-webhook",),
        can_clone_voice=False,
        has_priority_support=False,
        trial_days=14,
    ),
    "pro": Plan(
        key="pro",
        name="Pro",
        monthly_price_usd=29,
        annual_price_usd=19 * 12,  # $228/yr, 35% off vs monthly
        minutes_included=500,
        max_agents=2,
        max_phone_numbers=1,
        integrations=(
            "custom-webhook",
            "google-calendar",
            "whatsapp",
            "zapier",
        ),
        can_clone_voice=False,
        has_priority_support=True,
    ),
    "plus": Plan(
        key="plus",
        name="Plus",
        monthly_price_usd=79,
        annual_price_usd=59 * 12,  # $708/yr, 25% off vs monthly
        minutes_included=UNLIMITED,
        max_agents=10,
        max_phone_numbers=5,
        integrations=(
            "custom-webhook",
            "google-calendar",
            "whatsapp",
            "hubspot",
            "pipedrive",
            "salesforce",
            "zoho",
            "zapier",
            "make",
        ),
        can_clone_voice=True,
        has_priority_support=True,
    ),
}

DEFAULT_PLAN: PlanKey = "basic"
PERIOD_DAYS = 30


# ── Storage ────────────────────────────────────────────────────────────────

_credits = modal.Dict.from_name("sofia-credits", create_if_missing=True)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _now_dt() -> datetime:
    return datetime.now(timezone.utc)


def get_record(email: str) -> dict:
    """Get or create a credits record for the user. Auto-resets period if
    the rolling window has expired."""
    email = email.strip().lower()
    rec = _credits.get(email)
    if not rec:
        rec = {
            "email": email,
            "plan": DEFAULT_PLAN,
            "minutes_used_this_period": 0.0,
            "period_started_at": _now_iso(),
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
        }
        _credits[email] = rec
        return rec

    # Roll the period forward if needed
    try:
        started = datetime.fromisoformat(
            rec.get("period_started_at", _now_iso()).replace("Z", "+00:00")
        )
    except Exception:
        started = _now_dt()
    if _now_dt() - started >= timedelta(days=PERIOD_DAYS):
        rec["minutes_used_this_period"] = 0.0
        rec["period_started_at"] = _now_iso()
        rec["updated_at"] = _now_iso()
        _credits[email] = rec
    return rec


def set_plan(email: str, plan: PlanKey) -> dict:
    if plan not in PLANS:
        raise ValueError(f"Plan inválido: {plan}")
    rec = get_record(email)
    rec["plan"] = plan
    rec["updated_at"] = _now_iso()
    _credits[rec["email"]] = rec
    return rec


def add_minutes_used(email: str, seconds: int | float) -> dict:
    """Record minutes consumed by a finished call."""
    rec = get_record(email)
    rec["minutes_used_this_period"] = float(
        rec.get("minutes_used_this_period", 0.0)
    ) + (float(seconds) / 60.0)
    rec["updated_at"] = _now_iso()
    _credits[rec["email"]] = rec
    return rec


def get_plan(email: str) -> Plan:
    rec = get_record(email)
    return PLANS.get(rec.get("plan", DEFAULT_PLAN), PLANS[DEFAULT_PLAN])


# ── Trial helpers ───────────────────────────────────────────────────────────


def trial_remaining_seconds(email: str) -> int | None:
    """Seconds left on the user's trial. None if their plan has no trial.
    Negative or zero means the trial expired."""
    rec = get_record(email)
    plan = PLANS.get(rec.get("plan", DEFAULT_PLAN), PLANS[DEFAULT_PLAN])
    if plan.trial_days <= 0:
        return None
    try:
        started = datetime.fromisoformat(
            rec.get("created_at", _now_iso()).replace("Z", "+00:00")
        )
    except Exception:
        started = _now_dt()
    expires = started + timedelta(days=plan.trial_days)
    return int((expires - _now_dt()).total_seconds())


def is_trial_expired(email: str) -> bool:
    remaining = trial_remaining_seconds(email)
    return remaining is not None and remaining <= 0


def trial_status(email: str) -> dict:
    """Compact trial info used by the UI."""
    rec = get_record(email)
    plan = PLANS.get(rec.get("plan", DEFAULT_PLAN), PLANS[DEFAULT_PLAN])
    if plan.trial_days <= 0:
        return {"is_trial": False, "expired": False}
    remaining = trial_remaining_seconds(email) or 0
    days = max(0, remaining // 86400 + (1 if remaining % 86400 > 0 and remaining > 0 else 0))
    try:
        started = datetime.fromisoformat(
            rec.get("created_at", _now_iso()).replace("Z", "+00:00")
        )
    except Exception:
        started = _now_dt()
    expires_at = (started + timedelta(days=plan.trial_days)).isoformat(
        timespec="seconds"
    )
    return {
        "is_trial": True,
        "expired": remaining <= 0,
        "days_remaining": days,
        "seconds_remaining": max(0, remaining),
        "expires_at": expires_at,
        "trial_days": plan.trial_days,
    }


def get_usage(email: str) -> dict:
    """Compact view used by the dashboard."""
    rec = get_record(email)
    plan = PLANS.get(rec["plan"], PLANS[DEFAULT_PLAN])
    used = float(rec.get("minutes_used_this_period", 0.0))
    is_unlimited = plan.minutes_included == UNLIMITED
    pct = 0 if is_unlimited else min(100, round(100 * used / max(plan.minutes_included, 1)))
    return {
        "email": rec["email"],
        "plan": {
            "key": plan.key,
            "name": plan.name,
            "monthly_price_usd": plan.monthly_price_usd,
            "annual_price_usd": plan.annual_price_usd,
            "minutes_included": None if is_unlimited else plan.minutes_included,
            "is_unlimited": is_unlimited,
            "max_agents": plan.max_agents,
            "max_phone_numbers": plan.max_phone_numbers,
            "integrations": list(plan.integrations),
            "can_clone_voice": plan.can_clone_voice,
            "has_priority_support": plan.has_priority_support,
            "trial_days": plan.trial_days,
        },
        "usage": {
            "minutes_used": round(used, 2),
            "minutes_pct": pct,
            "period_started_at": rec.get("period_started_at"),
            "period_days": PERIOD_DAYS,
        },
        "trial": trial_status(email),
    }


# ── Enforcement ────────────────────────────────────────────────────────────


def can_use_minutes(email: str, requested_seconds: float = 0.0) -> tuple[bool, str]:
    """True if the user has minutes left for an upcoming call.
    Returns (allowed, reason_if_not).
    """
    if is_trial_expired(email):
        return False, (
            "Tu trial gratis de 14 días venció. Sube a Pro o Plus para "
            "seguir haciendo llamadas."
        )
    plan = get_plan(email)
    if plan.minutes_included == UNLIMITED:
        return True, ""
    rec = get_record(email)
    used = float(rec.get("minutes_used_this_period", 0.0))
    needed = max(0.0, used + requested_seconds / 60.0)
    if needed >= plan.minutes_included:
        return False, (
            f"Llegaste al límite de {int(plan.minutes_included)} minutos "
            f"de tu plan {plan.name}. Sube de plan para seguir llamando."
        )
    return True, ""


def can_create_agent(email: str, current_agent_count: int) -> tuple[bool, str]:
    if is_trial_expired(email):
        return False, (
            "Tu trial gratis de 14 días venció. Sube a Pro o Plus para "
            "crear más agentes."
        )
    plan = get_plan(email)
    if current_agent_count >= plan.max_agents:
        return False, (
            f"Tu plan {plan.name} permite máximo {plan.max_agents} agente(s). "
            f"Ya tienes {current_agent_count}. Sube de plan para crear más."
        )
    return True, ""


def can_buy_phone_number(email: str, current_number_count: int) -> tuple[bool, str]:
    if is_trial_expired(email):
        return False, (
            "Tu trial gratis de 14 días venció. Sube a Pro o Plus para "
            "comprar números."
        )
    plan = get_plan(email)
    if current_number_count >= plan.max_phone_numbers:
        return False, (
            f"Tu plan {plan.name} permite máximo {plan.max_phone_numbers} "
            f"número(s) telefónico(s). Sube de plan para conectar más."
        )
    return True, ""


def can_use_integration(email: str, integration_key: str) -> tuple[bool, str]:
    plan = get_plan(email)
    if integration_key in plan.integrations:
        return True, ""
    return False, (
        f"La integración '{integration_key}' no está incluida en el plan "
        f"{plan.name}. Sube de plan para activarla."
    )


def can_clone_voice(email: str) -> tuple[bool, str]:
    plan = get_plan(email)
    if plan.can_clone_voice:
        return True, ""
    return False, (
        f"La clonación de voz solo está disponible en el plan Plus. "
        f"Tu plan actual es {plan.name}."
    )
