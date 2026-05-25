# Rematters documentation

**Rematters** = *Remembers* + *Matter* — keep binding codes so you can find them later.

## Usage

1. **Categories** — group codes by room, vendor, or your own logic (right-click a category to edit).
2. **Add codes** — enter at least a name plus manual code and/or `MT:` QR string.
3. **HA link** — optional `entity_id` + attribute; use **Pull from HA** to sync the value.
4. **Export** — download `rematters-export.json` for backup or the [Rematters Viewer](https://viewer.rematters.casa).
5. **Backup now** — local copy plus Google Drive upload (when configured).

## Languages

- **Ingress UI**: English by default; Dutch via the language dropdown (or `?lang=nl`). See `translations/README.md` to add locales.
- **Add-on configuration** (Supervisor): `translations/en.yaml`, `translations/nl.yaml`.

## Google Drive OAuth (one-time)

1. [Google Cloud Console](https://console.cloud.google.com/) → new project → enable **Google Drive API**.
2. **OAuth consent screen** (External or Internal for Workspace).
3. **Credentials** → **Create OAuth client ID** → **Desktop app**.
4. Obtain a refresh token with scope `drive.file` (e.g. [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)).
5. Create a folder in Drive named `Rematters Backups` and copy the **folder ID** from the URL.

| Option | Description |
|--------|-------------|
| Google Drive backup | On/off |
| Folder ID | Target folder |
| Client ID / Secret / Refresh token | OAuth credentials |

Automatic backups follow **Backup interval (hours)**; old files are pruned per **Backups to retain**.

## JSON schema (v1)

```json
{
  "meta": { "version": 1, "exported_at": "ISO8601", "addon_version": "0.1.4" },
  "categories": [
    { "id": "uuid", "name": "Living room", "color": "#6366f1", "sort_order": 0 }
  ],
  "codes": [
    {
      "id": "uuid",
      "name": "Device name",
      "device_type": "light",
      "category_id": "uuid-or-null",
      "manual_code": "1234-567-8901",
      "qr_payload": "MT:…",
      "notes": "",
      "ha_link": { "entity_id": "light.example", "attribute": "matter_setup_code" },
      "created_at": "ISO8601",
      "updated_at": "ISO8601"
    }
  ]
}
```

## API (Ingress)

All routes are relative to the Ingress base under `./api/`:

| Method | Path | Action |
|--------|------|--------|
| GET | `/vault` | Full vault |
| GET | `/export` | JSON download |
| POST | `/import` | `{ "data": "…", "merge": false }` |
| POST | `/backup` | Manual backup |
| CRUD | `/categories`, `/codes` | Manage data |
| POST | `/codes/{id}/sync-from-ha` | Pull from HA attribute |
| GET | `/cloud/status` | Cloud sync configuration status |
| POST | `/cloud/sync` | Merge vault with Rematters Cloud now |

## Rematters Cloud (hybrid)

1. Register at [rematters.casa](https://rematters.casa) → **Account** → **Generate HA sync token**.
2. Add-on **Configuration**:
   - `cloud_enabled`: **true**
   - `cloud_url`: `https://rematters.casa`
   - `cloud_token`: your `rm_…` token
3. **Save** and **restart** the add-on (sync runs on startup and every 15 minutes).
4. Optional: open Ingress → **Cloud sync** for an immediate merge.

Sync is **bidirectional** (newest `updated_at` per item wins). The web vault does not push to Home Assistant by itself — the add-on pulls from and pushes to the cloud API.

## Security

- Ingress traffic is only accepted from the Supervisor (`172.30.32.2`).
- No separate login in the add-on; Home Assistant handles authentication via Ingress.
- Keep OAuth secrets in add-on configuration only (not in export JSON).

## Rematters Viewer

Users without HA can open exports at **[viewer.rematters.casa](https://viewer.rematters.casa)** ([Rematters-Webviewer](https://github.com/Rematters/Rematters-Webviewer)). The viewer validates `codes[]` and renders QR codes locally in the browser.

Product site: [rematters.casa](https://rematters.casa) · [Rematters-Web](https://github.com/Rematters/Rematters-Web)
