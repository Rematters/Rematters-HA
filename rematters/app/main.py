"""Rematters — Home Assistant add-on API and ingress UI."""

from __future__ import annotations

import io
import logging
import os
from contextlib import asynccontextmanager
from typing import Any, Optional

import qrcode
import uvicorn
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from gdrive import GDriveBackup, load_options
from ha_client import HomeAssistantClient
from models import (
    Category,
    CategoryCreate,
    CategoryUpdate,
    MatterCode,
    MatterCodeCreate,
    MatterCodeUpdate,
    utc_now,
)
from cloud_sync import cloud_configured, load_cloud_options, run_cloud_sync
from models import Vault
from storage import VaultStorage

logging.basicConfig(level=logging.INFO)
_LOGGER = logging.getLogger("rematters")

ALLOWED_INGRESS_IP = "172.30.32.2"
PORT = int(os.environ.get("REMATTERS_PORT", "8099"))
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")

storage = VaultStorage()
ha = HomeAssistantClient()


class ImportBody(BaseModel):
    data: str
    merge: bool = False


def _find_category(vault, category_id: str) -> Category:
    for cat in vault.categories:
        if cat.id == category_id:
            return cat
    raise HTTPException(404, "Category not found")


def _find_code(vault, code_id: str) -> MatterCode:
    for code in vault.codes:
        if code.id == code_id:
            return code
    raise HTTPException(404, "Matter code not found")


def run_backup() -> dict[str, Any]:
    vault_path = storage.path
    if not vault_path.exists():
        return {"ok": False, "reason": "no_vault"}
    storage.backup_local_copy()
    options = load_options()
    gdrive = GDriveBackup(options)
    file_id = gdrive.upload_vault(vault_path)
    return {"ok": True, "gdrive_file_id": file_id}


@asynccontextmanager
async def lifespan(app: FastAPI):
    from apscheduler.schedulers.background import BackgroundScheduler

    scheduler = BackgroundScheduler()

    def scheduled_backup():
        try:
            options = load_options()
            if GDriveBackup(options).configured:
                result = run_backup()
                _LOGGER.info("Scheduled backup: %s", result)
        except Exception:
            _LOGGER.exception("Scheduled backup failed")

    options = load_options()
    hours = int(options.get("backup_interval_hours") or 24)
    if GDriveBackup(options).configured:
        scheduler.add_job(
            scheduled_backup,
            "interval",
            hours=hours,
            id="gdrive_backup",
            replace_existing=True,
        )
        scheduler.start()
        _LOGGER.info("Google Drive backup every %s hour(s)", hours)

    def scheduled_cloud_sync():
        if not cloud_configured():
            return
        try:
            result = run_cloud_sync(storage)
            _LOGGER.info("Cloud sync OK (revision %s)", result.get("revision"))
        except Exception:
            _LOGGER.exception("Scheduled cloud sync failed")

    if cloud_configured():
        try:
            scheduled_cloud_sync()
        except Exception:
            _LOGGER.exception("Initial cloud sync on startup failed")
        scheduler.add_job(
            scheduled_cloud_sync,
            "interval",
            minutes=15,
            id="cloud_sync",
            replace_existing=True,
        )
        if not scheduler.running:
            scheduler.start()
        _LOGGER.info("Rematters Cloud sync on startup and every 15 minutes")

    yield
    if scheduler.running:
        scheduler.shutdown(wait=False)


