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

Three-level hierarchy:

```
Sector  (a market vertical, e.g. "Embedded Finance")
└── Workspace  (one competitive analysis / "segment" — created from a competitor-analysis CSV)
    └── Company  (a player in that landscape)

CRM / Pipeline  (separate, cross-cutting view of XAnge's whole deal-flow)
```

- A **Sector** groups workspaces and carries an AI-synthesised "through-line".
- A **Workspace** is one competitive landscape. **In v1, one competitor-analysis
  CSV upload creates one workspace.**
- A **Company** is a row in that competitive analysis.
- The **CRM / Pipeline** view is a separate browse-and-filter surface over
  XAnge's Affinity export (~20k companies in prod). **In v1 it is NOT joined to
  the competitor data** — it stands alone.

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

These map directly onto the existing frontend `company` shape (see
`src/data/mockData.js`). **Structure varies between analyses** (manual
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
| `src/components/SectorCanvas.jsx` | Largest component (~690 lines). Cross-workspace synthesis: aggregated stats, editable Sector Thesis, watchlist, open questions, signals timeline, "Ask across segments" Q&A. **AI parts are mocked** (`SECTOR_SYNTHESIS`, `MOCK_RESPONSES`). |
| `src/components/SeedScreen.jsx` | Workspace seed form (description, thesis, companies, file upload). **Will become the CSV-upload entry point.** |
| `src/components/GeneratingState.jsx` | Fake "AI generating" animation (setTimeout step walker). |
| `src/components/WorkspaceView.jsx` | Tab shell: Overview, Players, Comparative, Differentiation, Summary, Sources. |
| `src/components/tabs/*` | Per-tab content. `CommentaryTab.jsx` is a **stub, not wired in**. |
| `src/components/CompanyProfile.jsx` | Relationship modal (contacts, meetings, funding, team, metrics). **Contacts/meeting-notes are dropped in v1** (see §6). |
| `src/components/VerifyDot.jsx` | Shared 3-state claim verification primitive: AI-generated → human-verified → needs-verification. The product's trust spine. |
| `src/data/*` | `mockData`, `companyProfiles`, `segmentOverview`, `segmentSources` — the entire current "database". **To be replaced by API/DB-driven data.** |

`main.py` / `pyproject.toml` / `uv.lock` at the repo root are vestigial — they
become (or are superseded by) the FastAPI backend.

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
├── CLAUDE.md            ← this file
├── BUILD_PLAN.md        ← sequenced build plan
├── frontend/            ← existing React app (moved from root)
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

- Frontend: core flow built and working, **in-memory only**, all AI faked, mock
  data only. Known gaps: no persistence, `CommentaryTab` stub unwired, sidebar
  company click hits a placeholder, IDs are `Date.now()`-based.
- Backend: **not started** (this plan covers it).
- Data: 3 CRM CSVs available; competitor-analysis CSV not yet exported (build
  ingestion against the known columns; absorb the real file when it arrives).

See `BUILD_PLAN.md` for the sequenced plan.
