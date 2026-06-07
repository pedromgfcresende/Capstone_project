# BUILD_PLAN.md — XAnge Market Intelligence Platform

Sequenced plan to take the project from "in-memory React prototype" to a working
end-to-end demo (FastAPI + Postgres + LangChain), in ~4 weeks. Read `CLAUDE.md`
first for context and decisions.

**Guiding principle:** thin vertical slices. Get one path working end-to-end
(upload CSV → DB → API → screen) before broadening. Bias to demo-readiness.

---

## 0. Architecture at a glance

```
                        ┌─────────────────────────────┐
  Competitor CSV ──────▶│  Ingestion (fixed core +     │
  CRM CSVs       ──────▶│  flexible extras → JSONB)    │
                        └──────────────┬──────────────┘
                                       ▼
                        ┌─────────────────────────────┐
                        │  PostgreSQL                  │
                        │  sectors / workspaces /      │
                        │  companies / synthesis /     │
                        │  verifications / crm_companies│
                        └──────────────┬──────────────┘
                                       ▼
        ┌──────────────────────────────────────────────────┐
        │  FastAPI                                            │
        │  CRUD + uploads + synthesis + Q&A + verification    │
        │            │                                        │
        │            ▼                                        │
        │  LangChain (provider-abstracted)                    │
        │  workspace synthesis · sector synthesis · Q&A       │
        └──────────────────────────┬─────────────────────────┘
                                    ▼
        ┌──────────────────────────────────────────────────┐
        │  React (App.jsx as API client)                     │
        │  Landing · SectorCanvas · WorkspaceView ·          │
        │  CSV-upload flow · CRM/Pipeline view · VerifyDot    │
        └──────────────────────────────────────────────────┘
```

---

## 1. Data model (Postgres)

Every table has `id` (uuid), `created_at`, `updated_at`, and where noted an
`extra JSONB` for unmapped CSV columns.

### Competitive-intelligence side

**`sectors`**
`id`, `label`, `synthesis_headline` (nullable), `synthesis_body` (nullable).

**`workspaces`**
`id`, `sector_id` (FK), `title`, `focal_company` (nullable), `thesis` (nullable),
`summary` (nullable), `key_insight` (nullable), `status`
(`draft` | `synthesizing` | `ready`), `source_upload_id` (FK, nullable).

**`companies`** (from competitor analysis; core + extras)
`id`, `workspace_id` (FK), `name`, `founded` (nullable), `geography`/`hq`,
`funding_status`, `funding_amount`, `top_investors`, `description`, `segment`,
`primary_customer`, `notes`, `competitive_potential` (int tier → priority),
`focal` (bool), `extra` (JSONB).

**`workspace_synthesis`** (AI narrative per tab; one row per workspace)
`id`, `workspace_id` (FK, unique), `overview` (JSONB), `comparative` (JSONB),
`differentiation` (JSONB), `summary` (JSONB), `commentary` (JSONB),
`sources` (JSONB), `model` (text), `generated_at`.
> Storing tab content as JSONB sections keeps it flexible while the exact tab
> shapes settle. Each section embeds its claims so they can be verified.

**`verifications`** (the VerifyDot trust model, persisted)
`id`, `entity_type` (`company` | `workspace_synthesis` | `sector` | `signal`),
`entity_id`, `claim_key` (text), `status` (`ai` | `verified` | `needs`),
`verified_by` (nullable), `verified_at`. Unique on
(`entity_type`, `entity_id`, `claim_key`).

### CRM / pipeline side (separate, not joined in v1)

**`crm_companies`** (core + extras)
`id`, `affinity_row_id`, `organization_id`, `name`, `website`,
`lead_status` (`hot` | `pass` | `unknown`), `affinity_status` (Outreach/Closed/…),
`owner`, `tag`, `investors`, `investment_stage`, `country`, `industry_xange`,
`description`, `year_founded`, `total_funding_usd`, `total_funding_eur`,
`linkedin_url`, `dealroom_url`, `last_email`, `last_meeting`, `next_meeting`,
`employees_current`, `extra` (JSONB).

