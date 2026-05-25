"""Share card PNG (same layout as Rematters Cloud)."""

from __future__ import annotations

import io

import qrcode
from PIL import Image, ImageDraw


def card_png_bytes(
    name: str,
    device_type: str,
    manual_code: str,
    qr_payload: str,
) -> bytes:
    payload = (qr_payload or "").strip() or (manual_code or "").strip()
    if not payload:
        raise ValueError("No code to render")

    qr_img = qrcode.make(payload)
    qr_img = qr_img.resize((280, 280))

    w, h = 520, 680
    img = Image.new("RGB", (w, h), "white")
    draw = ImageDraw.Draw(img)

    title = _truncate(name or "Matter code", 28)
    draw.text((32, 28), title, fill=(15, 23, 42))
    y = 54
    if (device_type or "").strip():
        draw.text((32, y), _truncate(device_type.strip(), 40), fill=(100, 116, 139))
        y = 88
    if (manual_code or "").strip():
        draw.text((32, y), _truncate(manual_code.strip(), 32), fill=(15, 23, 42))

    img.paste(qr_img, ((w - 280) // 2, 140))
    draw.text((32, h - 36), "Rematters Matter pairing code", fill=(99, 102, 241))

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _truncate(s: str, max_len: int) -> str:
    if len(s) <= max_len:
        return s
    return s[: max_len - 1] + "…"
