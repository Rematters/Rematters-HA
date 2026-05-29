"""Z-Wave SmartStart QR PNG (version 3, EC level L — SDS13937 / zwave-js)."""

from __future__ import annotations

import io

import qrcode
from PIL import Image

DEFAULT_QR_SIZE = 220
CROP_PAD_PX = 4


def qr_png_bytes(payload: str, size: int = DEFAULT_QR_SIZE) -> bytes:
    qr = qrcode.QRCode(
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=8,
        border=4,
    )
    qr.add_data(payload)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    img = _crop_to_modules(img, pad=CROP_PAD_PX)
    img = img.resize((size, size), Image.Resampling.NEAREST)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _crop_to_modules(img: Image.Image, pad: int = CROP_PAD_PX) -> Image.Image:
    gray = img.convert("L")
    mask = gray.point(lambda p: 255 if p < 248 else 0)
    bbox = mask.getbbox()
    if not bbox:
        return img
    left, top, right, bottom = bbox
    left = max(0, left - pad)
    top = max(0, top - pad)
    right = min(img.width, right + pad)
    bottom = min(img.height, bottom + pad)
    return img.crop((left, top, right, bottom))
