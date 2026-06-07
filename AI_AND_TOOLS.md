# AI & Tooling — XAnge Market Intelligence Platform

A single synthesis of **everything the app does** — the AI embedded in it, the
external tools it calls, and the services that move data from a CSV to a
verified competitive landscape. Companion to the system diagram
(`architecture.png`) and the data schema (`data_schema.png`).

> **One-line thesis.** AI produces a first-pass competitive scaffold; analysts
> **interrogate, correct, and verify** it. Every AI-surfaced claim carries a
> verification state — the human-in-the-loop trust model is the product's spine,
> not a decoration.

---

## 1. The shape of the system

```
React SPA  →  FastAPI (uvicorn :8000)  →  PostgreSQL 17 (:5544)
                     │
                     ├─ Ingestion       (pandas CSV → core + JSONB extras)
                     ├─ Synthesis       (LangChain → LLM, structured output)
                     ├─ AI enrichment   (LLM + Tavily + trafilatura/Playwright)
                     └─ Verification     (VerifyDot trust state)

External: Anthropic / OpenAI (LLM) · Tavily (search) · target websites (scrape)
```

See `architecture.png` for the full nested-container view.

---

## 2. The AI layer

All AI runs through **LangChain**, deliberately **provider-abstracted** so the
LLM vendor is a config switch, not a code change.

### 2.1 Model selection (provider-agnostic)

`backend/app/config.py` resolves which model every chain uses:

| Setting | Default | Notes |
|---|---|---|
| `llm_provider` | `anthropic` | `anthropic` or `openai` |
| `resolved_model` | `claude-sonnet-4-5` (Anthropic) / `gpt-4o-mini` (OpenAI) | `llm_model` overrides |
| keys | `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | in `backend/.env` |

Every chain is built with `init_chat_model(resolved_model, model_provider=…)`
and forced into a typed shape with **`.with_structured_output(PydanticModel)`** —
so the model returns validated objects, never free text the app has to parse.

### 2.2 Synthesis chains — the narrative layer

`backend/app/services/synthesis/chains.py`. Three chains, all structured:

**a) Segment synthesis** — `synthesize_segment(...)`
Turns a segment's company table into an analyst-ready brief. Returns a
`WorkspaceSynthesisResult`:
- `summary` (exec summary) · `key_insight` (single takeaway)
- `market_overview` + a full **market read** (`Market`): `tam / sam / som / cagr`,
  `adoption_stage` + evidence, and lists of `tailwinds`, `headwinds`,
  `why_now`, and `regulatory` items (region · date · impact)
- `comparative` (how players compare) · `differentiation` (focal vs. rivals) ·
  `commentary` (the so-what / investment angle)
- **`claims`: 4–8 verifiable factual statements**, each with a stable
  `snake_case` key — these become the rows the analyst verifies.
- temperature `0.3`.

**b) Sector synthesis** — `synthesize_sector(...)`
Aggregates all segments in a sector into a `SectorSynthesisResult`:
`headline` (the bet) · `body` · `watchlist` (3–6 companies to track) ·
`open_questions` (3–5).

**c) Cross-segment Q&A** — `ask_sector(...)`
Powers the “Ask across segments” box. Returns a `QAResult`: a grounded
`answer` plus `citations` (which segment titles it relied on). temperature `0.2`.

### 2.3 AI enrichment — web research that finds competitors NOT in the CRM (M2)

`backend/app/services/research/enrich.py`. A **multi-step LangChain pipeline**
(not a one-shot prompt). Every output carries source URLs + a confidence score,
so the analyst can verify provenance:

| # | Step | Tool | What it does |
|---|---|---|---|
| 1 | **Plan queries** | LLM (`SYS_PLAN`) | 3–4 high-signal web search queries (capped at `MAX_QUERIES=4`) |
| 2 | **Search** | **Tavily** | runs each query, dedupes results by URL |
| 3 | **Extract candidates** | LLM (`SYS_EXTRACT`) | pulls named, real competitor companies; excludes the focal company and any “already known” names |
| 4 | **Fetch pages** | **trafilatura → Playwright** | scrapes up to `MAX_CANDIDATES_TO_FETCH=6` candidate sites to verify/enrich |
| 5 | **Finalize** | LLM (`SYS_FINAL`) | clean `Competitor` records (description, founded, funding) + `confidence` (0–1) + `sources[]`; explicitly told **not to invent facts** |
| 6 | **Persist** | `persist.py` | creates `origin='ai'` companies, name-matches the CRM (`crm_company_id`), links each to a segment |

**Company-first flow** — `suggest_sector_segment(...)`: given a CRM company, an
LLM proposes the market **sector + segment** it belongs to; the analyse endpoint
then creates them (CRM company as focal) and runs the enrichment pipeline above.

Each run is logged to the **`ai_enrichment`** table (`query_plan`, `result`,
`status`, `model`). Enrichment is **best-effort** — web/search failures never
raise; they degrade to fewer results.

---

## 3. External tools the AI uses

| Tool | Where | Role |
|---|---|---|
| **Anthropic Claude / OpenAI** | all chains via LangChain | every piece of reasoning: synthesis, Q&A, query-planning, extraction, finalization |
| **Tavily** (`web.py:web_search`) | enrichment step 2 | LLM-grounded web search; returns clean content snippets (`TAVILY_API_KEY`) |
| **trafilatura** (`web.py:fetch_page`) | enrichment step 4 | fast static HTML→text extraction (first attempt) |
| **Playwright** (headless Chromium) | enrichment step 4 fallback | renders JS-heavy / anti-bot pages when static fetch is too thin (`playwright install chromium` once) |

`fetch_page` returns the `method` used (`static` / `playwright` / `failed`) so the
pipeline records how each fact was obtained.

---

## 4. Ingestion tools

`backend/app/services/ingestion/`. The rule everywhere: **fixed core schema +
flexible extras** — known columns map to typed fields, everything else lands in a
JSONB `extra` column (`common.py` helpers: `clean`, `build_extra`,
`is_droppable_column`).

- **`competitor_csv.py`** — a competitor-analysis CSV **builds/extends a Sector**.
  The **Segment column is parsed as a list** (split on `;`, `|`, newline — *not*
  `/`) → one company row linked to N segments via `company_segments`. Companies
  are deduped by name within the sector; the focal company is the untiered row.
- **`crm_csv.py`** — ingests XAnge's Affinity export (the 3 files concatenated
  with a `hot` / `pass` / `unknown` status). ~90 sparse columns → typed core +
  `extra` JSONB. 825 rows seeded in the demo.

---

## 5. Verification — the trust spine

`backend/app/services/verification.py` + `VerifyDot` on the frontend.

Every surfaced claim has a 3-state status: **AI-generated → human-verified →
needs-verification**. State is **persisted** (not local) via
`PATCH /api/verifications`, keyed by `(entity_type, entity_id, claim_key)` and
stamped with `verified_by` + `verified_at`. This is what makes the platform a
*scaffold the team can trust*, not a black box.

---

## 6. Data tools & storage

- **PostgreSQL 17** (Docker, port **5544**), **SQLAlchemy 2.0** typed models,
  **Alembic** migrations.
- Tables (`backend/app/db/models.py`, rendered in `data_schema.png`):
  `sectors`, `segments`, `companies`, **`company_segments`** (the N:N join, carrying
  per-segment tier/focal/notes), `segment_synthesis` (1:1), `verifications`,
  `uploads`, `ai_enrichment`, and the separate `crm_companies` domain.
- The defining model choice: a **company is many-to-many with segments** — it can
  compete in several sub-markets, and its tier/focal/notes live on the join, not
  the company.

---

## 7. API surface (FastAPI, all under `/api`)

| Area | Endpoints |
|---|---|
| **Sectors** | `GET /sectors` · `GET /sectors/{id}` · `PATCH /sectors/{id}` · `POST /sectors/{id}/synthesize` · `POST /sectors/{id}/ask` |
| **Enrichment** | `POST /sectors/{id}/enrich` |
| **Segments** | `GET /segments/{id}` · `GET /segments/{id}/companies` · `PATCH /segments/{id}` · `POST /segments/{id}/synthesize` |
| **CRM / pipeline** | `GET /crm/companies` · `GET /crm/companies/{id}` · `GET /crm/facets` · `POST /crm/companies/{id}/analyse` |
| **Uploads** | `POST /uploads/competitor` · `POST /uploads/crm` |
| **Verification** | `PATCH /verifications` |
| **Health** | `GET /health` |

The `synthesize`, `ask`, `enrich`, and `analyse` endpoints are the AI-backed ones.

---

## 8. Frontend surfaces (React 19 + Vite + Tailwind v4)

`recharts` (charts), `lucide-react` (icons), editorial design system
(Fraunces / Inter / JetBrains Mono, warm paper + orange `#e85d3b`).

