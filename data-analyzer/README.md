# Data Analyzer

Drop a CSV / JSON / Excel file in the browser and instantly see per-column statistics, charts, and a data preview. Deployed at https://mirekdev.pl/analyzer/.

## Architecture

- **Backend:** FastAPI + pandas on `127.0.0.1:8101`. Parses the file, detects column types, computes statistics. No database — datasets live in-process for 1 hour.
- **Frontend:** React + Vite + Recharts. Served as static files from Nginx.
- **Routing:** Nginx serves `/analyzer/` static files and proxies `/analyzer/api/` to the backend.

## Local development

### Backend

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8101
```

Swagger UI: http://localhost:8101/docs

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173/analyzer/. The Vite dev server proxies `/analyzer/api/*` to the backend.

## Deploy update

After backend or frontend changes:

```powershell
cd data-analyzer
.\deploy\deploy.ps1
```

The Nginx vhost edit is one-shot (Phase 3.4 of the plan) — not repeated.

## Documents

- Design spec: [docs/superpowers/specs/2026-05-29-data-analyzer-design.md](../docs/superpowers/specs/2026-05-29-data-analyzer-design.md)
- Implementation plan: [docs/superpowers/plans/2026-05-29-data-analyzer.md](../docs/superpowers/plans/2026-05-29-data-analyzer.md)
