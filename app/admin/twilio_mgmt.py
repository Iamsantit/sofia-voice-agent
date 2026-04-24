"""Twilio admin operations: phone numbers (search/buy/release/trunk)."""

from __future__ import annotations

import os

import requests
from requests.auth import HTTPBasicAuth

from app.logger import Phase, log


def _auth() -> HTTPBasicAuth:
    return HTTPBasicAuth(os.environ["TWILIO_ACCOUNT_SID"], os.environ["TWILIO_AUTH_TOKEN"])


def _api_base() -> str:
    return f"https://api.twilio.com/2010-04-01/Accounts/{os.environ['TWILIO_ACCOUNT_SID']}"


# ── Owned numbers ───────────────────────────────────────────────────────────


def list_numbers() -> list[dict]:
    r = requests.get(f"{_api_base()}/IncomingPhoneNumbers.json", auth=_auth(), timeout=15)
    r.raise_for_status()
    nums = r.json().get("incoming_phone_numbers", [])
    return [
        {
            "sid": n.get("sid"),
            "phone_number": n.get("phone_number"),
            "friendly_name": n.get("friendly_name"),
            "voice": (n.get("capabilities") or {}).get("voice"),
            "sms": (n.get("capabilities") or {}).get("sms"),
            "mms": (n.get("capabilities") or {}).get("mms"),
            "date_created": n.get("date_created"),
            "voice_url": n.get("voice_url"),
        }
        for n in nums
    ]


def search_available(
    country: str = "US",
    area_code: str | None = None,
    contains: str | None = None,
    voice: bool = True,
    sms: bool = True,
    limit: int = 10,
) -> list[dict]:
    params: dict = {"VoiceEnabled": "true" if voice else "false",
                    "SmsEnabled": "true" if sms else "false",
                    "PageSize": limit}
    if area_code:
        params["AreaCode"] = area_code
    if contains:
        params["Contains"] = contains

    r = requests.get(
        f"{_api_base()}/AvailablePhoneNumbers/{country}/Local.json",
        auth=_auth(),
        params=params,
        timeout=20,
    )
    r.raise_for_status()
    data = r.json().get("available_phone_numbers", [])
    return [
        {
            "phone_number": n.get("phone_number"),
            "locality": n.get("locality"),
            "region": n.get("region"),
            "postal_code": n.get("postal_code"),
            "capabilities": n.get("capabilities"),
        }
        for n in data[:limit]
    ]


def buy_number(phone_number: str, friendly_name: str = "") -> dict:
    data: dict = {"PhoneNumber": phone_number}
    if friendly_name:
        data["FriendlyName"] = friendly_name
    r = requests.post(
        f"{_api_base()}/IncomingPhoneNumbers.json",
        auth=_auth(),
        data=data,
        timeout=30,
    )
    if not r.ok:
        raise RuntimeError(f"Twilio buy HTTP {r.status_code}: {r.text[:300]}")
    j = r.json()
    log.info(Phase.TWILIO, "admin.buy_number.ok", data={"phone": phone_number, "sid": j.get("sid")})
    return {"sid": j.get("sid"), "phone_number": j.get("phone_number")}


def release_number(sid: str) -> None:
    r = requests.delete(
        f"{_api_base()}/IncomingPhoneNumbers/{sid}.json",
        auth=_auth(),
        timeout=15,
    )
    if r.status_code not in (200, 204):
        raise RuntimeError(f"Twilio release HTTP {r.status_code}: {r.text[:300]}")
    log.info(Phase.TWILIO, "admin.release_number.ok", data={"sid": sid})


def get_balance() -> dict:
    r = requests.get(f"{_api_base()}/Balance.json", auth=_auth(), timeout=10)
    r.raise_for_status()
    j = r.json()
    return {"balance": j.get("balance"), "currency": j.get("currency")}


def list_verified_callers() -> list[dict]:
    r = requests.get(f"{_api_base()}/OutgoingCallerIds.json", auth=_auth(), timeout=15)
    r.raise_for_status()
    ids = r.json().get("outgoing_caller_ids", [])
    return [{"phone_number": i.get("phone_number"), "friendly_name": i.get("friendly_name")} for i in ids]


# ── Geo permissions ─────────────────────────────────────────────────────────


def get_geo(country_code: str) -> dict:
    r = requests.get(
        f"https://voice.twilio.com/v1/DialingPermissions/Countries/{country_code}",
        auth=_auth(),
        timeout=10,
    )
    r.raise_for_status()
    return r.json()


# ── SIP Trunks ──────────────────────────────────────────────────────────────


def list_trunks() -> list[dict]:
    r = requests.get("https://trunking.twilio.com/v1/Trunks", auth=_auth(), timeout=15)
    r.raise_for_status()
    return [
        {
            "sid": t.get("sid"),
            "friendly_name": t.get("friendly_name"),
            "domain_name": t.get("domain_name"),
            "secure": t.get("secure"),
        }
        for t in r.json().get("trunks", [])
    ]


def get_trunk_numbers(trunk_sid: str) -> list[dict]:
    r = requests.get(f"https://trunking.twilio.com/v1/Trunks/{trunk_sid}/PhoneNumbers", auth=_auth(), timeout=15)
    r.raise_for_status()
    return [
        {"sid": n.get("sid"), "phone_number": n.get("phone_number")}
        for n in r.json().get("phone_numbers", [])
    ]


def associate_number_to_trunk(trunk_sid: str, pn_sid: str) -> None:
    r = requests.post(
        f"https://trunking.twilio.com/v1/Trunks/{trunk_sid}/PhoneNumbers",
        auth=_auth(),
        data={"PhoneNumberSid": pn_sid},
        timeout=15,
    )
    if not r.ok:
        raise RuntimeError(f"associate_to_trunk HTTP {r.status_code}: {r.text[:300]}")
    log.info(Phase.TWILIO, "admin.trunk.associate.ok", data={"trunk": trunk_sid, "pn": pn_sid})
