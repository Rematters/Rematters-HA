"""Matter-style pairing label PNG (logo, QR, manual code)."""

from __future__ import annotations

import io
import os

import qrcode
from PIL import Image, ImageDraw, ImageFont

from matter_payload import display_manual, qr_encode_payload

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
WORDMARK = os.path.join(STATIC_DIR, "brand", "matter-wordmark.png")


def label_png_bytes(manual_code: str, qr_payload: str) -> bytes | None:
    manual = display_manual(manual_code)
    encode = qr_encode_payload(qr_payload, manual_code)
    if not manual and encode is None:
        return None

    w, h = 320, 440
    img = Image.new("RGB", (w, h), "white")
    draw = ImageDraw.Draw(img)
    draw.rectangle((2, 2, w - 3, h - 3), outline="black", width=2)

    if os.path.isfile(WORDMARK):
        logo = Image.open(WORDMARK).convert("RGBA")
        target_w = 140
        ratio = target_w / logo.width
        logo = logo.resize((target_w, int(logo.height * ratio)), Image.Resampling.LANCZOS)
        img.paste(logo, ((w - logo.width) // 2, 12), logo)
    else:
        draw.text((w // 2 - 28, 20), "matter", fill=(30, 30, 30))

    qr_y = 88
    if encode:
        qr_img = qrcode.make(encode)
        qr_img = qr_img.resize((200, 200), Image.Resampling.NEAREST)
        img.paste(qr_img, ((w - 200) // 2, qr_y))
    else:
        draw.text((52, qr_y + 90), "Add MT: QR payload", fill=(120, 120, 120))
        draw.text((44, qr_y + 108), "to enable scanning", fill=(120, 120, 120))

    if manual:
        font = _mono_font(22)
        if font:
            bbox = draw.textbbox((0, 0), manual, font=font)
            tw = bbox[2] - bbox[0]
            draw.text(((w - tw) // 2, h - 56), manual, fill="black", font=font)
        else:
            draw.text(((w - len(manual) * 8) // 2, h - 48), manual, fill="black")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _mono_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont | None:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf",
        "/Library/Fonts/Menlo.ttc",
    ]
    for path in candidates:
        if os.path.isfile(path):
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
    return ImageFont.load_default()
