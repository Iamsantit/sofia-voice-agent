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


def _resend_post(payload: dict) -> requests.Response:
    api_key = os.environ["RESEND_API_KEY"]
    return requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=15,
    )


def send_otp_email(email: str, code: str) -> dict:
    """Send OTP email. Returns metadata about delivery.

    Behavior:
      - Try to send to `email` directly.
      - If Resend returns 403 sandbox restriction AND RESEND_OWNER_EMAIL is set,
        retry sending to the owner with a subject that indicates the recipient.
        This unblocks development before a custom domain is verified.
      - Returns: {"sent_to": str, "sandbox_redirect": bool}
    """
    from_addr = os.environ.get("RESEND_FROM_EMAIL", "onboarding@resend.dev")
    owner_email = os.environ.get("RESEND_OWNER_EMAIL", "").strip()

    primary_payload = {
        "from": f"SofiaAI <{from_addr}>",
        "to": [email],
        "subject": f"Tu código SofiaAI: {code}",
        "html": _render_otp_html(code, recipient=email),
    }

    r = _resend_post(primary_payload)
    if r.ok:
        log.info(Phase.SYSTEM, "auth.email.sent", data={"email": email})
        return {"sent_to": email, "sandbox_redirect": False}

    # Detect Resend sandbox 403 and redirect to owner if configured
    is_sandbox_err = (
        r.status_code == 403
        and "testing emails to your own" in r.text.lower()
    )

    if is_sandbox_err and owner_email and owner_email != email:
        log.warn(
            Phase.SYSTEM,
            "auth.email.sandbox_redirect",
            data={"requested_for": email, "redirected_to": owner_email},
        )
        retry_payload = {
            "from": f"SofiaAI <{from_addr}>",
            "to": [owner_email],
            "subject": f"[Sandbox] Código para {email}: {code}",
            "html": _render_otp_html(code, recipient=email, sandbox_for=email),
        }
        r2 = _resend_post(retry_payload)
        if r2.ok:
            log.info(
                Phase.SYSTEM,
                "auth.email.sent_to_owner",
                data={"intended_for": email, "owner": owner_email},
            )
            return {"sent_to": owner_email, "sandbox_redirect": True}

    # Either not a sandbox issue, or retry also failed
    log.error(
        Phase.SYSTEM,
        "auth.email.send_fail",
        data={"email": email, "status": r.status_code, "body": r.text[:300]},
        message=f"Resend HTTP {r.status_code}",
    )
    raise RuntimeError(f"No se pudo enviar el email (HTTP {r.status_code}): {r.text[:200]}")


def send_otp_sms(phone: str, code: str) -> dict:
    """Send OTP via Twilio SMS. Returns {sent: bool, sid: str|None, error: str|None}.

    Twilio SMS works to any number worldwide that's reachable by our trial
    account (verified destinations only on trial; any number on a paid
    account). No domain verification needed — this is the most reliable
    delivery channel for sign-up codes.
    """
    if not phone or not phone.strip():
        return {"sent": False, "sid": None, "error": "missing_phone"}

    try:
        from twilio.rest import Client

        sid = os.environ["TWILIO_ACCOUNT_SID"]
        token = os.environ["TWILIO_AUTH_TOKEN"]
        from_number = os.environ["TWILIO_PHONE_NUMBER"]
    except KeyError as e:
        return {"sent": False, "sid": None, "error": f"missing_env:{e}"}

    body = (
        f"Tu código de SofiaAI es {code}. "
        f"Expira en 10 minutos. No lo compartas con nadie."
    )

    try:
        client = Client(sid, token)
        msg = client.messages.create(
            to=phone.strip(),
            from_=from_number,
            body=body,
        )
        log.info(
            Phase.SYSTEM,
            "auth.sms.sent",
            data={"phone": phone, "sid": msg.sid, "status": msg.status},
        )
        return {"sent": True, "sid": msg.sid, "error": None}
    except Exception as e:
        log.warn(
            Phase.SYSTEM,
            "auth.sms.send_fail",
            data={"phone": phone, "reason": str(e)[:200]},
        )
        return {"sent": False, "sid": None, "error": str(e)[:200]}


def send_otp_dual(email: str, phone: str, code: str) -> dict:
    """Send the OTP code via BOTH email and SMS in parallel.

    Returns a unified result the API layer can pass back to the UI.
    Either channel succeeding is enough — the user just needs to
    receive the code somewhere.

    Result shape:
      {
        "any_sent": bool,
        "email": {"sent": bool, "sent_to": str, "sandbox_redirect": bool, "error": str|None},
        "sms":   {"sent": bool, "sid": str|None, "error": str|None},
      }
    """
    email_out = {"sent": False, "sent_to": "", "sandbox_redirect": False, "error": None}
    try:
        meta = send_otp_email(email, code)
        email_out = {
            "sent": True,
            "sent_to": meta.get("sent_to", email),
            "sandbox_redirect": bool(meta.get("sandbox_redirect")),
            "error": None,
        }
    except Exception as e:
        email_out["error"] = str(e)[:200]

    sms_out = send_otp_sms(phone, code) if phone else {
        "sent": False, "sid": None, "error": "no_phone_provided",
    }

    return {
        "any_sent": email_out["sent"] or sms_out["sent"],
        "email": email_out,
        "sms": sms_out,
    }


def _render_otp_html(code: str, recipient: str = "", sandbox_for: str = "") -> str:
    sandbox_banner = ""
    if sandbox_for:
        sandbox_banner = f"""
    <div style="background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.4);border-radius:8px;padding:12px;margin-bottom:20px;font-size:12px;color:#fbbf24;">
      ⚠️ <strong>Modo sandbox de Resend.</strong> Este código es para iniciar sesión como
      <strong>{sandbox_for}</strong>. Para que cada usuario reciba su propio código directamente,
      verifica un dominio en resend.com/domains.
    </div>"""

    return f"""<!doctype html>
<html>
<body style="margin:0;padding:40px 20px;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#111;border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:40px;color:#e5e5e5;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:12px;background:#fbbf24;color:#000;font-weight:700;font-size:20px;">S</div>
      <h1 style="margin:16px 0 0;font-size:24px;font-weight:600;font-style:italic;">Sofia<span style="color:#fbbf24;">AI</span></h1>
    </div>
    {sandbox_banner}
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
