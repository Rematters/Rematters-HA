# Changelog

## 0.1.13 (2026-05-25)

- Category icons (Lucide, bundled offline) next to name and color in sidebar and editor
- Icon picker in category dialog; syncs with Rematters Cloud

## 0.1.12 (2026-05-25)

- Matter cards: HTML/CSS sticker (logo, QR, bind code) with black 8px border, no broken label.png
- Action buttons hidden until card hover

## 0.1.11 (2026-05-25)

- Release bump (same Matter sticker cards as 0.1.10; update via Supervisor)

## 0.1.10 (2026-05-25)

- Catalog cards match the physical Matter sticker (wordmark, QR, setup code)
- Share / Edit / Delete appear in the corner on hover (web and add-on)
- QR is only drawn when a valid MT: payload is stored (manual-only labels omit QR)

## 0.1.9 (2026-05-31)

- Matter-style pairing labels on code cards (logo, scannable MT: QR, setup code below)
- QR encodes only the MT:… payload (not hyphenated manual code) so HA / Apple Home scans work
- Normalize 11-digit setup codes as XXXX-XXX-XXXX on save

## 0.1.8 (2026-05-29)

- Vault code cards match Rematters Cloud (Share / Edit / Delete icons, English labels)
- Share always visible; download image works locally; secret links need Cloud sync
- Category select uses “No category”; code dialogs use English titles like the cloud app

## 0.1.7 (2026-05-29)

- Share icon on code cards (via Rematters Cloud when hybrid is configured)
- Share dialog: download image + secret link; proxied cloud API from add-on

## 0.1.6 (2026-05-25)

- Scan Matter QR via mobile camera (or photo) when adding codes
- Block duplicate Matter codes (same manual digits or MT: QR payload)

## 0.1.5 (2026-05-25)

- Fix hybrid sync ignoring cloud edits (category, fields) when timestamps used mixed `Z` vs `+00:00` formats
- Align HA `updated_at` format with Rematters Cloud for reliable merge

## 0.1.4 (2026-05-25)

- Fix cloud sync 403 from Plesk/Imunify bot protection: send `User-Agent: Rematters-HomeAssistant/…` on API calls

## 0.1.3 (2026-05-25)

- Cloud sync: run on add-on startup and every 15 minutes (not only manual button)
- `cloud_enabled` defaults to true when using hybrid mode
- Clearer cloud API errors and `/cloud/status` hints in Ingress UI
- Documentation for Rematters Cloud hybrid setup

## 0.1.2 (2026-05-25)

- Optional Rematters Cloud hybrid sync (`cloud_url`, `cloud_token`)
- Shared brand UI and light/dark theme toggle in Ingress

## 0.1.1 (2026-05-26)

- Fix AppArmor profile (add-on install on Home Assistant OS)
- English default Ingress UI with en/nl locale files
- Documentation: Settings → Apps → Install app → Repositories
- Product URLs updated to rematters.casa / viewer.rematters.casa

## 0.1.0 (2026-05-25)

- Initial MVP: Matter codes CRUD, categories, HA attribute link
- JSON storage, export/import, local + Google Drive backup
- Ingress UI (English default, Dutch via i18n)
- Rematters Webviewer (separate repo)