### Shared

**`uploads`** (ingestion audit)
`id`, `kind` (`competitor` | `crm`), `filename`, `row_count`, `status`
(`pending` | `done` | `failed`), `error` (nullable), `workspace_id` (nullable).

---

## 2. API surface (FastAPI)

```
# Sectors
GET    /api/sectors                      list (with workspace counts)
POST   /api/sectors                      create
GET    /api/sectors/{id}                 detail (workspaces + aggregates)
POST   /api/sectors/{id}/synthesize      (re)generate sector synthesis [LangChain]
POST   /api/sectors/{id}/ask             cross-segment Q&A [LangChain]

# Workspaces
GET    /api/workspaces/{id}              detail (companies + synthesis)
POST   /api/workspaces                   create empty (title, sector_id)
POST   /api/workspaces/{id}/synthesize   (re)generate tab narrative [LangChain]

# Companies
GET    /api/workspaces/{id}/companies    list
PATCH  /api/companies/{id}               edit (analyst overrides)

# Uploads / ingestion
POST   /api/uploads/competitor           multipart CSV → creates a workspace
POST   /api/uploads/crm                  multipart CSV(s) → ingest pipeline

# CRM / pipeline
GET    /api/crm/companies                paginated + filters (status, country, tag, q)
GET    /api/crm/companies/{id}           detail

# Verification
PATCH  /api/verifications                upsert {entity_type, entity_id, claim_key, status}
```

All responses Pydantic-typed. CORS open to the Vite dev origin.

---

## 3. Ingestion layer (`services/ingestion/`)

**Shared helper — fixed core + flexible extras:** given a row dict and a mapping
of `{csv_column → model_field}`, split into typed core fields and an `extra`
dict of everything unmapped (drop the all-empty `CB ... Not available` columns).

**`competitor_csv.py`**
- Parse the upload. Map known columns (§4a of CLAUDE.md) → `companies` fields.
- `Competitive Potential` → `competitive_potential` (int). Mark the focal
  company (first row / explicit flag — confirm rule with the actual CSV).
- Create a `workspace` (title from filename or a provided title) + its companies
  in one transaction; record an `uploads` row.
- Tolerate missing/extra columns (varied analyses).

**`crm_csv.py`**
- Accept the 3 lead files (or one combined). Tag each with `lead_status`
  (hot/pass/unknown), concat, dedupe on `organization_id`.
- Coerce types (funding amounts → numeric, dates → date, employee bands kept as
  text). Map core columns; everything else → `extra`.
- Upsert into `crm_companies`.

Write small unit tests with a few fixture rows (no network).

---

## 4. LangChain synthesis layer (`services/synthesis/`)

Use the **`langchain` skill** when implementing. Provider-abstracted via
`init_chat_model` so the model can be swapped by env var. Use
`with_structured_output(PydanticModel)` so chains return typed objects, not free
text. Each generated claim gets a stable `claim_key` so verification can attach.

Chains:
1. **Workspace synthesis** — input: the workspace's structured companies +
   optional analyst thesis. Output: `summary`, `key_insight`, and the per-tab
   sections (overview / comparative / differentiation vs focal / summary /
   commentary). Persist to `workspace_synthesis`; flip workspace `status` →
   `ready`.
2. **Sector synthesis** — input: the sector's workspace summaries/insights.
   Output: headline "bet" + supporting body (+ maturity read). Persist to
   `sectors`.
3. **Cross-segment Q&A** — input: question + sector's structured context.
   Output: answer + citations (which workspaces). (Replaces SectorCanvas
   `MOCK_RESPONSES`.)

Keep prompts in `prompts.py`. Cache nothing fancy in v1; synthesis runs on
demand (upload or "Re-synthesise" button).

---

## 5. Frontend refactor (React → API client)

1. **API client** (`src/api/`) — thin `fetch` wrappers per resource. (Optional:
   a tiny `useResource` hook; avoid heavy data libs given the timeline.)
2. **`App.jsx`** — load sectors/workspaces/companies from the API; remove the
   `initialSectors` import. `workspaceStates` maps to server `status`
   (`draft`→seed, `synthesizing`→generating, `ready`→view).
