# Xange - Tool Analysis

> Self-contained analysis of the XAnge Market Intelligence Platform. Written so a model with zero prior context can work from it alone. "XAnge" is the VC firm; "Xange tool" / "the platform" is the internal product described here.

## 1. Overview

- **What it is:** Xange is an internal Market Intelligence Platform for a venture-capital investment team. It lets analysts map competitive landscapes, track the players in a market, and synthesise market signals in one place. Its core idea is "AI produces a first-pass competitive scaffold (player tables, market sizing, commentary, differentiation, sector synthesis), and human analysts then interrogate, correct, and verify it." Every AI-surfaced claim carries a verification state, so the tool is explicitly a scaffold for analyst judgment, not a replacement for it.
- **Who it is built for:** The investment team at XAnge, a French/European VC firm. Persona = a VC analyst or investor who needs to get from "we should look at this market" to "I have a clear view of who is in it and what matters" quickly. It is a single shared internal environment (no user accounts or auth in v1).
- **Core problem it solves:** Competitive/market mapping is slow and manual. The tool compresses the time to build a structured competitive view of a market, links it to the firm's existing deal flow (CRM), and uses AI plus web research to surface competitors the firm has not yet tracked.
- **Category of tool:** Market intelligence / competitive landscape mapping, with an attached deal-sourcing and CRM-pipeline browsing layer and an AI research/enrichment engine. (Built as an ESADE MiBA Capstone project, intended as a real tool for XAnge.)

## 2. Architecture / High-Level Structure

### Top-level navigation / modules

- **Landing page (Home):** Entry screen. Global search, primary action buttons, recent sectors list.
- **Sidebar (persistent left nav):** Collapsible hierarchical tree: Sectors -> Segments (workspaces) -> Companies, plus a direct "Deal Pipeline" link and inline create actions.
- **Seed screen (New sector):** CSV-upload form that creates a Sector.
- **Sector Canvas (Sector view):** Cross-segment synthesis for one market vertical: aggregate stats, editable thesis, segment comparison table, company x segment matrix, AI-discovered competitors, signals timeline, and an "Ask across segments" Q&A box.
- **Workspace View (Segment view):** Tabbed deep-dive on one sub-market. Tabs: AI Analysis, Market Overview, Players, Differentiation, Sources.
- **CRM / Deal Pipeline view:** Browse-and-filter table over XAnge's Affinity CRM export, with a per-row "Analyse" action.
- **Company Profile modal:** Relationship view for a single company (contacts, meetings, funding, team, metrics) - largely stubbed/empty in v1.
- **Concept Memo modal:** Internal brief explaining what the platform is.

### How they relate (workflow / data hierarchy)

```
Sector  (a market vertical, created by importing a competitor-analysis CSV)
├── Segment  (a sub-market; derived from the CSV's list-valued "Segment" column)
│     └── (company_segments join) ← a company can compete in SEVERAL segments
└── Company  (sector-scoped; per-segment tier/focal/notes live on the join)

CRM / Deal Pipeline  (separate, cross-cutting browse view over the whole Affinity export)
```

- A **Sector** is created by uploading a competitor CSV. Its **Segments are derived from the CSV's Segment column** (list-valued, so one company maps to many segments).
- A **Segment** is one competitive sub-landscape with its own AI synthesis.
- A **Company** is sector-scoped and linked to one or more segments many-to-many, with per-segment tier (competitive potential), focal flag, and notes stored on the join.
- The **CRM / Deal Pipeline** is a separate surface over the Affinity export. It is NOT joined to the competitor data in v1, except that AI-discovered competitors get name/domain-matched back to CRM rows (`crm_company_id`).

### Typical user journey

1. Enter at Landing -> either upload a CSV (Seed screen) to create a Sector, or browse the Deal Pipeline, or open a recent sector.
2. CSV upload builds a Sector with Segments and Companies -> lands in Sector Canvas.
3. From Sector Canvas: read/edit the synthesis, run "Find competitors" (AI enrichment), drill into a Segment.
4. In Workspace (Segment) View: run "Synthesise" to generate the AI market read, then review Players, Differentiation, Sources tabs and verify claims.
5. Alternative entry: in the Deal Pipeline, click "Analyse" on a CRM company -> AI suggests a sector+segment, creates them with that company as focal, and researches competitors.

## 3. Element-by-Element Breakdown

> Organized by screen. Exact UI strings are quoted. Where intent is uncertain it is flagged.

### 3.1 Global chrome (App.jsx)

- **"Concept" button**
  - Location: fixed top-right of the app.
  - Purpose: opens the Concept Memo modal (internal brief).
  - Inputs: click. Outputs: toggles `conceptOpen`, shows ConceptMemo. Why it matters: onboarding / explains the tool. Dependencies: none.
