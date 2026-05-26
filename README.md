<p align="center">
  <img src="rematters/logo.svg" alt="Rematters" width="88" height="88" />
</p>

<h1 align="center">Rematters</h1>

<p align="center"><strong>Your Online Matter Code Vault</strong> for Home Assistant</p>

<p align="center">
  <a href="https://github.com/Rematters/Rematters-HA">GitHub</a> ·
  <a href="https://rematters.casa">rematters.casa</a> ·
  <a href="https://viewer.rematters.casa">Viewer</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Home%20Assistant-Add--on-41BDF5?style=flat-square&logo=home-assistant" alt="Home Assistant Add-on" />
  <img src="https://img.shields.io/github/stars/Rematters/Rematters-HA?style=flat-square" alt="GitHub stars" />
</p>

---

**Rematters:** Home Assistant add-on. Store, categorize, export, and back up Matter pairing codes.

| | |
|---|---|
| **Website** | [rematters.casa](https://rematters.casa) |
| **Viewer** | [viewer.rematters.casa](https://viewer.rematters.casa) · [Rematters-Webviewer](https://github.com/Rematters/Rematters-Webviewer) |

## Add this repository in Home Assistant

**Settings → Apps → Install app → Repositories**

```text
https://github.com/Rematters/Rematters-HA
```

Then go to **Settings → Apps**, install **Rematters**, start it, and open **Open Web UI** (Ingress).

## Repository layout

```text
Rematters-HA/                 ← this repo (HA Apps repository root)
├── repository.yaml
└── rematters/                ← add-on (slug: rematters)
    ├── icon.png              ← add-on store icon (512×512)
    ├── logo.png              ← add-on logo (128×128)
    ├── logo.svg
    ├── config.yaml
    └── …
```

## Documentation

- [DOCS.md](rematters/DOCS.md): OAuth, JSON schema, API
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
