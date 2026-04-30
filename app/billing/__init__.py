"""Billing & plan enforcement module."""

from app.billing.plans import (
    DEFAULT_PLAN,
    PLANS,
    Plan,
    PlanKey,
    _serialize_plan,
    add_minutes_used,
    can_buy_phone_number,
    can_clone_voice,
    can_create_agent,
    can_use_integration,
    can_use_minutes,
    compute_custom_plan_price,
    get_plan,
    get_record,
    get_usage,
    is_trial_expired,
    set_plan,
    trial_remaining_seconds,
    trial_status,
)

# Public alias (drops the leading underscore for external imports)
serialize_plan = _serialize_plan

__all__ = [
    "DEFAULT_PLAN",
    "PLANS",
    "Plan",
    "PlanKey",
    "add_minutes_used",
    "can_buy_phone_number",
    "can_clone_voice",
    "can_create_agent",
    "can_use_integration",
    "can_use_minutes",
    "compute_custom_plan_price",
    "get_plan",
    "get_record",
    "get_usage",
    "is_trial_expired",
    "serialize_plan",
    "set_plan",
    "trial_remaining_seconds",
    "trial_status",
]
