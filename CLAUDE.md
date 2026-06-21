# CLAUDE.md — XAnge Market Intelligence Platform

Single source of truth for this project. Read this before writing any code.

---

## 1. What this is

XAnge's **internal Market Intelligence Platform** — a tool for the VC investment
team to map competitive landscapes, track players, and synthesise market signals
in one place.

**Core thesis:** AI produces a first-pass competitive scaffold (player tables,
positioning, commentary, differentiation, sector synthesis). Analysts then
**interrogate, correct, and verify** it. It is *not* a replacement for analyst
judgment — it is a scaffold the team can build on. The human-in-the-loop trust
model (every surfaced claim carries a verification state) is central, not
decorative.

**Context:** ESADE MiBA Capstone Project, built as a real tool for XAnge (a
French/European VC). Timeline is tight (~1 month to demo) — **bias toward a
working end-to-end demo over completeness.**

> ⚠️ **Not the Momentum Engine.** An earlier solution (a "Momentum Engine"
> prediction/scoring model, in the sibling repo `Capstone-Project_ESADE_x_XAnge`)
> was **abandoned**. Do not reuse its architecture. Only its CSV data files are
> relevant to this project.

---

## 2. Product structure

Hierarchy (**M1 model** — "Workspace" was renamed to **Segment**, and companies
are **many-to-many** with segments):

```
Sector  (a market vertical — built by importing a competitor-analysis CSV)
├── Segment  (a sub-market within the sector; derived from the CSV's Segment column)
│     └── (company_segments join)  ← a company can compete in SEVERAL segments
└── Company  (sector-scoped; per-segment tier/focal/notes live on the join)

CRM / Pipeline  (separate, cross-cutting view of XAnge's whole deal-flow)
```

- A **Sector** is created by **importing a competitor CSV** at the sector level;
  its **Segments are derived from the CSV's (list-valued) Segment column**. It
  carries an AI-synthesised "through-line" + watchlist + open questions.
- A **Segment** is one competitive sub-landscape (1:1 `segment_synthesis`).
- A **Company** is sector-scoped and linked to one or more segments via
  **`company_segments`** (per-segment `competitive_potential` / `focal` / `notes`).
- The **CRM / Pipeline** view is a separate browse-and-filter surface over
  XAnge's Affinity export. **Not joined** to the competitor data in v1 (AI-
  enrichment matching via `companies.crm_company_id` / `origin` arrives in **M2**).

---

## 3. Tech stack

| Layer        | Choice                                                             |
|--------------|-------------------------------------------------------------------|
| Frontend     | React 19 + Vite + Tailwind v4 (CSS-first `@theme`) + recharts + lucide-react |
| Backend      | Python 3.14 + **FastAPI**                                          |
| Database     | **PostgreSQL** (local, via Docker)                                 |
| ORM / migr.  | SQLAlchemy 2.x + Alembic                                           |
| AI layer     | **LangChain** (provider-abstracted) — synthesis, commentary, Q&A  |
| Auth         | **None in v1** (single shared environment)                        |
| Data sources | Two CSV uploads (CRM export + competitor analysis) + optional web-scraping augmentation |

When writing LangChain code, **use the `langchain` skill**.

---

## 4. Data sources

### 4a. Competitor analysis → Workspace
Manually-curated per market. Currently only exists as a spreadsheet/screenshot
(no CSV file yet). Known columns:

`Competitive Potential` (tier 1/2/3 → **priority**), `Name`, `Founded`, `HQ`
(→ geography), `Funding Status`, `Funding Amount`, `Top Investors`,
`Description`, `Segment`, `Primary Customer`, `Notes/Relevance`.

These map onto the `company` shape the backend serializes (see
`backend/app/api/serializers.py::company_link_out`). **Structure varies between
analyses** (manual
enrichment differs per market) → ingestion must be **fixed core schema +
flexible extras** (map known columns to typed fields, store unmapped columns in
a JSONB `extra` field).

### 4b. CRM export (Affinity) → Pipeline layer
Lives in the sibling repo at `../Capstone-Project_ESADE_x_XAnge/data/` as three
CSVs: `Hot Leads...`, `Pass Leads...`, `Unknown Leads...` (Feb-2026 export).
Concatenate them, adding a `status` column = `hot` / `pass` / `unknown`
(826 rows in the test sample; ~20k orgs / ~13k open in production).

~90 columns, Affinity + Dealroom-enriched + manual. Useful core columns:
`Organization Id`, `Name`, `Website`, `Owner` (e.g. `jennifer@xange.vc`),
`Status` (Outreach/Closed/Market Radar/Active Revisit), `Jenny Tag`
(High Prio/Top 100/SF), `Investors`, `Investment Stage`, `Location (Country)`,
`Industry XAnge`, `Description`, `Year Founded`, `Total Funding Amount (USD/EUR)`,
employee counts + growth, `LinkedIn URL`, `Dealroom.co URL`,
`Last/First/Next Meeting`, `Last Email`.

