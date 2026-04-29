"""KYC + phone verification + AI fraud analysis for number purchase.

Required before a user can buy a phone number on Basic/Pro plans.

Pipeline:
  1. User submits personal data + their phone number  → store pending
  2. We send an OTP to that phone via Twilio SMS      → verify ownership
  3. We run Twilio Lookup on the phone                → carrier, line type
  4. Claude analyzes (data + lookup) for fraud risk   → score 0-100
  5. If score < threshold: block purchase
     If score in middle: manual review (allowed but flagged)
     If score >= threshold: approve

Storage:
  sofia-kyc Modal Dict keyed by email:
    {
      email: str,
      stage: "pending" | "phone_verified" | "approved" | "flagged" | "rejected",
      personal: { full_name, doc_type, doc_number, country, address },
      phone_verified: str,           # the verified phone (E.164)
      lookup: { carrier, line_type, country_code, valid: bool },
      ai_analysis: { score: 0-100, verdict: str, reasons: [str] },
      created_at, updated_at
    }
"""

from __future__ import annotations

import json
import os
import secrets
import time
from datetime import datetime, timezone

import modal
import requests

from app.logger import Phase, log

_kyc_dict = modal.Dict.from_name("sofia-kyc", create_if_missing=True)
_kyc_otp_dict = modal.Dict.from_name("sofia-kyc-otp", create_if_missing=True)

OTP_TTL_SECONDS = 600
OTP_MAX_ATTEMPTS = 5

# AI scoring thresholds
AUTO_APPROVE_SCORE = 70   # >=70 → approved
AUTO_REJECT_SCORE = 30    # <30 → rejected
# Between 30 and 70 → flagged for review (still allowed but logged)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _now() -> float:
    return time.time()


# ── Personal data submission ───────────────────────────────────────────────


def submit_personal_data(email: str, personal: dict) -> dict:
    """Stage 1: store the user's personal info and move to OTP."""
    email = email.strip().lower()
    if not email:
        raise ValueError("Falta email")

    required = ("full_name", "doc_type", "doc_number", "country")
    missing = [k for k in required if not (personal.get(k) or "").strip()]
    if missing:
        raise ValueError(f"Faltan campos: {', '.join(missing)}")

    if len(personal.get("full_name", "").strip()) < 4:
        raise ValueError("Nombre completo demasiado corto")
    if len(personal.get("doc_number", "").strip()) < 4:
        raise ValueError("Número de documento inválido")

    rec = _kyc_dict.get(email) or {}
    rec.update(
        {
            "email": email,
            "stage": "pending",
            "personal": {
                "full_name": personal.get("full_name", "").strip(),
                "doc_type": personal.get("doc_type", "").strip().upper(),
                "doc_number": personal.get("doc_number", "").strip(),
                "country": personal.get("country", "").strip(),
                "address": personal.get("address", "").strip(),
            },
            "created_at": rec.get("created_at") or _now_iso(),
            "updated_at": _now_iso(),
        }
    )
    _kyc_dict[email] = rec
    log.info(Phase.SYSTEM, "kyc.personal.submitted", data={"email": email})
    return rec


# ── Phone OTP (separate from auth OTP — uses Twilio SMS only) ──────────────


def send_phone_otp(email: str, phone: str) -> dict:
    """Stage 2a: send SMS code to the user's personal phone via Twilio."""
    email = email.strip().lower()
    phone = phone.strip()
    if not email or not phone:
        raise ValueError("Falta email o phone")

    rec = _kyc_dict.get(email)
    if not rec:
        raise ValueError("Primero envía tus datos personales")

    code = f"{secrets.randbelow(1_000_000):06d}"
    _kyc_otp_dict[email] = {
        "code": code,
        "phone": phone,
        "expires_at": _now() + OTP_TTL_SECONDS,
        "attempts": 0,
    }

    # Send via Twilio
    try:
        from twilio.rest import Client

        sid = os.environ["TWILIO_ACCOUNT_SID"]
        token = os.environ["TWILIO_AUTH_TOKEN"]
        from_ = os.environ["TWILIO_PHONE_NUMBER"]
        client = Client(sid, token)
        msg = client.messages.create(
            to=phone,
            from_=from_,
            body=(
                f"Tu código SofiaAI para verificar tu número es {code}. "
                f"Expira en 10 min. No lo compartas."
            ),
        )
        log.info(
            Phase.SYSTEM,
            "kyc.otp.sent",
            data={"email": email, "phone": phone, "sid": msg.sid},
        )
        return {"sent": True, "sid": msg.sid}
    except Exception as e:
        log.exception(Phase.SYSTEM, "kyc.otp.send_fail", e)
        return {
            "sent": False,
            "error": str(e)[:200],
            "dev_code": code,  # fallback so the user can still continue
        }


