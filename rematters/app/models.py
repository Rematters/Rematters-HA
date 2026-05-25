"""Pydantic models for Rematters vault data."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from pydantic import BaseModel, Field


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    color: str = "#6366f1"
    sort_order: int = 0


class HaLink(BaseModel):
    entity_id: Optional[str] = None
    attribute: Optional[str] = None


class MatterCode(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    device_type: str = ""
    category_id: Optional[str] = None
    manual_code: str = ""
    qr_payload: str = ""
    notes: str = ""
    ha_link: HaLink = Field(default_factory=HaLink)
    created_at: str = Field(default_factory=utc_now)
    updated_at: str = Field(default_factory=utc_now)


class VaultMeta(BaseModel):
    version: int = 1
    exported_at: Optional[str] = None
    addon_version: str = "0.1.4"


class Vault(BaseModel):
    meta: VaultMeta = Field(default_factory=VaultMeta)
    categories: list[Category] = Field(default_factory=list)
    codes: list[MatterCode] = Field(default_factory=list)


class CategoryCreate(BaseModel):
    name: str
    color: str = "#6366f1"
    sort_order: int = 0


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    sort_order: Optional[int] = None


class MatterCodeCreate(BaseModel):
    name: str
    device_type: str = ""
    category_id: Optional[str] = None
    manual_code: str = ""
    qr_payload: str = ""
    notes: str = ""
    ha_link: Optional[HaLink] = None


class MatterCodeUpdate(BaseModel):
    name: Optional[str] = None
    device_type: Optional[str] = None
    category_id: Optional[str] = None
    manual_code: Optional[str] = None
    qr_payload: Optional[str] = None
    notes: Optional[str] = None
    ha_link: Optional[HaLink] = None
