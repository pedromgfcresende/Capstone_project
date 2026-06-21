# Feedback Build Plan — Capstone Review Round

> **Status: IMPLEMENTED** (all work packages WP0–WP4). Frontend builds clean,
> backend 42/42 tests pass, segment-name backfill run against the live DB
> (23 renamed, 1 merged). See the commit for the diff.

Sequenced plan to incorporate the latest reviewer feedback. Scoped against the
current codebase (file:line references are exact as of this writing). Bias toward
a working demo; items are ordered by impact-to-effort.

**Locked decisions (from review):**
- **Segment naming** → normalize to short **Title Case** labels (≤~5 words) at all
  creation paths **and backfill existing names** via a one-time migration.
- **Stage column** → **delete from the Sector segments table**, but **keep** the
  "Maturity across segments" gradient in the Sector Thesis (same underlying data).

---

## Work Package 0 — Quick wins (low risk, high visibility)

### 0.1 Sort segments alphabetically everywhere ⭐ (reviewer's top priority)
Today segments are unordered/created-order in the sidebar, and the Sector page
sorts them by **TAM desc**. Make alphabetical the single consistent order.

- **Backend (canonical fix):** order the segments relationship / serializer by
  title.
  - `backend/app/db/models.py:65` — `order_by="Segment.created_at"` → order by
    `Segment.title` (case-insensitive). Cleanest single source of truth.
  - `backend/app/api/serializers.py:226` — `sector_out()` returns ORM order; if
    ordering isn't applied at the relationship, sort here by `title.lower()`.
- **Frontend (Sector table):** `frontend/src/components/SectorCanvas.jsx:222-231`
  — replace `.sort((a, b) => parseTam(b.tam) - parseTam(a.tam))` with
  `.sort((a, b) => a.title.localeCompare(b.title))`.
- **Frontend (Sidebar):** `frontend/src/components/Sidebar.jsx:147` — segments
  render in `sector.workspaces` order; with the backend ordered, this becomes
  alphabetical automatically. (Optional defensive sort on render.)

**Acceptance:** sidebar, Sector segments table, and the matrix x-axis all show
segments in the same A→Z order.

### 0.2 Sector table: drop "Stage", surface "TAM" + "CAGR" properly
- `SectorCanvas.jsx:624` grid template `'1fr 130px 70px 80px 150px 110px'` —
  remove the Stage column (130px) and its header (`:624-627`) + cell (`:639`).
- TAM/CAGR already exist in `segmentRows` (`:228`, rendered `:641-642`) — keep
  them; just rebalance the grid template to the new column count.
- Keep `ov.adoptionStage` in the row data (still feeds the maturity gradient at
  `:566-595`), just stop rendering it as a column.

**Acceptance:** segments table shows Segment · Cos · TAM · CAGR · Enter; no Stage
column; maturity gradient in Sector Thesis unchanged.

### 0.3 "Ask across segments" — answerable example question
- `SectorCanvas.jsx:826` placeholder currently `…"Which segment has the strongest
  enterprise traction?"` which the AI can't answer (no enterprise-traction signal
  in context). Replace with something grounded in available data, e.g.
  *"Which segment has the most competitors on our radar?"* or
  *"Which segment is least mature / earliest-stage?"*

**Acceptance:** the suggested question returns a sensible, grounded answer when run.

---

## Work Package 1 — Segment name normalization (decided: Title Case + backfill)

Add one shared normalizer and apply it at every creation path, then backfill.

### 1.1 Backend normalizer util
- New `backend/app/services/ingestion/segment_naming.py` (or a helper in
  `core/`): `normalize_segment_title(raw: str) -> str`.
  - Trim; collapse whitespace; strip trailing punctuation.
  - Convert to Title Case **with a small-word stoplist** (for/of/and/the/in/to…).
  - Soft length cap (~5 words / ~40 chars) — trim trailing qualifier clauses
    (e.g. drop "for regulated finance" → keep core noun phrase) or just cap word
    count. Keep it deterministic and simple.

