"""User registry with email/phone + bcrypt-hashed password.

Storage:
  sofia-users      Modal Dict   key=email(lower)  value=user dict
  sofia-phone-idx  Modal Dict   key=normalized_phone  value=email

User dict shape:
  {
    "email": str,
    "phone": str (normalized digits + leading +),
    "first_name": str,
    "last_name": str,
    "password_hash": str,           # bcrypt
    "created_at": str (ISO UTC),
  }
"""

from __future__ import annotations

import re
from datetime import datetime, timezone

import bcrypt
import modal

_users = modal.Dict.from_name("sofia-users", create_if_missing=True)
_phone_idx = modal.Dict.from_name("sofia-phone-idx", create_if_missing=True)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _hash(pw: str) -> str:
    # rounds=10 keeps verify under ~150ms on Modal's default container.
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt(rounds=10)).decode("utf-8")


def _verify(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def normalize_phone(raw: str) -> str:
    """Strip everything that isn't a digit or leading + sign."""
    if not raw:
        return ""
    raw = raw.strip()
    sign = "+" if raw.startswith("+") else ""
    digits = re.sub(r"\D", "", raw)
    return sign + digits if digits else ""


def email_exists(email: str) -> bool:
    if not email:
        return False
    return email.strip().lower() in _users


def phone_exists(phone: str) -> bool:
    p = normalize_phone(phone)
    if not p:
        return False
    return p in _phone_idx


def get_user(email_or_phone: str) -> dict | None:
    """Lookup by email or phone number."""
    if not email_or_phone:
        return None
    ident = email_or_phone.strip()
    if "@" in ident:
        return _users.get(ident.lower())
    p = normalize_phone(ident)
    if not p:
        return None
    email = _phone_idx.get(p)
    if not email:
        return None
    return _users.get(email)


def create_user(
    email: str,
    phone: str,
    first_name: str,
    last_name: str,
    password: str,
) -> dict:
    """Create a new user. Raises ValueError("already_registered") on conflict."""
    email = (email or "").strip().lower()
    if not email or "@" not in email:
        raise ValueError("invalid_email")
    if not first_name or len(first_name.strip()) < 2:
        raise ValueError("invalid_first_name")
    if not last_name or len(last_name.strip()) < 2:
        raise ValueError("invalid_last_name")
    if not password or len(password) < 8:
        raise ValueError("password_too_short")

    if email in _users:
        raise ValueError("already_registered")

    phone_n = normalize_phone(phone)
    if phone_n and phone_n in _phone_idx:
        # Phone already used by another account
        raise ValueError("phone_in_use")

    user = {
        "email": email,
        "phone": phone_n,
        "first_name": first_name.strip(),
        "last_name": last_name.strip(),
        "password_hash": _hash(password),
        "created_at": _now(),
    }
    _users[email] = user
    if phone_n:
        _phone_idx[phone_n] = email
    return user


def authenticate(identifier: str, password: str) -> tuple[dict | None, str | None]:
    """Return (user, None) on success, or (None, error_code) on failure.

    error_code is one of: not_registered, wrong_password, invalid_input
    """
    if not identifier or not password:
        return None, "invalid_input"
    user = get_user(identifier)
    if not user:
        return None, "not_registered"
    if not _verify(password, user.get("password_hash", "")):
        return None, "wrong_password"
    return user, None


def public_user(user: dict) -> dict:
    """Return user dict without sensitive fields, safe for client."""
    return {
        "email": user.get("email", ""),
        "phone": user.get("phone", ""),
        "first_name": user.get("first_name", ""),
        "last_name": user.get("last_name", ""),
        "created_at": user.get("created_at", ""),
    }
