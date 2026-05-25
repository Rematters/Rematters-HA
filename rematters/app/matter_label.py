"""Matter-style pairing label PNG (matches device sticker layout)."""

from __future__ import annotations

import io
import os

import qrcode
from PIL import Image, ImageDraw, ImageFont

from matter_payload import display_manual, qr_encode_payload

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
WORDMARK = os.path.join(STATIC_DIR, "assets", "matter_logo.png")

QR_SIZE = 220
PAD_X = 10
PAD_Y = 8
GAP = 6
LABEL_W = QR_SIZE + 2 * PAD_X + 4  # 2px border each side
LABEL_H_WITH_QR = PAD_Y + 47 + GAP + QR_SIZE + GAP + 32 + 10
LABEL_H_NO_QR = 160


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

    logo_h = 0
    if os.path.isfile(WORDMARK):
        logo = Image.open(WORDMARK).convert("RGBA")
        target_w = QR_SIZE
        ratio = target_w / logo.width
        logo = logo.resize((target_w, int(logo.height * ratio)), Image.Resampling.LANCZOS)
        logo_h = logo.height
        logo_y = PAD_Y
        img.paste(logo, ((w - logo.width) // 2, logo_y), logo)
    else:
        draw.text((w // 2 - 28, PAD_Y + 4), "matter", fill=(30, 30, 30))
        logo_h = 20

    if has_qr:
        qr_img = qrcode.make(encode)
        qr_img = qr_img.resize((QR_SIZE, QR_SIZE), Image.Resampling.NEAREST)
        qr_y = PAD_Y + logo_h + GAP
        img.paste(qr_img, ((w - QR_SIZE) // 2, qr_y), qr_img)

    if manual:
        font = _mono_font(22)
        manual_y = h - 36 if has_qr else h // 2 + 20
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
