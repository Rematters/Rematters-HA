"""Pydantic models for Rematters vault data."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator

from category_icons import normalize as normalize_category_icon


def utc_now() -> str:
    """Match Rematters Cloud format (UTC Z, no fractional seconds) for sync merges."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    color: str = "#6366f1"
    icon: str = "folder"
    sort_order: int = 0

    @field_validator("icon")
    @classmethod
    def _icon(cls, value: str) -> str:
        return normalize_category_icon(value)


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


class VaultDeletions(BaseModel):
    """Tombstones so deletes sync to Rematters Cloud and other devices."""

    codes: dict[str, str] = Field(default_factory=dict)
    categories: dict[str, str] = Field(default_factory=dict)


class VaultMeta(BaseModel):
    version: int = 1
    exported_at: Optional[str] = None
    addon_version: str = "0.1.23"
    source: Optional[str] = None
    deletions: VaultDeletions = Field(default_factory=VaultDeletions)


class Vault(BaseModel):
    meta: VaultMeta = Field(default_factory=VaultMeta)
    categories: list[Category] = Field(default_factory=list)
    codes: list[MatterCode] = Field(default_factory=list)


class CategoryCreate(BaseModel):
    name: str
    color: str = "#6366f1"
    icon: str = "folder"
    sort_order: int = 0

    @field_validator("icon")
    @classmethod
    def _icon(cls, value: str) -> str:
        return normalize_category_icon(value)


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    sort_order: Optional[int] = None

    @field_validator("icon")
    @classmethod
    def _icon(cls, value: Optional[str]) -> Optional[str]:
        return normalize_category_icon(value) if value is not None else value


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
