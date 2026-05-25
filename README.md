# Rematters-HA

[![Home Assistant](https://img.shields.io/badge/Home%20Assistant-Add--on-41BDF5?style=flat-square&logo=home-assistant)](https://www.home-assistant.io/addons/)
[![GitHub](https://img.shields.io/github/stars/Rematters/Rematters-HA?style=flat-square)](https://github.com/Rematters/Rematters-HA)

**Rematters** — Home Assistant add-on. Your online Matter code vault: store, categorize, export, and back up pairing codes.

| | |
|---|---|
| **Website** | [rematters.casa](https://rematters.casa) |
| **Viewer** | [viewer.rematters.casa](https://viewer.rematters.casa) |
| **Landing / docs** | [Rematters-Web](https://github.com/Rematters/Rematters-Web) |
| **Web viewer repo** | [Rematters-Webviewer](https://github.com/Rematters/Rematters-Webviewer) |

## Add this repository in Home Assistant

**Settings → Add-ons → Add-on store → ⋮ → Repositories**

```text
https://github.com/Rematters/Rematters-HA
```

Then install **Rematters**, start the add-on, and open **Open Web UI** (Ingress).

## Repository layout

```text
Rematters-HA/                 ← this repo (add-on store root)
├── repository.yaml
└── rematters/                ← add-on (slug: rematters)
    ├── config.yaml
    ├── Dockerfile
    ├── app/
    └── …
```

## Documentation

- [DOCS.md](rematters/DOCS.md) — OAuth, JSON schema, API
- [CHANGELOG.md](rematters/CHANGELOG.md)

## Development

```bash
cd rematters/app
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
REMATTERS_DATA=/tmp/rematters-data python main.py
```

## License

MIT © [Rematters](https://rematters.casa)
