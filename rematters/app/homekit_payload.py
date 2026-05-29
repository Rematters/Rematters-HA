"""HomeKit setup URI (X-HM://) — aligned with SimonGolms/homekit-code."""

from __future__ import annotations

import re

# https://github.com/SimonGolms/homekit-code/blob/master/src/config/categories.ts
HOMEKIT_CATEGORIES: dict[str, int] = {
    "airConditioner": 21,
    "airport": 27,
    "airPurifier": 19,
    "appleTv": 24,
    "bridge": 2,
    "dehumidifier": 23,
    "door": 12,
    "doorLock": 6,
    "fan": 3,
    "faucet": 29,
    "garage": 4,
    "heater": 20,
    "humidifier": 22,
    "ipCamera": 17,
    "lightbulb": 5,
    "other": 1,
    "outlet": 7,
    "programmableSwitch": 15,
    "rangeExtender": 16,
    "securitySystem": 11,
    "sensor": 10,
    "showerHead": 30,
    "speaker": 26,
    "sprinkler": 28,
    "switch": 8,
    "targetController": 32,
    "television": 31,
    "thermostat": 9,
    "videoDoorBell": 18,
    "window": 13,
    "windowCovering": 14,
}

DEFAULT_HOMEKIT_FLAG = 2  # IP


def pairing_digits(value: str) -> str:
    digits = re.sub(r"\D", "", value or "")
    return digits if len(digits) == 8 else ""


def normalize_setup_id(value: str) -> str:
    s = re.sub(r"[^0-9A-Za-z]", "", (value or "").strip()).upper()
    return s[:4] if len(s) == 4 else ""


def normalize_uri_body(body: str) -> str:
    return re.sub(r"[^0-9A-Za-z]", "", (body or "")).upper()


def to_base36_upper(n: int, width: int = 9) -> str:
    alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    if n <= 0:
        return "0".zfill(width)
    out: list[str] = []
    while n:
        n, rem = divmod(n, 36)
        out.append(alphabet[rem])
    return "".join(reversed(out)).zfill(width)


def compose_setup_uri(
    *,
    category_id: int,
    flag: int = DEFAULT_HOMEKIT_FLAG,
    password: str,
    setup_id: str = "",
    version: int = 0,
    reserved: int = 0,
) -> str:
    """Build ``X-HM://{base36}{setupId}`` (homekit-code composeSetupUri)."""
    payload = version & 0x7
    payload = ((payload << 4) | (reserved & 0xF)) & 0xFFFFFFFF
    payload = ((payload << 8) | (category_id & 0xFF)) & 0xFFFFFFFF
    payload = ((payload << 4) | (flag & 0xF)) & 0xFFFFFFFF
    payload = (int(payload) << 27) | (int(password) & 0x7FFFFFFF)
    base36 = to_base36_upper(int(payload), 9)
    sid = normalize_setup_id(setup_id)
    return f"X-HM://{base36}{sid}"


def category_id_for(name: str) -> int:
    key = (name or "other").strip()
    return HOMEKIT_CATEGORIES.get(key, HOMEKIT_CATEGORIES["other"])


def category_name_for_id(category_id: int) -> str:
    for name, cid in HOMEKIT_CATEGORIES.items():
        if cid == category_id:
            return name
    return "other"


def decode_payload_from_base36(base36: str) -> dict[str, int]:
    try:
        n = int(base36, 36)
    except ValueError:
        return {}
    password = n & 0x7FFFFFFF
    rest = n >> 27
    flag = rest & 0xF
    rest >>= 4
    category_id = rest & 0xFF
    return {"password": password, "flag": flag, "category_id": category_id}


def parse_setup_uri(uri: str) -> dict[str, str] | None:
    """Parse X-HM URI; preserve full alphanumeric body (extended hub payloads)."""
    s = (uri or "").strip()
    if not s.upper().startswith("X-HM://"):
        return None
    body = normalize_uri_body(s[7:])
    if len(body) < 9:
        return None
    base36 = body[:9]
    setup_id = ""
    if len(body) >= 13:
        setup_id = normalize_setup_id(body[-4:])
    elif len(body) > 9:
        setup_id = normalize_setup_id(body[9:])
    return {"base36": base36, "setup_id": setup_id, "uri": f"X-HM://{body}"}


def decode_pairing_from_uri(uri: str) -> str:
    parsed = parse_setup_uri(uri)
    if not parsed:
        return ""
    fields = decode_payload_from_base36(parsed["base36"])
    if fields:
        password = fields["password"]
        digits = str(password)
        return digits.zfill(8) if len(digits) <= 8 else ""
    try:
        n = int(parsed["base36"], 36)
    except ValueError:
        return ""
    password = n & 0x7FFFFFFF
    digits = str(password)
    return digits.zfill(8) if len(digits) <= 8 else ""


def decode_fields_from_uri(uri: str) -> dict[str, str | int]:
    parsed = parse_setup_uri(uri)
    if not parsed:
        return {}
    fields = decode_payload_from_base36(parsed["base36"])
    out: dict[str, str | int] = {"setup_id": parsed["setup_id"]}
    if fields:
        out["homekit_flag"] = int(fields["flag"])
        out["homekit_category"] = category_name_for_id(int(fields["category_id"]))
    return out


def qr_encode_payload(qr_payload: str, manual_code: str = "") -> str | None:
    qr = (qr_payload or "").strip()
    if qr.upper().startswith("X-HM://"):
        parsed = parse_setup_uri(qr)
        return parsed["uri"] if parsed else qr
    digits = pairing_digits(manual_code)
    if digits:
        return None
    return None


def normalize_fields(
    manual_code: str,
    qr_payload: str,
    *,
    homekit_category: str = "other",
    homekit_flag: int = DEFAULT_HOMEKIT_FLAG,
    setup_id: str = "",
) -> dict[str, str | int]:
    """Normalize HomeKit vault fields; derive category/setup ID from URI when present."""
    qr = (qr_payload or "").strip()
    parsed = parse_setup_uri(qr) if qr else None
    digits = pairing_digits(manual_code)
    sid = normalize_setup_id(setup_id)
    if parsed and not digits:
        digits = decode_pairing_from_uri(parsed["uri"])
    if parsed:
        decoded = decode_fields_from_uri(parsed["uri"])
        return {
            "manual_code": digits,
            "qr_payload": parsed["uri"],
            "setup_id": str(decoded.get("setup_id") or sid),
            "homekit_category": str(
                decoded.get("homekit_category") or homekit_category
            ),
            "homekit_flag": int(decoded.get("homekit_flag") or homekit_flag),
        }
    if len(digits) == 8:
        cat_id = category_id_for(homekit_category)
        uri = compose_setup_uri(
            category_id=cat_id,
            flag=int(homekit_flag),
            password=digits,
            setup_id=sid,
        )
        return {
            "manual_code": digits,
            "qr_payload": uri,
            "setup_id": sid,
            "homekit_category": homekit_category,
            "homekit_flag": int(homekit_flag),
        }
    return {
        "manual_code": digits,
        "qr_payload": qr,
        "setup_id": sid,
        "homekit_category": homekit_category,
        "homekit_flag": int(homekit_flag),
    }


def has_scannable_qr(qr_payload: str) -> bool:
    return parse_setup_uri(qr_payload or "") is not None