app = FastAPI(title="Rematters", version="0.1.5", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def ingress_ip_filter(request: Request, call_next):
    """Only allow Supervisor ingress (and local health during dev)."""
    client = request.client.host if request.client else ""
    if client not in (ALLOWED_INGRESS_IP, "127.0.0.1", "::1"):
        _LOGGER.warning("Blocked request from %s", client)
        return JSONResponse({"detail": "Forbidden"}, status_code=403)
    return await call_next(request)


# --- Vault ---


@app.get("/api/vault")
async def get_vault():
    return storage.load().model_dump()


@app.get("/api/export")
async def export_vault():
    return Response(
        content=storage.export_json(),
        media_type="application/json",
        headers={
            "Content-Disposition": 'attachment; filename="rematters-export.json"'
        },
    )


@app.post("/api/import")
async def import_vault(body: ImportBody):
    try:
        vault = storage.import_json(body.data, merge=body.merge)
    except Exception as exc:
        raise HTTPException(400, f"Invalid JSON: {exc}") from exc
    return vault.model_dump()


@app.post("/api/backup")
async def trigger_backup():
    return run_backup()


@app.get("/api/backup/status")
async def backup_status():
    options = load_options()
    gdrive = GDriveBackup(options)
    return {
        "gdrive_configured": gdrive.configured,
        "gdrive_enabled": gdrive.enabled,
        "interval_hours": options.get("backup_interval_hours", 24),
    }


# --- Categories ---


@app.get("/api/categories")
async def list_categories():
    return storage.load().categories


@app.post("/api/categories", status_code=201)
async def create_category(body: CategoryCreate):
    vault = storage.load()
    category = Category(**body.model_dump())
    vault.categories.append(category)
    vault.categories.sort(key=lambda c: (c.sort_order, c.name.lower()))
    storage.save(vault)
    return category


@app.put("/api/categories/{category_id}")
async def update_category(category_id: str, body: CategoryUpdate):
    vault = storage.load()
    category = _find_category(vault, category_id)
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(category, key, value)
    storage.save(vault)
    return category


@app.delete("/api/categories/{category_id}")
async def delete_category(category_id: str):
    vault = storage.load()
    _find_category(vault, category_id)
    vault.categories = [c for c in vault.categories if c.id != category_id]
    for code in vault.codes:
        if code.category_id == category_id:
            code.category_id = None
    storage.save(vault)
    return {"ok": True}


# --- Matter codes ---


@app.get("/api/codes")
async def list_codes(category_id: Optional[str] = Query(None)):
    codes = storage.load().codes
    if category_id:
        codes = [c for c in codes if c.category_id == category_id]
    return codes


@app.post("/api/codes", status_code=201)
async def create_code(body: MatterCodeCreate):
    vault = storage.load()
    data = body.model_dump()
    ha_link = data.pop("ha_link", None)
    code = MatterCode(**data)
    if ha_link:
        code.ha_link = ha_link
    if code.category_id:
        _find_category(vault, code.category_id)
    vault.codes.append(code)
    storage.save(vault)
    return code


@app.put("/api/codes/{code_id}")
async def update_code(code_id: str, body: MatterCodeUpdate):
    vault = storage.load()
    code = _find_code(vault, code_id)
    updates = body.model_dump(exclude_unset=True)
    if "category_id" in updates and updates["category_id"]:
        _find_category(vault, updates["category_id"])
    ha_link = updates.pop("ha_link", None)
    for key, value in updates.items():
        setattr(code, key, value)
    if ha_link is not None:
        code.ha_link = ha_link
    code.updated_at = utc_now()
    storage.save(vault)
    return code


@app.delete("/api/codes/{code_id}")
async def delete_code(code_id: str):
    vault = storage.load()
    _find_code(vault, code_id)
    vault.codes = [c for c in vault.codes if c.id != code_id]
    storage.save(vault)
    return {"ok": True}


@app.get("/api/codes/{code_id}/qr.png")
async def code_qr_png(code_id: str):
    vault = storage.load()
    code = _find_code(vault, code_id)
    payload = code.qr_payload or code.manual_code
    if not payload:
        raise HTTPException(400, "No QR payload or manual code")
    img = qrcode.make(payload)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")


# --- Home Assistant ---


@app.get("/api/ha/entities")
async def ha_entities(domain: Optional[str] = Query(None)):
    return await ha.list_entities(domain)


@app.get("/api/ha/attribute")
async def ha_attribute(entity_id: str, attribute: str):
    value = await ha.get_attribute(entity_id, attribute)
    if value is None:
        raise HTTPException(404, "Entity or attribute not found")
    return {"entity_id": entity_id, "attribute": attribute, "value": value}


@app.post("/api/codes/{code_id}/sync-from-ha")
async def sync_code_from_ha(code_id: str):
    vault = storage.load()
    code = _find_code(vault, code_id)
    link = code.ha_link
    if not link.entity_id or not link.attribute:
        raise HTTPException(400, "No Home Assistant entity/attribute linked")
    value = await ha.get_attribute(link.entity_id, link.attribute)
    if value is None:
        raise HTTPException(404, "Could not read attribute from Home Assistant")
    if isinstance(value, str):
        if value.upper().startswith("MT:"):
            code.qr_payload = value
        else:
            code.manual_code = value
    code.updated_at = utc_now()
    storage.save(vault)
    return code


# --- Cloud sync (optional hybrid) ---


@app.get("/api/cloud/status")
async def cloud_status():
    opts = load_cloud_options()
    has_token = bool((opts.get("cloud_token") or "").strip())
    has_url = bool((opts.get("cloud_url") or "").strip())
    enabled_flag = opts.get("cloud_enabled")
    return {
        "configured": cloud_configured(),
        "url": (opts.get("cloud_url") or "").strip() or None,
        "has_token": has_token,
        "cloud_enabled": enabled_flag,
        "hint": None
        if cloud_configured()
        else (
            "Set cloud_url and cloud_token in add-on configuration."
            if not (has_url and has_token)
            else "Enable cloud_enabled in add-on configuration."
            if enabled_flag is False
            else None
        ),
    }


@app.post("/api/cloud/sync")
async def cloud_sync_now():
    if not cloud_configured():
        status = await cloud_status()
        detail = status.get("hint") or "Configure Rematters Cloud in add-on options"
        raise HTTPException(400, detail)
    try:
        result = run_cloud_sync(storage)
    except RuntimeError as e:
        raise HTTPException(502, str(e)) from e
    return {"ok": True, "revision": result.get("revision")}


# --- Static UI (relative paths for ingress) ---

if os.path.isdir(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
async def index():
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.isfile(index_path):
        return FileResponse(index_path)
    return JSONResponse({"service": "rematters", "version": "0.1.5"})


if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=PORT,
        log_level="info",
        access_log=True,
    )
