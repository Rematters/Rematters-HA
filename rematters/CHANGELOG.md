# Changelog

## 0.1.5 — 2026-05-25

- Fix hybrid sync ignoring cloud edits (category, fields) when timestamps used mixed `Z` vs `+00:00` formats
- Align HA `updated_at` format with Rematters Cloud for reliable merge

## 0.1.4 — 2026-05-25

- Fix cloud sync 403 from Plesk/Imunify bot protection: send `User-Agent: Rematters-HomeAssistant/…` on API calls

## 0.1.3 — 2026-05-25

- Cloud sync: run on add-on startup and every 15 minutes (not only manual button)
- `cloud_enabled` defaults to true when using hybrid mode
- Clearer cloud API errors and `/cloud/status` hints in Ingress UI
- Documentation for Rematters Cloud hybrid setup

## 0.1.2 — 2026-05-25

- Optional Rematters Cloud hybrid sync (`cloud_url`, `cloud_token`)
- Shared brand UI and light/dark theme toggle in Ingress

## 0.1.1 — 2026-05-26

- Fix AppArmor profile (add-on install on Home Assistant OS)
- English default Ingress UI with en/nl locale files
- Documentation: Settings → Apps → Install app → Repositories
- Product URLs updated to rematters.casa / viewer.rematters.casa

## 0.1.0 — 2026-05-25

- Initial MVP: Matter codes CRUD, categories, HA attribute link
- JSON storage, export/import, local + Google Drive backup
- Ingress UI (English default, Dutch via i18n)
- Rematters Webviewer (separate repo)