- **Sidebar** nav tree · **LandingPage** (search + create/import) ·
  **SectorCanvas** (Company × Segment matrix, editable thesis, watchlist, open
  questions, “Ask across segments”, **“Find competitors”** enrichment panel) ·
  **Segment view** tabs: *AI Analysis · Market Overview · Players · Comparative ·
  Differentiation · Sources* · **CrmView** pipeline (filters/search/pagination,
  per-row **“Analyse”**) · **VerifyDot** everywhere a claim appears.

---

## 9. Configuration & run

| Key | File | For |
|---|---|---|
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | `backend/.env` | the LLM |
| `TAVILY_API_KEY` | `backend/.env` | web search (enrichment) |
| `DATABASE_URL` | `backend/.env` | Postgres (`:5544`) |
| Playwright Chromium | one-time `playwright install chromium` | scrape fallback |

Run steps live in `README.md`; the build sequence in `BUILD_PLAN.md`; the
authoritative spec in `CLAUDE.md`.

---

## 10. Tool inventory at a glance

| Capability | Powered by | Output / artifact |
|---|---|---|
| Segment brief (market read, claims) | LangChain → Claude/OpenAI | `segment_synthesis` row |
| Sector thesis (headline, watchlist) | LangChain → Claude/OpenAI | `sectors.synthesis_*` |
| Cross-segment Q&A | LangChain → Claude/OpenAI | answer + citations |
| Competitor discovery (non-CRM) | LLM + Tavily + trafilatura/Playwright | `origin='ai'` companies + `ai_enrichment` log |
| Company-first placement | LLM | suggested sector + segment |
| CSV → competitive landscape | pandas + core/extras ingestion | sectors/segments/companies |
| CRM pipeline | pandas ingestion + facets API | `crm_companies` browse view |
| Claim verification | VerifyDot + verifications API | persisted trust state |

---

*Generated from a review of the M1/M2 codebase (2026-06-07). Regenerate the
diagram with `python3 backend/scripts/make_architecture_png.py`.*
