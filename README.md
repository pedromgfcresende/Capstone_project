# XAnge Market Intelligence Platform

Monorepo. See `CLAUDE.md` for the project source-of-truth and `BUILD_PLAN.md`
for the sequenced plan.

```
frontend/   React 19 + Vite + Tailwind v4 (the UI)
backend/    FastAPI + Postgres + (LangChain, from Week 2) — the API & data layer
```

## Running locally

Prerequisites: Docker, `uv`, Node 20+.

### 1. Backend (Postgres + API)

```bash
cd backend
cp .env.example .env                 # defaults work out of the box
docker compose up -d                 # Postgres on localhost:5544
uv sync                              # install Python deps (Python 3.12)
uv run alembic upgrade head          # create tables
uv run python -m scripts.seed        # load the 3 real CRM CSVs (+ demo workspace if present)
uv run uvicorn app.main:app --reload --port 8000
```

API at http://localhost:8000 — docs at http://localhost:8000/docs.

To seed the demo competitor workspace from the transcribed screenshot:

```bash
uv run python -m scripts.make_demo_csv      # writes scripts/demo_competitor.csv
# then either re-run the seed, or upload via the API:
curl -X POST http://localhost:8000/api/uploads/competitor \
  -F "file=@scripts/demo_competitor.csv" \
  -F "title=AI Agents for Financial Services" \
  -F "sector_label=AI in Financial Services"
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173 (proxies /api -> :8000)
```

## Key endpoints (Week 1)

| Method | Path | Purpose |
|--------|------|---------|
| GET  | `/api/health` | liveness |
| GET  | `/api/sectors` | sector tree (workspaces + companies) |
| GET  | `/api/workspaces/{id}` | workspace detail |
| GET  | `/api/crm/companies?status=hot&q=...` | CRM pipeline (paginated, filtered) |
| POST | `/api/uploads/competitor` | CSV → new workspace |
| POST | `/api/uploads/crm` | CSV(s) → pipeline |

## LLM key (for synthesis)

Synthesis/Q&A use LangChain (provider-agnostic). In `backend/.env` set
`LLM_PROVIDER` (`anthropic`|`openai`) and the matching key
(`ANTHROPIC_API_KEY` / `OPENAI_API_KEY`). Restart the API after editing `.env`.

## Demo walkthrough (≈3 min)

1. **Home** — three actions: create workspace (CSV upload), browse pipeline, create sector.
2. **Upload** → "Create a new workspace" → title + sector + drag in
   `backend/scripts/demo_competitor.csv` → **Create**. Lands in the workspace.
3. **Workspace** → click **Synthesise** (top-right). The **AI Analysis** tab fills
   with summary, key insight, narrative, and verifiable **claims** — click the
   dots to mark claims verified / needs-verification (persists).
   - **Market Overview**: AI-estimated TAM/SAM/SOM, CAGR, tailwinds/headwinds, regulatory.
   - **Players / Comparative / Differentiation**: built from the uploaded companies.
   - **Sources**: the claims as a verifiable evidence register.
4. **Sector** (sidebar) → **Re-synthesise** for the sector "bet", watchlist and
   open questions; **Ask across segments** for grounded Q&A with citations; **Save**
   to persist analyst edits.
5. **Deal Pipeline** (sidebar / home) → browse the 825 CRM companies; filter by
   status (hot/pass/unknown), country, and search.

## Tests

```bash
cd backend && uv run pytest
```