- **Sidebar (collapsible)**
  - Location: left edge, 264px wide or 0px when collapsed (0.22s transition).
  - Purpose: primary navigation tree. Inputs: click items / collapse button. Outputs: sets `selected`, `sidebarOpen`. Dependencies: sectors loaded.
- **"Expand" button (PanelLeftOpen icon)**
  - Location: fixed top-left, shown only when sidebar is collapsed. Purpose: re-open sidebar. Inputs: click. Outputs: `sidebarOpen = true`.
- **Main content area**
  - Renders one view based on `selected.type`: `null`->LandingPage, `'newSector'`->SeedScreen, `'sector'`->SectorCanvas, `'workspace'`->WorkspaceView, `'crm'`->CrmView, `'company'`->placeholder text "Company view - coming next" (not implemented).
- **Loading spinner** ("Loading...") - shown while `getSectors()` runs on mount.
- **App error banner** - "Couldn't reach the API ({error}). Is the backend running on :8000?" - shown on Landing if the backend is unreachable.

### 3.2 Sidebar (Sidebar.jsx)

- **XangeLogo (clickable)** - top-left, 30px. Click -> `onHome()` -> Landing. Why: return home.
- **Collapse button (PanelLeftClose)** - hides the sidebar.
- **"Deal Pipeline" button** (Database icon) - jumps to CRM view (`onSelect({type:'crm'})`).
- **"SECTORS" label** - section title (display only).
- **"+ New sector" button (Plus icon)** - opens inline "Sector name..." input. Enter/blur commits, Escape cancels. Creates a sector client-side (no CSV).
- **Sector row (repeating):**
  - Chevron toggle - expand/collapse segments under the sector.
  - Sector name (clickable) - `onSelect({type:'sector', id})` -> Sector Canvas.
  - "+ Add workspace" button (hover-revealed Plus icon) - opens inline "Segment name..." input under the sector. Enter/blur commits, Escape cancels.
  - Active/hover background highlighting.
- **Segment (workspace) row (nested):**
  - Chevron toggle - expand/collapse companies.
  - Segment name (clickable) - `onSelect({type:'workspace', id, sectorId})` -> Workspace View.
  - "No segments yet" placeholder when a sector has none.
- **Company row (nested):** click -> `onSelect({type:'company', ...})` (company view not implemented). Shows a "focal" badge if `co.focal`.
- Note: Sidebar create actions are optimistic client-side state only (no API call).

### 3.3 Landing page (LandingPage.jsx)

- **XangeLogo** (40px) + heading "Where do you want to start?" + subheading "Map a new market or pick up where you left off."
- **Global search input** - placeholder cross-entity search. Filters sectors/workspaces/companies; dropdown shows up to 8 results.
  - Result row shows a type badge ('sector' | 'workspace' | 'company'), label, sublabel (parent/context), arrow icon. Click -> `onSelect()` navigates to that entity.
  - "No results for \"{query}\"" when empty.
- **Error banner** (conditional) - "Couldn't reach the API ({loadError}). Is the backend running on :8000?"
- **"Create a new sector" button** (dark, Upload icon) - subtitle "Import a competitor-analysis CSV - segments & companies are built from it." Click -> Seed screen. Primary entry point.
- **"Browse the deal pipeline" button** (bordered, Database icon) - click -> CRM view.
- **"Recent sectors" section** - "Recent sectors" label + one card per sector showing name and "{n} workspace(s) - updated {date}". Click -> Sector Canvas.

### 3.4 Seed screen / New sector (SeedScreen.jsx)

- **Back button (ArrowLeft)** - returns to Landing (if `onCancel` provided).
- **Labels:** "New sector" + heading "Import a competitive landscape" + explanation paragraph describing the CSV columns (Name, Founded, HQ, Funding, **Segment**, Notes...) and that the upload builds a **Sector** whose **segments are derived from the Segment column**.
- **Sector name field** - label "Sector name *" (required), placeholder "e.g. AI Agents for Financial Services". Input: text. Output: `sectorLabel`.
- **File dropzone** - drag-and-drop or click to browse. Text "Drag and drop a competitor-analysis CSV, or click to browse" / "Replace the CSV" once a file is chosen. Subtext ".csv only". Shows selected file name badge with a remove (X) button. Border/background change while dragging.
- **Error banner** (conditional) - shows upload/processing errors.
- **"Create sector" button** (Sparkles icon) - disabled until both a sector name and a file are present. While running shows "Building sector...". Calls `uploadCompetitor({file, sectorLabel})` -> POST `/uploads/competitor` -> on success navigates to the new Sector.

### 3.5 Sector Canvas / Sector view (SectorCanvas.jsx)

