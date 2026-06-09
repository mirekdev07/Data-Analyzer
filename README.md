# Data Analyzer

Drop a **CSV / JSON / Excel** file in the browser and instantly get per-column statistics, distribution charts, and a data preview. No database, no signup — datasets live in-memory for 1 hour and are auto-cleaned.

**Live demo:** https://mirekdev.pl/analyzer/

![Python](https://img.shields.io/badge/Python-3.12-3776ab?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)
![pandas](https://img.shields.io/badge/pandas-2.2-150458?logo=pandas)
![React](https://img.shields.io/badge/React-18-61dafb?logo=react)
![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite)
![Recharts](https://img.shields.io/badge/Recharts-2.13-22b5bf)
![License](https://img.shields.io/badge/License-MIT-green)

---

## What it does

Upload a tabular dataset and the app:

1. **Parses** it (CSV / JSON / XLSX — auto-detects format and encoding)
2. **Detects column types** (numeric, categorical, datetime, boolean, text)
3. **Computes statistics** per column (min/max/mean/median/std for numerics; cardinality, top values, null %, etc.)
4. **Renders distribution charts** (histograms for numerics, bar charts for categoricals)
5. **Shows a preview** of the first N rows with smart formatting

All in one page. No backend storage beyond the 1-hour TTL — privacy by design.

---

## Architecture

| Layer | Tech | Purpose |
| --- | --- | --- |
| Frontend | React 18 + Vite + Recharts | UI, drag & drop, charts |
| Backend | Python 3.12 + FastAPI + Uvicorn | API, file parsing |
| Data analysis | pandas + numpy + openpyxl | Type detection, statistics |
| Reverse proxy | Nginx | Routes `/analyzer/` (static) and `/analyzer/api/` (proxy) |
| HTTPS | Certbot (Let's Encrypt) | Free SSL |
| Process supervisor | systemd | Keep Uvicorn alive |

**No database.** Datasets are kept in-process in a TTL store (default 1h). Old datasets are garbage-collected by a background cleanup task.

---

## Repository structure

```
analyzer/
├── README.md             # You are here
├── LICENSE               # MIT
├── analyzer.md           # Original design doc / architecture notes
├── DataAnalyzer.jsx      # Early monolithic component (kept for reference)
│
├── data-analyzer/        # The actual application
│   ├── backend/          # FastAPI app
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── config.py
│   │   │   ├── routers/        # upload, analysis
│   │   │   └── services/       # parser, stats, insights, preview, store, types
│   │   ├── requirements.txt
│   │   └── .env.example
│   ├── frontend/         # Vite + React app
│   │   └── src/
│   │       ├── App.jsx
│   │       ├── api.js
│   │       ├── components/     # Dropzone, ColumnGrid, ColumnCard, MiniChart, Summary, ...
│   │       └── styles/
│   ├── deploy/           # Nginx, PM2, deploy scripts
│   │   ├── deploy.ps1
│   │   ├── ecosystem.config.cjs
│   │   ├── nginx-snippet.conf
│   │   └── README.md
│   └── README.md         # Sub-project README
│
└── examples/             # Sample datasets to try the app
    ├── aktywnosc_fitness.csv    # Fitness activity (Polish headers)
    ├── filmy.xlsx               # Movies
    ├── pomiary_sensory.json     # Sensor readings
    ├── pracownicy.xlsx          # Employees
    ├── wydatki_domowe.csv       # Household expenses
    └── zamowienia.json          # Orders
```

---

## Quick start (local dev)

### Backend

```powershell
cd data-analyzer/backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8101
```

Backend runs at `http://127.0.0.1:8101`. Docs (Swagger UI) at `http://127.0.0.1:8101/docs`.

### Frontend

```bash
cd data-analyzer/frontend
npm install
npm run dev
```

Frontend runs at `http://127.0.0.1:5173`. It hits the backend at `/analyzer/api/...` (rewritten by Vite proxy in dev, by Nginx in prod).

### Try it

Drag any file from `examples/` into the browser. You should see column stats and charts within a second.

---

## Configuration

All backend config is via environment variables — defaults shown:

| Variable | Default | Purpose |
| --- | --- | --- |
| `ANALYZER_UPLOAD_DIR` | `./.local-uploads` | Where uploaded files are temporarily stored on disk |
| `ANALYZER_DATASET_TTL_SECONDS` | `3600` | How long a parsed dataset stays in memory (1h) |
| `ANALYZER_CLEANUP_INTERVAL_SECONDS` | `300` | How often the background cleanup task runs (5 min) |
| `ANALYZER_MAX_UPLOAD_BYTES` | `104857600` | Max upload size (100 MB) |
| `ANALYZER_PREVIEW_DEFAULT_ROWS` | `50` | Rows shown in the data preview |

Copy `.env.example` to `.env` and tweak as needed.

---

## API

The backend exposes a small REST API. Mounted under `/analyzer/api/` in production, plain `/` in dev.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/upload` | Upload a file, returns a `dataset_id` |
| `GET`  | `/datasets/{id}/analysis` | Full per-column stats, charts data, insights |
| `GET`  | `/datasets/{id}/preview?rows=N` | First N rows |

See FastAPI's auto-generated docs at `/docs` for full schemas.

---

## Deploy to production

The `data-analyzer/deploy/` folder contains everything you need to deploy alongside other projects on a single Nginx vhost (e.g., `mirekdev.pl`):

- `deploy.ps1` — PowerShell script that builds and uploads the tarball
- `ecosystem.config.cjs` — PM2 process config (alternative to systemd)
- `nginx-snippet.conf` — drop-in Nginx location blocks for `/analyzer/` and `/analyzer/api/`
- `deploy/README.md` — step-by-step deployment guide

Quick summary:

1. Build the frontend: `npm run build` in `data-analyzer/frontend/` → `dist/`
2. Copy `dist/` and `backend/` to the server
3. Set up a Python venv on the server, install `requirements.txt`
4. Run Uvicorn under systemd or PM2 on `127.0.0.1:8101`
5. Add the three `location` blocks from `nginx-snippet.conf` to your vhost
6. `nginx -s reload`

---

## Roadmap / ideas

- [ ] Persistent storage with optional account system (currently no DB)
- [ ] Export computed stats as PDF / Excel report
- [ ] More chart types (scatter, box plot, time series)
- [ ] Compare two datasets side-by-side
- [ ] Plugin system for custom analyses
- [ ] Docker + docker-compose for one-command local startup

---

## License

**MIT** — see [LICENSE](./LICENSE). Free to use, modify, and distribute, including commercially.