### 1.2 Apply at all three creation paths
- **CSV ingestion:** `backend/app/services/ingestion/competitor_csv.py:103-110` —
  wrap `title=sname` with `normalize_segment_title(sname)`. Keep `_norm(sname)` as
  the dedup key so variants still merge.
- **AI enrichment:** `backend/app/services/research/persist.py:76-81` — normalize
  `stitle` before `Segment(... title=stitle ...)`. Also tighten the prompt in
  `backend/app/services/research/enrich.py:88-99` to demand "short Title-Case
  label, ≤5 words, no trailing clauses".
- **Manual create:** the segment-create endpoint (and `Sidebar.jsx:34-46` /
  wherever the create POST lands) — normalize server-side so all paths converge
  on the backend util (don't duplicate logic in JS).

### 1.3 One-time backfill migration
- Alembic data migration (or a `backend/scripts/` one-off): load all `Segment`
  rows, apply `normalize_segment_title`, and **merge collisions** (if two
  segments normalize to the same title in the same sector, re-point
  `company_segments` joins + `segment_synthesis` to one survivor, delete the
  dupe). Log the rename map.

**Acceptance:** the three example bad names render as the previewed Title-Case
forms; new segments from all three paths are consistently formatted; no orphaned
joins after backfill.

---

## Work Package 2 — Market Overview tab cleanup (remove unverifiable sections)

Reviewer: "thought we agreed on removing these given lack of verifiability."
File: `frontend/src/components/tabs/OverviewTab.jsx`.

### 2.1 Remove
- **Structural Signals + Recent M&A + Notable new entrants:** delete `:154-199`.
- **Regulatory & Policy Radar... wait — KEEP this one.** Reviewer explicitly said
  *"Regulatory & policy radar — good, let's leave it, would be good to add a
  source somewhere."* So **do NOT delete `:201-234`**; instead add a source line
  (see 2.3).

> ⚠️ Correction vs. first map: only **Structural Signals / M&A / new entrants**
> (`:154-199`) are removed. Regulatory radar stays.

### 2.2 Keep (unchanged)
- Warning banner (`:99-110`), Market Snapshot (`:112-125`), Market Sizing
  (`:127-152`), Customer Adoption Curve (`:236-257`), Exit Landscape (`:259-304`).

### 2.3 Regulatory radar — add a source
- In the regulatory table (`:201-234`) add a small source/citation cell or
  footnote per row (reuse the citation styling from the Q&A `QueryResult` /
  Sources tab). If the synthesis payload has no source field for regulatory
  items, add one to the regulatory schema in the synthesis chain and render it;
  otherwise show a single "AI-estimated — verify" footnote consistent with the
  banner.

### 2.4 (Optional, "not a necessity") Editable market sizing
- Market Sizing (`:127-152`) currently has VerifyDot only. If time allows, wrap
  TAM/SAM/SOM values in the existing `InlineText` edit pattern (as used in
  `DifferentiationTab`/`SectorCanvas` thesis) and persist via a PATCH. Defer if
  schedule is tight.

**Acceptance:** Structural Signals / M&A / new entrants gone; regulatory radar
present with a visible source; remaining sections intact.

---

## Work Package 3 — Players tab (the biggest gap)

File: `frontend/src/components/tabs/PlayersTab.jsx`. Today: read-only rows, no
add-competitor button, no company card, no verify/edit.

### 3.1 "Find / add competitors" button in Players ⭐
- Reuse the enrich pattern from `SectorCanvas.jsx:331-342` (`handleEnrich`) and
  the button UI at `:373-383`. Add it to the Players tab header.
- Also surface the manual "add to comparison/segment" search that already exists
  in `DifferentiationTab.jsx:99-135` — lift it so analysts can add a known
  competitor without a full AI run.

### 3.2 Wire the Company Card / profile ⭐
- `CompanyProfile.jsx` exists but is only wired in SectorCanvas (`:178,466,
  841-847`). Wire it into Players: clicking a `PlayerRow`
  (`PlayersTab.jsx:69-151`) opens the profile modal.
- Trim per v1 decision (CLAUDE.md §6.7): contacts/meeting-notes are dropped —
  the modal should show the CRM/competitor-derived fields (funding, team,
  metrics, geography, founded) and empty-states for the rest. Verify the modal's
  contacts/meetings blocks (`CompanyProfile.jsx:113-180`) are hidden/empty rather
  than showing fake data.

### 3.3 Editable + verifiable company detail fields ⭐
- Reviewer wants year founded, location, etc. **editable** (more than just
  verifiable). For the detail fields in `PlayerRow` (`:104-108`) and/or the
  company card:
  - Wrap each field in the existing `InlineText` edit component (pattern from
    `DifferentiationTab.jsx:63-85`).
  - Add a `VerifyDot` next to each (API: `VerifyDot.jsx`, states ai/verified/
    needs; `useVerifyMap` for batch). Edits persist to the company via PATCH;
    verification state persists like the existing AI-claims flow.

### 3.4 Differentiation — verify + edit
File: `frontend/src/components/tabs/DifferentiationTab.jsx`.
- Fields are already editable via `InlineText` (`:63-85`). Add **VerifyDot** to
  each differentiation cell (currently none) so analysts can mark verified/needs.
  Reuse `useVerifyMap` + the persisted verification endpoint.

**Acceptance:** Players tab has an add-competitor action; rows open a company
card; founded/location/etc. are editable and carry a verify state; differentiation
cells carry verify dots; all persist across reload.

---

## Work Package 4 — Smaller polish items

### 4.1 Company × Segment matrix readability
File: `SectorCanvas.jsx:658-715`.
- **Legend to the top:** move the legend (`:712`, "★ focal · number = tier · •
  present") from below the table to above it, before the scroll container.
- **Diagonal x-axis labels:** the header labels use
  `writingMode: 'vertical-rl'; rotate(180deg)` (`:679-681`). Switch to a ~45°
  diagonal: `transform: rotate(-45deg)` with `transform-origin: bottom left`,
  `white-space: nowrap`, and enough header height/padding so labels don't clip.

### 4.2 AI synthesis — highlight the focal company
Files: `WorkspaceView.jsx:102` → `SynthesisPanel.jsx:44-52`.
- Pass the focal company name into `SynthesisPanel` (workspace already knows
  `focalCompany`). In the "Key insight" block, **bold/badge** the focal company
  name where it appears (or add a "Focal: <Company>" chip above the insight) so
  the reader knows which company the synthesis centers on.

### 4.3 Items confirmed good — no action
Sector Thesis, AI-discovered competitors panel, Market Overview snapshot/warning
banner/adoption curve, Differentiation visual, Sources tab, "Ask across segments"
(beyond the example question fix in 0.3). Reviewer flagged these positively.

---

## Sequencing & effort

| Order | Package | Effort | Why first |
|-------|---------|--------|-----------|
| 1 | **WP0** quick wins (sort, Stage→TAM/CAGR, example Q) | S | Highest visible payoff, reviewer's #1 ask, low risk |
| 2 | **WP2** Overview cleanup | S | Pure deletion + one source addition; fast trust win |
| 3 | **WP1** segment naming + backfill | M | Touches 3 paths + migration; do before more data piles up |
| 4 | **WP3** Players (button, card, edit/verify) | L | Biggest feature gap; most reviewer value |
| 5 | **WP4** matrix/legend/focal polish | S | Cosmetic, after substance |

Legend: S ≈ <½ day, M ≈ ~1 day, L ≈ 1–2 days.

## Open / deferred
- Editable market sizing (WP2.4) — explicitly "not a necessity"; do only if WP3
  lands with time to spare.
- Navigation fluidity overall — reviewer accepts it's patchy given time limits;
  the alphabetical-sort fix (0.1) is the agreed minimum.
- Regulatory source provenance (2.3) depends on whether the synthesis schema
  carries a source field; may need a small backend chain tweak.