Header:
- **"Sector - Synthesis" label** + **sector name heading**.
- **"Find competitors" button** (Sparkles; title "AI market research - find competitors not in our CRM (web + LLM)") - runs `enrichSector(sector.id)`. While running shows "Researching...". On success shows "+{n} AI-found competitor(s)". This is the AI enrichment trigger.
- **"Save" button** - persists edits to the thesis headline/body via `patchSector(...)`. Shows "Saving..." then "Saved ✓" or "Save failed: {error}".
- **"Re-synthesise" button** (RefreshCw) - re-runs `synthesizeSector(sector.id)` to regenerate the sector headline + thesis. Shows "Synthesising...".
- **Delete button** (Trash2, red on hover; title "Delete this sector") - opens the delete confirmation modal.
- **Delete confirmation modal** - AlertTriangle icon, heading "Delete sector?", body "Are you sure you want to delete {sector.label}? This removes all of its segments, companies, and synthesis. This can't be undone." Buttons: "Cancel" / "Delete" (shows "Deleting..."). Calls `deleteSector(sector.id)`.

Provenance + search:
- **Provenance line** - "Synthesised from {n} segment(s) - updated {date}" (Layers icon).
- **Company search input** - placeholder "Find a company across {sector.label}...". Filters all companies in the sector by name/segment/geography/funding round; dropdown shows up to 8 results with a "COMPANY" badge, name, "{segment} - {geo} - {round}" subtitle. Click -> opens the Company Profile modal. "No companies match \"{query}\"" when empty.

Landscape stats card:
- **"{n} segments"** and **"{n} companies"** stats.
- **"{n} AI-found"** stat (purple; title "AI-discovered competitors not (yet) in the Deal Pipeline").
- **"{n} on Deal Pipeline"** stat (green; title "Competitors already present in XAnge's Deal Pipeline").
- **"Funding stage distribution"** mini bar chart - one bar per funding round (Pre-Seed, Seed, Series A...), height proportional to count.
- **"Geography"** pills - one pill per country as "{geo} - {count}", sorted by count.

Sector Thesis card:
- **"Sector Thesis" header** (Target icon).
- **"The bet" headline** - large editable single-line text (placeholder "The core bet - one line..."). Click to edit; pencil icon on hover; Enter/blur saves to local state, Escape cancels. Persisted via the Save button.
- **Supporting Narrative** - editable multi-line text (placeholder "Supporting reasoning...", 5-row textarea).
- **"Maturity across segments"** - horizontal gradient track with a clickable dot per segment positioned by adoption stage; axis labels "Early adopters / Early majority / Late majority / Laggards"; legend buttons "{segment} - {stage}" navigate to that workspace.

Segments comparison:
- **"Segments - {n}" header** with a **"Consolidated" / "Show all" toggle** (title "Consolidate related segments into fewer themes (display only - no data is changed)"; shown only when >2 segments).
- **Segments table** - columns "Segment", "Stage", "Cos" (company count), "TAM", "CAGR", and an **"Enter" button** per row -> Workspace View. Stage shown as a colored badge. Consolidated mode shows "Merged - {titles}"; focal shows "Focal - {company}".
- "No segments yet" empty state ("Create a workspace from the sidebar to add a segment").

Company x Segment matrix (shown when companies exist and >1 segment):
- **"Company x Segment matrix - {n}" header** + a summary line of companies competing across multiple segments.
- **Matrix table** - rows = companies (sticky left), columns = segments. Cell shows "★" (focal in segment), a tier number, "•" (present), or "·" (absent).
- **Legend** - "★ focal - number = competitive tier (1 = most serious) - • present".

AI-discovered competitors (shown when any `origin === 'ai'` company exists):
- **"AI-discovered competitors - {n}" header** + a VerifyLegend.
- Explanation: "Found by AI market research (web + LLM) - not from the uploaded CSV. Verify before use."
- **Company card (repeating):** a **VerifyDot** (cycles AI -> verified -> needs); company name; status badge "on Deal Pipeline" (green) or "net-new" (purple); segment badge; "conf {%}" confidence; a "why" description; **SOURCES** links (up to 4 domains, open in new tab).

Signals & Activity (shown when signals exist):
- **"Signals & Activity - {n} events" header** + VerifyLegend.
- **Timeline (scrollable):** per signal a VerifyDot, date, type badge (Funding / M&A / Regulatory / Trend / Exit, color-coded), label, a segment link (-> workspace), and a note. (Signal data appears to be derived/seeded; verification is local state.)

