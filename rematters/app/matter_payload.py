"""Matter setup payload helpers (QR must use MT:… string, not hyphenated manual)."""

from __future__ import annotations

import re


def manual_digits(value: str) -> str:
    d = re.sub(r"\D", "", value or "")
    return d if len(d) == 11 else ""


def format_manual11(digits: str) -> str:
    if len(digits) != 11:
        return digits
    return f"{digits[0:4]}-{digits[4:7]}-{digits[7:11]}"


def display_manual(manual_code: str) -> str:
    manual = (manual_code or "").strip()
    if not manual:
        return ""
    digits = manual_digits(manual)
    return format_manual11(digits) if digits else manual


def qr_encode_payload(qr_payload: str, manual_code: str = "") -> str | None:
    qr = (qr_payload or "").strip()
    if qr and qr.upper().startswith("MT:"):
        idx = qr.upper().find("MT:")
        return qr[idx:] if idx >= 0 else qr
    return None


def normalize_fields(manual_code: str, qr_payload: str) -> dict[str, str]:
    qr = (qr_payload or "").strip()
    manual = (manual_code or "").strip()
    if qr and qr.upper().startswith("MT:"):
        idx = qr.upper().find("MT:")
        qr = qr[idx:]
    else:
        qr = ""
    digits = manual_digits(manual)
    if digits:
        manual = format_manual11(digits)
    return {"manual_code": manual, "qr_payload": qr}
