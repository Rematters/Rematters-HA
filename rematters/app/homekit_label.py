"""HomeKit pairing card SVG (layout from SimonGolms/homekit-code, MIT)."""

from __future__ import annotations

import io
import re
from pathlib import Path

import qrcode
from qrcode.image.svg import SvgPathImage

from homekit_payload import decode_pairing_from_uri, pairing_digits, qr_encode_payload

def _load_digit_symbols() -> str:
    here = Path(__file__).resolve().parent
    candidates = [
        here / "static" / "brand" / "homekit" / "digit-symbols.inc.xml",
    ]
    for parent in here.parents:
        candidates.append(parent / "brand" / "homekit" / "digit-symbols.inc.xml")
    for path in candidates:
        if path.is_file():
            return path.read_text(encoding="utf-8")
    raise FileNotFoundError("HomeKit digit symbols XML not found")


def _qr_symbol_fragment(setup_uri: str) -> str:
    qr = qrcode.QRCode(
        version=2,
        error_correction=qrcode.constants.ERROR_CORRECT_Q,
        box_size=1,
        border=0,
    )
    qr.add_data(setup_uri)
    qr.make(fit=True)
    buf = io.BytesIO()
    qr.make_image(image_factory=SvgPathImage).save(buf)
    svg = buf.getvalue().decode("utf-8")
    match = re.search(r"<svg([^>]*)>(.*)</svg>", svg, re.DOTALL | re.IGNORECASE)
    if not match:
        return f'<symbol id="qrCode">{svg}</symbol>'
    attrs = match.group(1)
    body = match.group(2)
    return f'<symbol id="qrCode"{attrs}>{body}</symbol>'


def compose_card_svg(
    *,
    pairing_code: str,
    setup_uri: str,
) -> str:
    """Full HomeKit label SVG (400×540), matching homekit-code qrcode output."""
    digits = pairing_digits(pairing_code)
    if len(digits) != 8:
        decoded = decode_pairing_from_uri(setup_uri)
        digits = pairing_digits(decoded) if decoded else ""
    if len(digits) != 8:
        raise ValueError("HomeKit pairing code must be 8 digits")

    uri = qr_encode_payload(setup_uri) or setup_uri
    if not uri or not uri.upper().startswith("X-HM://"):
        raise ValueError("Invalid HomeKit setup URI")

    qr_sym = _qr_symbol_fragment(uri)
    digit_defs = _load_digit_symbols()

    digit_uses = "\n".join(
        f'  <use href="#{digits[i]}" height="48" width="34" x="{174 + 54 * (i % 4)}" y="{30 if i < 4 else 102}"/>'
        for i in range(8)
    )

    return f"""<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg viewBox="0 0 400 540" xmlns="http://www.w3.org/2000/svg">
  <title>HomeKit QR Code</title>
  <defs>
    {digit_defs}
    {qr_sym}
  </defs>
  <rect fill="#000000" height="540" rx="20" width="400"/>
  <rect fill="#ffffff" height="530" rx="15" width="390" x="5" y="5"/>
  <use href="#homekit" height="120" width="130" x="24" y="30"/>
{digit_uses}
  <use href="#qrCode" height="340" width="340" x="30" y="175"/>
</svg>"""


def card_svg_for_code(code: dict) -> str:
    manual = str(code.get("manual_code") or "")
    qr = str(code.get("qr_payload") or "")
    if not qr and manual:
        from homekit_payload import category_id_for, compose_setup_uri, normalize_setup_id

        cat = category_id_for(str(code.get("homekit_category") or "other"))
        flag = int(code.get("homekit_flag") or 2)
        sid = normalize_setup_id(str(code.get("setup_id") or ""))
        digits = pairing_digits(manual)
        if len(digits) == 8:
            qr = compose_setup_uri(
                category_id=cat, flag=flag, password=digits, setup_id=sid
            )
    return compose_card_svg(pairing_code=manual, setup_uri=qr)