Ask across segments (sector Q&A):
- **"Ask across segments" header** (Sparkles).
- **Query result cards** - each shows the question, the AI answer, and an expandable "{n} segment(s) cited" citations list.
- **Thinking indicator** - "Synthesising across segments..." with animated dots.
- **Query input** - placeholder "Ask anything - e.g. \"Which segment has the strongest enterprise traction?\"" (or "Add segments to start querying..." when empty). Enter or Send submits `askSector(sector.id, q)`. Disabled when no segments or while thinking.

### 3.6 Workspace View / Segment view (WorkspaceView.jsx)

- **Breadcrumb** "{sector} - Segment" + **segment title heading**.
- **"Synthesise" / "Re-synthesise" button** (Sparkles; shows "Synthesising..." with spinner) - calls `synthesizeSegment(workspace.id)`, then switches to the AI Analysis tab. This runs per-company deep research + the LLM market read.
- **Tab bar** (exact order): **"AI Analysis"** (id summary), **"Market Overview"** (overview), **"Players"** (players), **"Differentiation"** (differentiation), **"Sources"** (sources).
- States: "Loading workspace..." while fetching; error banner if an API call fails.

#### 3.6a AI Analysis tab (SynthesisPanel.jsx)

- **Empty state:** Sparkles icon, "No AI analysis yet.", "Click Synthesise in the header to run deep research and generate one."
- **Metadata line:** "AI synthesis - deep research - {model} - {date} ... Direct sources in the Sources tab ->".
- **Executive summary card** - summary text + an optional **"KEY INSIGHT"** highlighted box.
- **Narrative sections** (each a labeled paragraph, shown if present): "Market overview", "Comparative read", "Differentiation vs focal", "Commentary - investment angle".

#### 3.6b Market Overview tab (OverviewTab.jsx)

- **AI-estimated banner** - "AI-estimated market read - verify before use" (or "No market read yet - click Synthesise to generate market sizing & signals").
- **Market Snapshot card** - thesis prose + optional CAGR badge, maturity badge, data date.
- **Market sizing cards (TAM / SAM / SOM):** each has a **VerifyDot**, a large value, a sub-label ("Total Addressable Market" / "Serviceable Addressable Market" / "Target Obtainable Market"), and a note. TAM shows a "✓ Venture-scale" flag when >$1B (">$1B - Venture-scale confirmed").
- **Structural Signals** - three cards with expandable rows and per-signal VerifyDots:
  - "Tailwinds" (TrendingUp, green), "Headwinds" (TrendingDown, orange), "Why Now" (Zap, blue). Empty state "None captured yet".
- **"Recent M&A Activity"** - dated event list (empty: "None recorded").
- **"Notable New Entrants (last 24 months)"** - company pills (empty: "None recorded").
- **"Regulatory & Policy Radar"** - table (Region / Date / Development / Impact) with per-row VerifyDot and an Impact badge (High/Medium/Low). Empty: "No regulatory items recorded".
- **"Customer Adoption Curve"** - S-curve gradient bar with a marker positioned by adoption stage (Early Adopters / Early Majority / Late Majority / Laggards) + evidence text.
- **"Exit Landscape"** - expandable table (Exit type / Likelihood / Likely acquirers / Implied multiple) with per-row VerifyDot; expanded rows show "Comparable transactions".

#### 3.6c Players tab (PlayersTab.jsx)

- **Sort toolbar** - "Sort by" + toggle buttons "Round" (default), "Raised", "Founded", "Team", "Name". Shows "{n} companies - {search path}". Focal company is always pinned to the top.
- **Table columns:** expand chevron, "Name", "Type" (only in company-search mode), "Category", "Founded", "Location", "Round", "Raised", "Team".
- **Row:** company name (+ "focal" badge); in company-search mode a clickable **Type pill** cycling direct -> indirect -> adjacent -> unset; category pill; founded; location; round badge; raised; team count. Focal rows get a tinted background.
- **Expanded row:** AI-generated description (first expand triggers a one-time AI summary; shows "Generating description..."; fallback text explains it summarizes from homepage + Crunchbase and caches). Optional analyst Notes. **"Move to segment"** dropdown ("Choose segment..." / "Moving...") -> `onMove(playerId, targetSegmentId)`.
- Empty state: "No companies in this segment yet."

#### 3.6d Differentiation tab (DifferentiationTab.jsx)