def verify_phone_otp(email: str, code: str) -> tuple[bool, str]:
    """Stage 2b: validate code and mark phone as verified."""
    email = email.strip().lower()
    code = code.strip()

    entry = _kyc_otp_dict.get(email)
    if not entry:
        return False, "No hay código pendiente. Solicita uno nuevo."
    if entry["expires_at"] < _now():
        try:
            del _kyc_otp_dict[email]
        except Exception:
            pass
        return False, "Código expirado. Solicita uno nuevo."
    if entry.get("attempts", 0) >= OTP_MAX_ATTEMPTS:
        return False, "Demasiados intentos. Solicita un código nuevo."
    if entry["code"] != code:
        entry["attempts"] = entry.get("attempts", 0) + 1
        _kyc_otp_dict[email] = entry
        return False, "Código incorrecto"

    rec = _kyc_dict.get(email) or {}
    rec["phone_verified"] = entry["phone"]
    rec["stage"] = "phone_verified"
    rec["updated_at"] = _now_iso()
    _kyc_dict[email] = rec

    try:
        del _kyc_otp_dict[email]
    except Exception:
        pass
    log.info(Phase.SYSTEM, "kyc.otp.verified", data={"email": email})
    return True, ""


# ── Twilio Lookup + Claude analysis ────────────────────────────────────────


def lookup_phone(phone: str) -> dict:
    """Twilio Lookup v2 with line_type_intelligence — gives carrier,
    line type (mobile/voip/landline), country and validity."""
    sid = os.environ["TWILIO_ACCOUNT_SID"]
    token = os.environ["TWILIO_AUTH_TOKEN"]
    url = (
        f"https://lookups.twilio.com/v2/PhoneNumbers/{phone.strip()}"
        f"?Fields=line_type_intelligence"
    )
    r = requests.get(url, auth=(sid, token), timeout=10)
    if not r.ok:
        return {
            "valid": False,
            "error": f"HTTP {r.status_code}",
        }
    j = r.json()
    lti = j.get("line_type_intelligence") or {}
    return {
        "valid": j.get("valid", True),
        "country_code": j.get("country_code"),
        "phone_number": j.get("phone_number"),
        "national_format": j.get("national_format"),
        "carrier_name": lti.get("carrier_name"),
        "type": lti.get("type"),  # mobile | landline | nonFixedVoip | fixedVoip | tollFree
        "mobile_country_code": lti.get("mobile_country_code"),
    }