3. **`SeedScreen.jsx`** → **CSV-upload entry point**: upload a competitor CSV
   (+ optional thesis) → `POST /uploads/competitor` → poll/refresh until the
   workspace is `ready`. Keep `GeneratingState` as the loading view during
   real synthesis.
4. **New CRM / Pipeline view** + a sidebar/landing entry — table over
   `GET /crm/companies` with status/country/tag filters and search. (This UI
   does not exist yet.)
5. **VerifyDot** — persist via `PATCH /verifications` instead of local
   `useVerifyMap` state (keep the hook, back it with the API).
6. **Cut for v1:** `CompanyProfile` contacts + meeting-notes sections; the
   `src/data/*` mock files; the `CommentaryTab` stub (wire it in only if the
   synthesis produces commentary).

---

## 6. Sequenced milestones (~4 weeks)

### Week 1 — Foundation & read path
- [ ] Monorepo: move frontend → `frontend/`, scaffold `backend/`.
- [ ] `docker-compose.yml` with Postgres; settings/config; `.env.example`.
- [ ] SQLAlchemy models + first Alembic migration (all tables in §1).
- [ ] CRM ingestion (`/uploads/crm`) working against the 3 real CSVs.
- [ ] Competitor ingestion (`/uploads/competitor`) against the screenshot columns.
- [ ] Read endpoints: sectors, workspace detail, companies, crm list.
- [ ] Frontend: API client; `App.jsx` reads sectors/workspaces/companies from API.
- **Demo:** real CRM + a seeded competitor workspace render from the database.

### Week 2 — Workspace creation + workspace synthesis
- [ ] CSV-upload flow replaces `SeedScreen` free-text; creates a workspace.
- [ ] LangChain **workspace synthesis** chain → persists tab narrative.
- [ ] `WorkspaceView` tabs read synthesis from the API.
- [ ] Verification persisted (`PATCH /verifications`), wired into VerifyDot.
- **Demo:** upload a competitor CSV → AI-generated workspace with verifiable claims.

### Week 3 — Sector synthesis, Q&A, CRM view
- [ ] LangChain **sector synthesis** + **cross-segment Q&A** (replace mocks in
      `SectorCanvas`).
- [ ] **CRM / Pipeline view** with filters + search.
- [ ] Editable synthesis (analyst overrides) persisted via `PATCH`.
- [ ] (Stretch) web-scraping augmentation on a company/workspace.
- **Demo:** full Sector → Workspace → Company flow + standalone pipeline browser.

### Week 4 — Cleanup, hardening, demo polish
- [ ] Remove all mock data + dead code (`src/data/*`, dropped `CompanyProfile`
      sections, unused stubs).
- [ ] Error/loading/empty states across upload + synthesis.
- [ ] End-to-end pass with real CSVs; seed script for a clean demo dataset.
- [ ] README + run instructions (Docker up, migrate, seed, dev servers).
- **Demo:** rehearsed end-to-end walkthrough.

---

## 7. Open items / things to confirm
- **The real competitor-analysis CSV** (only a screenshot exists). Build against
  known columns; absorb the file when exported. Confirm the **focal-company
  rule** (how is the focal player marked?).
- LLM provider + API key/budget for LangChain.
- Whether `Investment Stage` (≈80% NaN in CRM) is worth surfacing — flagged for
  XAnge ("speak with Jennie").
- Web-scraping scope/targets if pulled into v1.
- Deployment: local-only for the demo, or hosted? (Currently assumed local.)

---

## 8. Risks & mitigations
- **CSV variability** → fixed core + JSONB extras; defensive parsing; ingestion tests.
- **LLM latency/cost on synthesis** → on-demand only; structured outputs; small models where adequate.
- **Timeline** → strict vertical slices; stretch items (scraping, CRM↔competitor join, rich CompanyProfile) explicitly deferred.
- **Frontend churn from API migration** → keep `App.jsx` as orchestrator; migrate read path first, write/synthesis second.