Caveats: very sparse (many columns >50% NaN); `CB ... Not available for export`
columns are 100% empty (Crunchbase data can't be exported from the CRM);
duplicate `.1`-suffixed columns come from Dealroom enrichment. Same **fixed core
+ flexible extras** approach applies.

---

## 5. Frontend architecture (as built today)

Editorial design system: Fraunces (serif), Inter (sans), JetBrains Mono (mono);
warm paper palette, orange accent `#e85d3b`. Theme tokens live in
`src/index.css` (`@theme`). **Match the existing visual language.**

| File | Role |
|------|------|
| `src/App.jsx` | State hub. Holds `sectors` (whole data tree), `selected` (routing by `.type`: sector/workspace/company), `workspaceStates` (seed→generating→ready machine). No router — conditional rendering. **State is in-memory only today.** |
| `src/components/Sidebar.jsx` | Collapsible nav tree; inline create via `useImperativeHandle`. |
| `src/components/LandingPage.jsx` | Home: global search + create actions + recent sectors. |
| `src/components/SectorCanvas.jsx` | Cross-segment view: aggregated stats, editable Sector Thesis, segment table, Company × Segment matrix, AI-discovered competitors, "Ask across segments" Q&A. **Real synthesis** (no mock). |
| `src/components/SeedScreen.jsx` | CSV-upload / sector-seed entry point (description, thesis, companies, file upload). |
| `src/components/WorkspaceView.jsx` | Tab shell: AI Analysis, Market Overview, Players, Differentiation, Sources. |
| `src/components/tabs/*` | Per-tab content: `OverviewTab`, `PlayersTab`, `DifferentiationTab`, `SourcesTab`. |
| `src/components/SynthesisPanel.jsx` | The "AI Analysis" tab body — renders the LangChain synthesis + persisted VerifyDots. |
| `src/components/CompanyProfile.jsx` | Company modal: editable+verifiable key facts, header (raised/round), and a Funding card (latest round + key investors), all from the real company record. **Contacts/meetings/team/metrics dropped in v1** (see §6). |
| `src/components/CrmView.jsx` | CRM / Pipeline browse-and-filter view over the Affinity export (filters, search, pagination, per-row Analyse). |
| `src/components/ConceptMemo.jsx` | Static product concept/how-it-works memo modal. |
| `src/components/XangeLogo.jsx` | XAnge brand mark (sidebar + landing lockups). |
| `src/components/VerifyDot.jsx` | Shared 3-state claim verification primitive: AI-generated → human-verified → needs-verification. The product's trust spine. |
| `src/data/*` | Only empty-shape helpers remain: `companyProfiles.js` (`getProfile` maps real company fields) and `segmentOverview.js` (`FALLBACK_OVERVIEW`). The app is otherwise API/DB-driven. |

---

## 6. Confirmed decisions (v1 scope)

1. **Backend-first.** Stand up persistence + API before more UI.
2. **Stack:** FastAPI + local Postgres, no auth.
3. **AI:** LangChain, provider-abstracted.
4. **Competitor CSV upload = one workspace.** Its `Segment` column = the
   within-workspace grouping; `Competitive Potential` = priority.
5. **CRM export = a separate pipeline view.** **Not joined** to competitor data
   in v1.
6. **Competitor ingestion = fixed core + flexible extras** (JSONB for unknowns).
7. **Drop contacts + meeting-notes for v1.** `CompanyProfile` shrinks to
   CRM-derived relationship fields; the rich contacts/meeting-notes UI is
   cut/deferred.
8. **Replace mock data entirely** once ingestion works.
9. **Web-scraping augmentation is a stretch goal**, not a v1 blocker.
10. **LangChain's v1 job is the narrative layer** (workspace synthesis,
    commentary, differentiation, sector synthesis, Q&A) over structured CSV
    data — not raw data ingestion.

---

## 7. Target repository structure

Monorepo. Move the current frontend into `frontend/`, add `backend/`:

