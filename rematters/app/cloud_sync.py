"""Optional sync with Rematters Cloud (rematters.casa)."""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Optional
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

_LOGGER = logging.getLogger("rematters.cloud")

OPTIONS_PATH = "/data/options.json"
# Identifies HA sync to the cloud API (avoids Plesk/Imunify “browser signature” 403 on Python-urllib).
ADDON_API_VERSION = "0.1.25"
USER_AGENT = f"Rematters-HomeAssistant/{ADDON_API_VERSION} (+https://github.com/Rematters/Rematters-HA)"


def load_cloud_options() -> dict[str, Any]:
    if not os.path.isfile(OPTIONS_PATH):
        return {}
    with open(OPTIONS_PATH, encoding="utf-8") as f:
        return json.load(f)


def cloud_configured() -> bool:
    """True when URL + token are set and cloud sync is not explicitly disabled."""
    opts = load_cloud_options()
    has_url = bool((opts.get("cloud_url") or "").strip())
    has_token = bool((opts.get("cloud_token") or "").strip())
    if not has_url or not has_token:
        return False
    if opts.get("cloud_enabled") is False:
        return False
    return True


def cloud_api_raw(method: str, path: str, body: Optional[dict] = None) -> tuple[bytes, str]:
    """Call Rematters Cloud API; return response body bytes and Content-Type."""
    opts = load_cloud_options()
    base = (opts.get("cloud_url") or "https://rematters.casa").rstrip("/")
    token = (opts.get("cloud_token") or "").strip()
    url = f"{base}{path}"
    data = None
    headers = {
        "Authorization": f"Bearer {token}",
        "User-Agent": USER_AGENT,
        "X-Rematters-Client": "homeassistant-addon",
    }
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
        headers["Accept"] = "application/json"
    else:
        headers["Accept"] = "*/*"
    req = Request(url, data=data, headers=headers, method=method)
    try:
        with urlopen(req, timeout=60) as resp:
            content_type = resp.headers.get("Content-Type", "application/octet-stream")
            return resp.read(), content_type
    except HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        _LOGGER.error("Cloud API %s %s: %s %s", method, path, e.code, detail)
        msg = f"Cloud API error {e.code}"
        try:
            parsed = json.loads(detail) if detail else {}
            if isinstance(parsed, dict) and parsed.get("detail"):
                msg = str(parsed["detail"])
        except json.JSONDecodeError:
            if detail and len(detail) < 200:
                msg = detail
        raise RuntimeError(msg) from e
    except URLError as e:
        _LOGGER.error("Cloud unreachable: %s", e)
        raise RuntimeError("Cloud unreachable") from e


def _api_request(method: str, path: str, body: Optional[dict] = None) -> dict[str, Any]:
    opts = load_cloud_options()
    base = (opts.get("cloud_url") or "https://rematters.casa").rstrip("/")
    token = (opts.get("cloud_token") or "").strip()
    url = f"{base}{path}"
    data = None
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "User-Agent": USER_AGENT,
        "X-Rematters-Client": "homeassistant-addon",
    }
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = Request(url, data=data, headers=headers, method=method)
    try:
        with urlopen(req, timeout=60) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        _LOGGER.error("Cloud API %s %s: %s %s", method, path, e.code, detail)
        msg = f"Cloud API error {e.code}"
        try:
            body = json.loads(detail) if detail else {}
            if isinstance(body, dict) and body.get("detail"):
                msg = f"{msg}: {body['detail']}"
        except json.JSONDecodeError:
            if detail and len(detail) < 200:
                msg = f"{msg}: {detail}"
            elif "browser" in detail.lower() and "signature" in detail.lower():
                msg = (
                    f"{msg}: Server WAF blocked the add-on (not a bad token). "
                    "Update to add-on 0.1.4+ or whitelist User-Agent "
                    f"'{USER_AGENT}' or path /api/sync/ in Plesk Imunify360."
                )
        raise RuntimeError(msg) from e
    except URLError as e:
        _LOGGER.error("Cloud unreachable: %s", e)
        raise RuntimeError("Cloud unreachable") from e


def pull_vault() -> dict[str, Any]:
    return _api_request("GET", "/api/sync/vault")


def push_vault(vault_dict: dict[str, Any], mode: str = "merge") -> dict[str, Any]:
    return _api_request(
        "PUT",
        "/api/sync/vault",
        {"vault": vault_dict, "mode": mode},
    )


def run_cloud_sync(storage) -> dict[str, Any]:
    """Pull from cloud, merge with local vault, save locally, push merged result back."""
    from models import Vault

    vault = storage.load()
    result = sync_bidirectional(vault.model_dump(mode="json"))
    merged = result.get("vault") or result
    from vault_merge import sanitize_vault_dict

    storage.save(Vault.model_validate(sanitize_vault_dict(merged)))
    return result


def sync_bidirectional(local_vault: dict[str, Any]) -> dict[str, Any]:
    """
    Pull cloud vault, merge with local by updated_at, push merged result back.
    Returns cloud API response with merged vault.
    """
    remote = pull_vault()
    cloud_vault = remote.get("vault") or remote
    from vault_merge import merge_vaults

    merged = merge_vaults(local_vault, cloud_vault)
    return push_vault(merged, mode="replace")
