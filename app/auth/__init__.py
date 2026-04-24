"""Auth module: OTP via email (Resend) + stateless JWT sessions."""

from __future__ import annotations

import os
import secrets
import time
from datetime import datetime, timedelta, timezone

import jwt
import modal
import requests

from app.logger import Phase, log

_otp_dict = modal.Dict.from_name("sofia-auth-otp", create_if_missing=True)

JWT_ALGO = "HS256"
SESSION_DAYS = 30
OTP_TTL_SECONDS = 600  # 10 min
OTP_MAX_ATTEMPTS = 5


def _now() -> float:
    return time.time()


def generate_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def store_otp(email: str, code: str) -> None:
    _otp_dict[email.lower()] = {
        "code": code,
        "expires_at": _now() + OTP_TTL_SECONDS,
        "attempts": 0,
    }


def verify_otp(email: str, code: str) -> tuple[bool, str]:
    key = email.lower()
    try:
        entry = _otp_dict.get(key)
    except Exception:
        entry = None

    if not entry:
        return False, "Código no solicitado o expirado"

    if entry["expires_at"] < _now():
        try:
            del _otp_dict[key]
        except Exception:
            pass
        return False, "Código expirado"

    if entry.get("attempts", 0) >= OTP_MAX_ATTEMPTS:
        return False, "Demasiados intentos. Solicita un código nuevo."

    if entry["code"] != code:
        entry["attempts"] = entry.get("attempts", 0) + 1
        _otp_dict[key] = entry
        return False, "Código incorrecto"

    try:
        del _otp_dict[key]
    except Exception:
        pass
    return True, ""


def send_otp_email(email: str, code: str) -> None:
    api_key = os.environ["RESEND_API_KEY"]
    from_addr = os.environ.get("RESEND_FROM_EMAIL", "onboarding@resend.dev")

    r = requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "from": f"Sofía <{from_addr}>",
            "to": [email],
            "subject": f"Tu código de Sofía: {code}",
            "html": _render_otp_html(code),
        },
        timeout=15,
    )
    if not r.ok:
        log.error(
            Phase.SYSTEM,
            "auth.email.send_fail",
            data={"email": email, "status": r.status_code, "body": r.text[:300]},
            message=f"Resend HTTP {r.status_code}",
        )
        raise RuntimeError(f"No se pudo enviar el email (HTTP {r.status_code}): {r.text[:200]}")
    log.info(Phase.SYSTEM, "auth.email.sent", data={"email": email})


def _render_otp_html(code: str) -> str:
    return f"""<!doctype html>
<html>
<body style="margin:0;padding:40px 20px;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#111;border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:40px;color:#e5e5e5;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#fbbf24,#f97316);color:#000;font-weight:700;font-size:20px;">S</div>
      <h1 style="margin:16px 0 0;font-size:24px;font-weight:600;font-style:italic;">Sofía</h1>
    </div>
    <p style="font-size:16px;margin:0 0 16px;color:#a3a3a3;">Tu código de acceso:</p>
    <div style="background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.3);border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
      <div style="font-family:'SF Mono',Menlo,monospace;font-size:40px;font-weight:700;letter-spacing:8px;color:#fbbf24;">{code}</div>
    </div>
    <p style="font-size:14px;color:#a3a3a3;margin:16px 0 0;">Ingrésalo en la pantalla de verificación. El código expira en 10 minutos.</p>
    <p style="font-size:12px;color:#737373;margin:32px 0 0;border-top:1px solid rgba(255,255,255,0.06);padding-top:16px;">
      Si no solicitaste este código, ignora este correo.
    </p>
  </div>
</body>
</html>"""


def create_session_token(email: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": email.lower(),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=SESSION_DAYS)).timestamp()),
    }
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGO)


def verify_session_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