```
Capstone_project/
├── CLAUDE.md            ← this file (project source-of-truth)
├── README.md            ← run / deploy / data-flow docs
├── architecture.png     ← system diagram (generated by backend/scripts/make_architecture_png.py)
├── data_schema.png      ← Postgres schema (generated by backend/scripts/make_schema_png.py)
├── frontend/            ← React app
│   ├── src/
│   ├── package.json
│   └── ...
└── backend/
    ├── app/
    │   ├── main.py            # FastAPI app
    │   ├── config.py          # settings (env)
    │   ├── db/                # session, Base, SQLAlchemy models
    │   ├── schemas/           # Pydantic request/response
    │   ├── api/routes/        # sectors, workspaces, companies, crm, uploads, synthesis
    │   ├── services/
    │   │   ├── ingestion/     # competitor_csv.py, crm_csv.py
    │   │   ├── synthesis/     # LangChain chains + prompts
    │   │   └── verification.py
    │   └── core/
    ├── alembic/               # migrations
    ├── tests/
    ├── docker-compose.yml     # postgres
    └── pyproject.toml
```

(If moving the frontend is too disruptive mid-stream, `backend/` may sit
alongside the existing root `src/` — but the monorepo layout above is preferred.)

---

## 8. Conventions

### Python / backend
- Python 3.11+ syntax, type hints on all signatures, PEP 8 via `ruff`.
- `snake_case` functions/vars, `PascalCase` classes.
- Pydantic for all API I/O; SQLAlchemy 2.0 typed models.
- Every domain table has typed **core** columns + an `extra: JSONB` column.
- `pytest`; mock external calls (LLM, scraping) in tests — never hit real APIs in CI.
- Secrets in `.env` (already gitignored) — never commit keys.

### Frontend
- Match the existing editorial design system and Tailwind token usage.
- Keep `App.jsx` as the orchestrator, but migrate it from data-owner to
  **API client** (data comes from the backend, not local `useState`).
- Persist verification state to the backend (don't keep it local).

### Git
- `main` is primary. Feature branches `feature/<desc>`. Commit the "why".
- Commit/push only when asked.

---

## 9. Current status

**Re-architecture M1 + M2 are built and verified live** (on top of the Weeks 1–4 base).

- **M1:** Workspace→Segment rename; Company↔Segment **many-to-many** (`company_segments`,
  per-segment tier/focal/notes); CSV import builds a **Sector** (segments derived from the
  list-valued Segment column); Company × Segment matrix in the Sector UI.
- **M2 — AI enrichment + web research:** a market-research pipeline finds competitors
  **not in the CRM**. Stack = LangChain agent (OpenAI) → **Tavily** search →
  **trafilatura → Playwright** page fetch → structured `Competitor` list with source
  provenance + confidence. Endpoints: `POST /sectors/{id}/enrich` (sector enrichment) and
  `POST /crm/companies/{id}/analyse` (**company-first**: AI suggests sector+segment, creates
  them with the CRM company as focal, then researches competitors). Discovered competitors
  are stored as `companies` with `origin='ai'`, name/domain-matched to the CRM
  (`crm_company_id`). New `ai_enrichment` table logs each run. Sector UI: "Find competitors"
  action, AI-discovered-competitors panel (sources + VerifyDot + in-CRM/net-new), and
  AI-found / in-CRM stats. CRM pipeline: per-row "Analyse" action. Keys: `TAVILY_API_KEY`
  in `backend/.env` (plus the LLM key); Playwright needs `playwright install chromium` once.

Weeks 1–4 base (still true):

- **Backend:** FastAPI + Postgres (Docker, port 5544), SQLAlchemy + Alembic.
  Ingestion (CRM + competitor, core+extras). Endpoints: sectors tree + detail +
  PATCH + synthesize + ask; workspaces detail + PATCH + synthesize; companies;
  CRM list + facets; uploads (competitor/crm); verifications PATCH.
  LangChain synthesis: workspace (summary, key insight, narrative, **market
  read** TAM/SAM/SOM/CAGR/signals/regulatory, verifiable claims), sector
  (headline, body, watchlist, open questions), cross-segment Q&A.
- **Frontend:** loads from the API (no mock tree). CSV-upload workspace creation;
  AI Analysis tab (synthesis + persisted VerifyDot); Overview tab (AI market
  read); Players/Differentiation (real company data); Sources (seeded from
  claims); SectorCanvas (real synthesis + Q&A + Save); CRM pipeline view
  (filters/search/pagination). Loading/empty/error states.
- **Data:** 825 CRM companies seeded; demo competitor workspace from the
  transcribed screenshot (`backend/scripts/demo_competitor.csv`).
- **No remaining mock data.** The old mock literals were stripped; `src/data/`
  now holds only empty-shape helpers (`segmentOverview.js`'s `FALLBACK_OVERVIEW`,
  `companyProfiles.js`'s `getProfile`, which maps the real company record). The
  CompanyProfile modal renders only backend-backed fields (key facts + funding /
  investors); contacts/meetings/team/metrics were dropped for v1.

See `README.md` for run, deploy, data-flow, and demo steps.