def analyze_with_claude(personal: dict, lookup: dict) -> dict:
    """Use Claude to score fraud risk based on the personal data + lookup.
    Returns: { score: 0-100, verdict: str, reasons: [str] }"""
    try:
        import anthropic

        prompt = f"""Eres un analista de riesgo para una plataforma SaaS que vende números telefónicos.
Tu trabajo es decidir si un nuevo cliente parece legítimo o es un riesgo de fraude.

Datos del cliente (KYC):
- Nombre completo: {personal.get('full_name', '?')}
- Documento: {personal.get('doc_type', '?')} {personal.get('doc_number', '?')}
- País: {personal.get('country', '?')}
- Dirección: {personal.get('address') or '(no proporcionada)'}

Resultado de Twilio Lookup sobre su teléfono personal:
- Número: {lookup.get('phone_number') or '?'} ({lookup.get('national_format') or '?'})
- País: {lookup.get('country_code') or '?'}
- Carrier: {lookup.get('carrier_name') or '?'}
- Tipo de línea: {lookup.get('type') or '?'}
- Válido: {lookup.get('valid')}

Responde con JSON puro (sin markdown, sin ``` ):
{{
  "score": 0-100 (100 = totalmente legítimo, 0 = fraude obvio),
  "verdict": "approved" | "flagged" | "rejected",
  "reasons": ["razón 1", "razón 2", ...]
}}

Reglas:
- VoIP no fijo (nonFixedVoip): muy sospechoso, suele ser burner. Score <40.
- VoIP fijo o sin tipo conocido: revisar. Score 40-70.
- Móvil con carrier conocido: legítimo. Score 70-90.
- Datos personales coherentes con el país del teléfono: +5 al score.
- Nombre o documento muy cortos / sospechosos: -20 al score.
- Si el lookup falló (valid=False o sin carrier): score <30, rejected.

Responde SOLO con el JSON."""

        client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
        resp = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = "".join(b.text for b in resp.content if hasattr(b, "text")).strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
            if raw.endswith("```"):
                raw = raw[:-3]
            raw = raw.strip()
        parsed = json.loads(raw)

        score = max(0, min(100, int(parsed.get("score", 0))))
        verdict = parsed.get("verdict", "")
        if verdict not in ("approved", "flagged", "rejected"):
            verdict = (
                "approved"
                if score >= AUTO_APPROVE_SCORE
                else "rejected"
                if score < AUTO_REJECT_SCORE
                else "flagged"
            )
        reasons = parsed.get("reasons") or []
        if not isinstance(reasons, list):
            reasons = [str(reasons)]
        return {"score": score, "verdict": verdict, "reasons": reasons[:6]}
    except Exception as e:
        log.exception(Phase.ANTHROPIC, "kyc.ai_analysis.fail", e)
        # Conservative fallback: if Claude fails, base verdict on lookup type
        line_type = (lookup.get("type") or "").lower()
        if line_type in ("nonfixedvoip", "voip"):
            return {
                "score": 25,
                "verdict": "rejected",
                "reasons": ["Línea VoIP no verificable", f"Análisis IA falló: {e}"],
            }
        if not lookup.get("valid"):
            return {
                "score": 10,
                "verdict": "rejected",
                "reasons": ["Número inválido según Twilio Lookup"],
            }
        return {
            "score": 60,
            "verdict": "flagged",
            "reasons": ["Análisis IA no disponible — revisión manual recomendada"],
        }


def run_full_analysis(email: str) -> dict:
    """Stage 3: run Twilio Lookup + Claude analysis and store results."""
    email = email.strip().lower()
    rec = _kyc_dict.get(email)
    if not rec or rec.get("stage") != "phone_verified":
        raise ValueError("Verifica primero tu teléfono.")

    phone = rec.get("phone_verified", "")
    lookup = lookup_phone(phone)
    analysis = analyze_with_claude(rec.get("personal", {}), lookup)

    rec["lookup"] = lookup
    rec["ai_analysis"] = analysis
    rec["stage"] = (
        "approved"
        if analysis["verdict"] == "approved"
        else "rejected"
        if analysis["verdict"] == "rejected"
        else "flagged"
    )
    rec["updated_at"] = _now_iso()
    _kyc_dict[email] = rec
    log.info(
        Phase.SYSTEM,
        "kyc.analysis.done",
        data={
            "email": email,
            "score": analysis["score"],
            "verdict": analysis["verdict"],
        },
    )
    return rec


def get_status(email: str) -> dict | None:
    if not email:
        return None
    return _kyc_dict.get(email.strip().lower())


def is_verified_for_purchase(email: str) -> tuple[bool, str]:
    """True if user is allowed to buy a phone number based on KYC stage."""
    rec = get_status(email)
    if not rec:
        return False, "Necesitas completar la verificación de identidad."
    stage = rec.get("stage", "pending")
    if stage == "approved":
        return True, ""
    if stage == "flagged":
        # Flagged users can still purchase but it's logged
        return True, ""
    if stage == "rejected":
        reasons = (rec.get("ai_analysis") or {}).get("reasons") or []
        return False, "Compra denegada: " + (reasons[0] if reasons else "verificación rechazada")
    return False, "Termina la verificación de identidad antes de comprar."
