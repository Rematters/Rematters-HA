"""Matter-style pairing label PNG (matches device sticker layout)."""

from __future__ import annotations

import io
import os

import qrcode
from PIL import Image, ImageDraw, ImageFont

from matter_payload import display_manual, qr_encode_payload

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
WORDMARK = os.path.join(STATIC_DIR, "brand", "matter-wordmark.png")

LABEL_W = 342
LABEL_H_WITH_QR = 469
LABEL_H_NO_QR = 200


def label_png_bytes(manual_code: str, qr_payload: str) -> bytes | None:
    manual = display_manual(manual_code)
    encode = qr_encode_payload(qr_payload, manual_code)
    if not manual and encode is None:
        return None

    has_qr = encode is not None
    w, h = LABEL_W, LABEL_H_WITH_QR if has_qr else LABEL_H_NO_QR

    img = Image.new("RGB", (w, h), "white")
    draw = ImageDraw.Draw(img)
    draw.rectangle((2, 2, w - 3, h - 3), outline="black", width=2)

    if os.path.isfile(WORDMARK):
        logo = Image.open(WORDMARK).convert("RGBA")
        target_w = 200
        ratio = target_w / logo.width
        logo = logo.resize((target_w, int(logo.height * ratio)), Image.Resampling.LANCZOS)
        img.paste(logo, ((w - logo.width) // 2, 18), logo)
    else:
        draw.text((w // 2 - 28, 24), "matter", fill=(30, 30, 30))

    if has_qr:
        qr_img = qrcode.make(encode)
        qr_img = qr_img.resize((220, 220), Image.Resampling.NEAREST)
        img.paste(qr_img, ((w - 220) // 2, 78))

    if manual:
        font = _mono_font(24)
        manual_y = h - 48 if has_qr else h // 2 + 20
        if font:
            bbox = draw.textbbox((0, 0), manual, font=font)
            tw = bbox[2] - bbox[0]
            draw.text(((w - tw) // 2, manual_y), manual, fill="black", font=font)
        else:
            draw.text(((w - len(manual) * 8) // 2, manual_y - 10), manual, fill="black")

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