- **Breadcrumb** (Crosshair) - "Company search" vs "Sector search" mode + focal/workspace title.
- **Company selector card** - "Compare with" (company mode, focal locked, "vs" others) or "Select companies to compare" (sector mode, symmetric). Selected companies appear as removable pills; **"+ add"** opens a search popup ("Search players..."). Guidance text explains rules ("add up to 3" company mode / "Pick 2-4... symmetric" sector mode). Warning "Select at least two companies to compare." when too few.
- **"Where They Actually Differ"** - 6 dimensions (Distribution model, Pricing position, Target customer, Product scope, Geographic reach, Moat / defensibility), each with a caption, per-company editable text, and a source-attribution line.
- **"Side by side"** - grid with rows GTM, Pricing model, Target, Moat, Markets, Raised, Team (some editable, some read-only/derived).
- **"Scorecard"** - 5 dimensions (Distribution, Product depth, Pricing position, Moat strength, Intl reach) scored 1-3 via clickable dots. Footer: "Each score is editable - AI-seeded, analyst overrides".
- **"Recent momentum"** - per company a tag dropdown (Product / Funding / Geo / Partner / Hiring) + free-text "Latest signal..." field. Footer: "Source: web search (company + news, last 90 days) + job posts - refreshed weekly".

#### 3.6e Sources tab (SourcesTab.jsx)

- **Header** "Sources - direct links" + "{n} links across {m} companies" + VerifyLegend.
- **"Collect sources" button** (Sparkles; "Researching..." while running) - runs deep research per company to populate direct links (`collectSegmentSources()`).
- **Empty state** explaining links appear once a company is AI-researched ("Find competitors") or its founding data is collected from a registry.
- **Per company:** name (+ focal badge, origin badge like "AI-found", link count), then each link row with a **VerifyDot**, a label (Homepage / Crunchbase / domain), an optional field tag (homepage/funding/team), the URL, and an external-link icon.

### 3.7 CRM / Deal Pipeline view (CrmView.jsx)

- **Header** "Deal Pipeline - Affinity CRM" + "Pipeline" + "- {total} companies".
- **"Upload CSV" button** - reconciles a CRM CSV (`uploadCrmReconcile()`): matches by name/org id and updates only Stage/Funding when changed. Shows a success banner "Reconciled {rows} rows - {added} added - {updated} updated (stage/funding) - {unchanged} unchanged" with a changed-companies list, or "Upload failed: {error}".
- **Filters/search:** **Country dropdown** ("All countries" + faceted options like "Spain (24)"); **Search input** "Search name or description...", with a clear (X) button. Both reset pagination.
- **Analyse status bar** - "AI market research running (suggest sector + segment, then web research)... ~1 min." / "Analyse failed: {error}".
- **Table columns:** "Company" (+ website external-link icon, industry subtext), "Country", "Stage", "Funding" (formatted EUR), "Source" ("AI added" purple / "CSV" tan, with locked tooltip), and a per-row **"Analyse" button** ("Analysing..." while running) -> `analyseCrmCompany(id)` (sector-first AI analysis). Missing values show "—".
- **States:** "Loading...", "No companies match these filters."
- **Pagination:** range text "{from}-{to} of {total}", "Prev" / "Next" buttons (disabled at bounds), page indicator "{page} / {pages}". Page size = 25.

### 3.8 Company Profile modal (CompanyProfile.jsx)

> Opened from sector company search. Per the project decisions, contacts and meeting notes were dropped for v1, so these sections show empty states for real companies.

