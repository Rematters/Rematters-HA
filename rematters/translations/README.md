# Translations

## Home Assistant Supervisor (add-on configuration)

Strings for the **add-on options** screen in Home Assistant are in:

- `en.yaml`: English (default)
- `nl.yaml`: Dutch

Home Assistant picks the file matching the user's UI language automatically.

To add a language, copy `en.yaml` to e.g. `de.yaml` and translate the `configuration.*` labels.

## Ingress web UI (in-app)

The management UI uses JSON locale files:

- `app/static/locales/en.json`: default
- `app/static/locales/nl.json`: Dutch (switch via language dropdown in the UI)

Add a locale:

1. Copy `en.json` to `app/static/locales/<code>.json`
2. Add the code to `SUPPORTED` in `app/static/i18n.js`
3. Translate all keys

Users can also pass `?lang=nl` or set `localStorage.rematters_locale`, or use the flag toggle in the header (GB / NL).