- **Header** "Company - Relationship", **close (X)**, and **"Open in segment" button** (-> the company's workspace, if `workspaceId`).
- **Company header card** - name (+ "focal" badge), "{geography} - Founded {year}", funding round badge, "total raised" value.
- **Contacts section** - "+ Add" creates editable contact rows (Name / Role / email / Relationship note) with remove buttons. Empty: "No contacts yet - click Add."
- **Meeting notes section** - "+ Log meeting" creates editable meeting cards (date, time, title, attendees, notes). Empty: "No meetings logged yet - click Log meeting."
- **Funding section** - latest round, key investor pills, funding history rows (with an active-round dot).
- **Team & leadership section** - member avatar, name, role, bio.
- **Core metrics section** - metric label, a High/Medium/Low level badge, value.

### 3.9 Concept Memo modal (ConceptMemo.jsx)

- Internal brief. Breadcrumb "Internal brief - XAnge", title "Market Intelligence Platform", close (X). Sections: "What this is", "How it works" (note: still uses the older "workspaces" wording rather than "segments"), "What it's for", "Current status" (states it is an early prototype, content should be verified before investment decisions). Footer "XAnge - Market Intelligence - Internal use only" + a "Close" button.

### 3.10 VerifyDot (VerifyDot.jsx) - the trust primitive

- Shared clickable 3-state dot used across AI companies, signals, market sizing, regulatory items, exits, and sources.
- States cycle: **AI-generated (unverified)** -> **human-verified** (green) -> **needs-verification** (red) -> back.
- **VerifyLegend** explains the three states.
- Persistence: verification of synthesis/sector claims is saved to the backend (`PATCH /verifications`); some in-view dots (e.g. signals) are local session state.

## 4. Data Model

> SQLAlchemy tables. Every domain table has typed "core" columns plus a JSONB `extra` for unmapped fields ("fixed core + flexible extras").

### Entities and key attributes

- **Sector** (`sectors`): `id`, `label`, `synthesis_headline`, `synthesis_body`, `synthesis_extra` (JSONB: `watchlist`, `openQuestions`, `model`, `generatedAt`), timestamps.
- **Segment** (`segments`): `id`, `sector_id` (FK), `title`, `focal_company`, `thesis`, `summary`, `key_insight`, `status` ('draft' | 'synthesizing' | 'ready'), `source_upload_id`, timestamps.
- **Company** (`companies`): `id`, `sector_id` (FK), `name`, `founded`, `geography`, `funding_status`, `funding_amount`, `top_investors`, `description`, `primary_customer`, `origin` ('csv' | 'crm' | 'ai'), `crm_company_id` (nullable link to a CRM row), `extra` (JSONB: `sources`, `website`, `domain`, `why`, `confidence`, `relationType`, `category`, `yearFounded`, `fundingEur`, `employeeCount`, `in_crm`, ...), timestamps.
- **CompanySegment** (`company_segments`) - the many-to-many join with payload: `id`, `company_id` (FK), `segment_id` (FK), `competitive_potential` (tier 1/2/3, or NULL if focal), `focal` (bool), `notes`, unique on (company_id, segment_id).
- **SegmentSynthesis** (`segment_synthesis`) - one per segment: `overview` (JSONB: {text, market}), `comparative`, `differentiation`, `summary`, `commentary`, `sources` ({claims:[...]}), `model`, `generated_at`.
- **Verification** (`verifications`): `entity_type` ('segment_synthesis' | 'sector'), `entity_id`, `claim_key` (stable snake_case id), `status` ('ai' | 'verified' | 'needs'), `verified_by`, `verified_at`; unique on (entity_type, entity_id, claim_key).
- **CrmCompany** (`crm_companies`): `id`, `affinity_row_id`, `organization_id`, `name`, `website`, `lead_status` ('hot' | 'pass' | 'unknown'), `affinity_status`, `owner`, `tag`, `investors`, `investment_stage`, `country`, `industry_xange`, `description`, `year_founded`, `total_funding_usd`, `total_funding_eur`, `linkedin_url`, `dealroom_url`, `last_email`, `last_meeting`, `next_meeting`, `employees_current`, `extra` (JSONB; includes `source` = 'csv' or 'ai'), timestamps.
- **Upload** (`uploads`) - ingestion audit: `kind` ('competitor' | 'crm'), `filename`, `row_count`, `status` ('pending' | 'done' | 'failed'), `error`, `sector_id`.
- **AiEnrichment** (`ai_enrichment`) - one row per enrichment run: `sector_id`, `focal_company_id`, `segment_id`, `status` ('pending' | 'done' | 'failed'), `query_plan` (JSONB: planned web queries), `result` (JSONB: competitors, created count, fetch methods), `model`, `error`.

### Relationships

- Sector 1—* Segment; Sector 1—* Company.
- Company *—* Segment via `company_segments` (with per-segment tier/focal/notes).
- Segment 1—1 SegmentSynthesis.
- Company *—1 CrmCompany (optional match via `crm_company_id`).
- CRM companies are otherwise standalone (separate pipeline view, not joined to the competitor tree in v1).
- AiEnrichment *—1 Sector (and optionally a focal Company / Segment).

## 5. Workflows / Use Cases

### Workflow A - Create a sector from a competitor CSV

1. Landing -> "Create a new sector".
2. Seed screen: enter "Sector name *", drop a competitor-analysis CSV.
3. Click "Create sector" -> `POST /uploads/competitor`.
4. Backend creates the Sector, derives Segments from the (list-valued) Segment column, creates Companies, and links them via `company_segments` (tier/focal/notes per segment).
5. Lands in Sector Canvas with stats, an empty/seed thesis, and the segment table.

### Workflow B - Synthesise and verify a segment

1. Sector Canvas -> click a segment's "Enter" -> Workspace View.
2. Click "Synthesise" -> `POST /segments/{id}/synthesize` (per-company deep research, then LLM market read).
3. Review "AI Analysis" (summary, key insight, narrative), "Market Overview" (TAM/SAM/SOM, CAGR, tailwinds/headwinds/why-now, regulatory, adoption, exits).
4. In "Players" sort/expand companies (expanding triggers a one-time AI description); reclassify competitor "Type"; "Move to segment" if mis-bucketed.
5. In "Differentiation" pick companies to compare; edit the 6-dimension grid, side-by-side, scorecard, momentum.
6. Use VerifyDots throughout to mark claims verified/needs-work (`PATCH /verifications`).
7. In "Sources" click "Collect sources" to populate direct links; verify each.

### Workflow C - Find competitors not in the CRM (AI enrichment)

1. Sector Canvas -> "Find competitors" -> `POST /sectors/{id}/enrich`.
2. Pipeline: LLM plans 3-4 web queries -> Tavily search -> LLM extracts candidate companies -> fetch top candidate sites (trafilatura, Playwright fallback) -> LLM finalizes clean competitor records with confidence + source URLs.
3. New competitors saved as `origin='ai'` Companies, name/domain-matched to CRM (`crm_company_id`); net-new ones also added to the CRM pipeline (`extra.source='ai'`).
4. They appear in the "AI-discovered competitors" panel with status ("on Deal Pipeline" / "net-new"), confidence, why, and sources; analyst verifies via VerifyDot.

### Workflow D - Company-first analysis from the Deal Pipeline

1. Sidebar/Landing -> "Deal Pipeline".
2. Filter by country / search; find a CRM company.
3. Click "Analyse" -> `POST /crm/companies/{id}/analyse`.
4. AI suggests a sector + segment, creates them with the CRM company as focal, then runs the enrichment pipeline to research competitors (~1 min).
5. Navigate into the new Sector to review.

### Workflow E - Sector-level synthesis and cross-segment Q&A

1. Sector Canvas -> "Re-synthesise" -> `POST /sectors/{id}/synthesize` (headline "bet", body, watchlist, open questions).
2. Edit the headline/narrative inline; "Save" -> `PATCH /sectors/{id}`.
3. Use "Ask across segments" -> `POST /sectors/{id}/ask` for grounded answers with segment citations.

## 6. Integrations & Data Sources

### Backend stack

- Frontend: React 19 + Vite + Tailwind v4 + recharts + lucide-react.
- Backend: Python 3.11+ / FastAPI, PostgreSQL (Docker, port 5544), SQLAlchemy 2.x + Alembic.
- AI: LangChain, provider-abstracted (OpenAI or Anthropic).

### Inbound data sources

- **Competitor analysis CSV** (manual per market) -> builds a Sector/Segments/Companies. Columns: Competitive Potential (tier), Name, Founded, HQ, Funding Status/Amount, Top Investors, Description, Segment (list-valued), Primary Customer, Notes/Relevance. Unmapped columns -> JSONB `extra`.
- **Affinity CRM export** (Hot/Pass/Unknown lead CSVs, ~90 columns) -> CRM pipeline; `lead_status` inferred from filename; duplicate `.1` Dealroom columns coalesced; unmapped -> `extra`.

### External services (AI research path)

- **Tavily** - web search for competitor discovery.
- **trafilatura** - fast static page extraction; **Playwright (headless Chromium)** - fallback for JS-rendered pages.
- **OpenAI / Anthropic** via LangChain - synthesis, commentary, Q&A, query planning, candidate extraction/finalization.

### Free open-data collectors

- **Annuaire des Entreprises (data.gouv.fr / recherche-entreprises)** - French registry (keyless): year founded + HQ.
- **UK Companies House** - UK registry (free key): incorporation date + registered office.
- **World Bank Open Data** (keyless) - population, GDP, GDP per capita for market context.
- **SEC EDGAR** (keyless, User-Agent) - filing-mention counts as a public signal.
- Reference-only (not live): German Unternehmensregister, Eurostat, EUR-Lex, Sifted/EU-Startups, Dealroom, LinkedIn.
- Endpoints: `POST /companies/{id}/collect-registry`, `POST /sectors/{id}/market-context`, `GET /sources`.

### Key API endpoints (outputs/data out)

- Sectors: `GET/PATCH/DELETE /sectors/{id}`, `POST /sectors/{id}/synthesize`, `POST /sectors/{id}/ask`, `POST /sectors/{id}/enrich`.
- Segments: `GET /segments/{id}`, `GET /segments/{id}/companies`, `PATCH /segments/{id}`, `POST /segments/{id}/synthesize`, `POST /segments/{id}/collect-sources`.
- CRM: `GET /crm/facets`, `GET /crm/companies`, `GET /crm/companies/{id}`, `POST /crm/upload`, `POST /crm/companies/{id}/analyse`.
- Uploads: `POST /uploads/competitor`, `POST /uploads/crm`.
- Companies: `POST /companies/{id}/move-segment`, `POST /companies/{id}/collect-registry`.
- Verifications: `PATCH /verifications`.

### What flows out

- The tool does not push data to external systems. It writes net-new AI-discovered competitors back into its own CRM table, and outbound links open source URLs in the browser. (AI-enrichment matching back into the live Affinity CRM is deferred to a later milestone.)

## 7. Strengths & Gaps

### Strengths

- Clear, opinionated data model (Sector -> Segment -> Company many-to-many) that mirrors how analysts actually think about markets.
- Strong "human-in-the-loop trust" design: the VerifyDot 3-state primitive is everywhere, and AI content is explicitly labeled "verify before use."
- Genuinely end-to-end: CSV ingestion -> AI synthesis -> web-research enrichment -> CRM matching, all wired to a real Postgres backend (not mocked at the data layer).
- Useful AI research pipeline that finds competitors NOT already in the firm's CRM (Tavily + scraping + LLM), with source provenance and confidence.
- Flexible ingestion ("fixed core + JSONB extras") tolerates the fact that every competitor analysis spreadsheet is structured differently.
- Two complementary entry points: market-first (upload a CSV) and company-first (Analyse a CRM row).
- Editorial, consistent visual design; inline editing of AI output keeps analysts in control.

### Gaps / friction / half-built

- **Company view not implemented** - sidebar company clicks land on a "Company view - coming next" placeholder.
- **Company Profile modal is largely empty** - contacts and meeting-notes were dropped for v1, so those rich sections show empty states; team/metrics/funding history have no real data source yet.
- **No authentication** - single shared environment; no per-user state or access control.
- **No persistent UI routing** - navigation is conditional rendering off in-memory `selected` state (no URL router), so views are not deep-linkable.
- **Some signal/momentum data appears seeded/derived** rather than live; not all VerifyDot states persist (e.g. signals are session-local).
- **CRM not joined to competitor data in v1** beyond AI name/domain matching; the deal pipeline is mostly a standalone browser.
- **Enrichment is slow** (~1 min, real web fetches incl. Playwright) and depends on external keys (Tavily, an LLM provider) and a one-time `playwright install chromium`.
- **Sidebar create actions are optimistic-only** (client state), which can drift from the backend.
- **Concept Memo copy is stale** - still says "workspaces" where the model was renamed to "segments."
- **Scale/perf untested for production** - sample is ~825 CRM rows; production target is ~20k orgs.
- Built to a tight (~1 month) demo timeline, so it is intentionally biased toward a working end-to-end demo over completeness.

## 8. Glossary

- **Sector** - a market vertical (e.g. "Embedded Finance"). Created by importing a competitor CSV. Top of the hierarchy.
- **Segment** - a competitive sub-market within a sector, derived from the CSV's list-valued "Segment" column. (Renamed from the earlier term "Workspace"; some code/UI still says workspace.)
- **Workspace** - legacy name for a Segment; the Workspace View is the Segment deep-dive screen.
- **Company** - a player in a market, sector-scoped, linked to one or more segments.
- **Focal company** - the benchmark/anchor company a segment's analysis is framed against (the CSV row with no competitive tier; `focal=true` on the join). Marked "★" / "focal" badge.
- **Competitive Potential / Tier** - 1/2/3 ranking of how serious a competitor is (1 = most serious). NULL tier = the focal company.
- **CRM / Deal Pipeline** - the browse-and-filter view over XAnge's Affinity export.
- **Affinity** - the external CRM whose export feeds the Deal Pipeline.
- **Dealroom** - external company-data source; supplies some enrichment columns (the `.1`-suffixed duplicates) in the CRM export.
- **Lead status** - CRM bucket: hot / pass / unknown (inferred from the source filename).
- **Enrichment / "Find competitors"** - the AI market-research pipeline that discovers competitors not in the CRM (LLM query planning -> Tavily -> scrape -> LLM finalize).
- **origin** - how a company entered the system: 'csv' (uploaded), 'crm' (from pipeline), or 'ai' (AI-discovered).
- **Synthesis / Synthesise** - generating AI narrative + market read for a segment, or headline/thesis/watchlist for a sector.
- **Market read** - the AI-estimated market block: TAM, SAM, SOM, CAGR, adoption stage, tailwinds/headwinds/why-now, regulatory, exits.
- **TAM / SAM / SOM** - Total / Serviceable / Serviceable-Obtainable Addressable Market.
- **CAGR** - Compound Annual Growth Rate.
- **VerifyDot** - the shared 3-state claim-verification control: AI-generated -> human-verified -> needs-verification. The product's "trust spine."
- **Adoption stage** - position on the diffusion curve: Early Adopters / Early Majority / Late Majority / Laggards.
- **Net-new** - an AI-discovered competitor not already present in the Deal Pipeline.
- **Concept Memo** - the internal brief modal describing the tool.
- **company_segments** - the many-to-many join table carrying per-segment tier, focal flag, and notes.
- **extra (JSONB)** - per-table flexible column storing CSV/source fields that do not map to a typed core column.
