# Feedback → Required Changes (from handwritten notes)

> Status: **Milestones 1 & 2 IMPLEMENTED ✅.**
> M1 = rename Workspace→Segment, Company↔Segment N:N, sector-level CSV import, Company×Segment matrix.
> M2 = AI enrichment (Tavily search + trafilatura→Playwright scraping + LLM) finding
> competitors not in the CRM, sector "Find competitors" + company-first "Analyse from CRM"
> flows, origin/crm_company_id CRM-matching, ai_enrichment table.
> Original proposal + decisions retained below for reference.

---

## ✅ Decisions locked (your reply)

- **#1 Rename + clean DB rebuild:** YES — rebuild the DB from scratch (demo data only).
- **#2 Per-segment fields:** `competitive_potential` / `focal` / `notes` live on the
  **`company_segments` join** (per-segment). You also want a **richer Sector UI** — see
  the new **§8 Sector UI proposal** below.
- **#3/#4 AI enrichment = AI-found external competitors:** the AI-enrichment table holds
  **companies that are NOT in our CRM but compete with the ones we're analysing**,
  discovered by AI. → Modelled as `companies` with `origin = 'ai'` and
  `crm_company_id = null` (vs `origin = 'csv' | 'crm'`). An enrichment run is tied to the
  analysed company/sector and produces these new competitor rows.
- **#5 AI market research = AI + web scraping** (mixture). So enrichment does LLM
  reasoning **plus live web research** to find/verify competitors.

**Still open (I'll default unless you say otherwise):** #3-list (derived), #6 (move CSV
to sector level — your note said "remove from segment", I'll do that), #7 sequencing —
see **§9**.

---

## 0. How I read your notes (transcription)

**Data model (the "Initial Page" diagram):**
- `Sectors` ←**1:1**— `Sector Synthesis` (a.k.a. *Sector Analysis*)
- `Sector Synthesis` ←**N:1**— `Segment Synthesis` (one sector analysis derives from **many** segment syntheses)
- `Segments` ←**1:1**— `Segment Synthesis`
- `Companies` —**N:N**— `Segments`  ← *"A company might compete in different segments"*
- `CRM` —**1:1 (+AI)**— `AI enrichment` → produces **"new competitors"**
- **Rename `Workspace` → `Segment`** everywhere (the crossed-out "Workspaces" → "Segments").

**Other changes (top-right):**
- Rename Workspaces → Segments.
- Add a **Sector** layer that derives from **multiple** Segment Syntheses.
- Sector Analysis should have a **column that is a list of the segment ids** associated with that sector.
- `*1`: the **AI-enrichment table** is keyed to the *same sector* but rows **might be different segments**.

**Two entry flows (bottom):**
- **(b) Deepen analysis at the Sector level** → the **CSV import option lives at the Sector level** (move it **out of** the segment). *"The segments are imported from CSV."* The **Segments column is a list** (a company can map to several).
- **(A) Start from a single company, with no prior industry analysis:**
  - **Select a company from our CRM**, *or* **add one manually** (a **`[+]` button on the Browse Deal Pipeline** opens a tab to enter the needed info).
  - When we decide to analyse a company, we can **pick a Sector (existing or new) — or let AI suggest**; **same for the Segment(s)**.
  - That **triggers AI market research** which **adds new companies** (`*1` → enrichment table, same sector / possibly other segments).

---

## 1. Terminology: Workspace → Segment

Rename the concept **Workspace → Segment** across the stack.

| Layer | Current | After |
|---|---|---|
| DB table | `workspaces`, `workspace_synthesis` | `segments`, `segment_synthesis` |
| FKs | `companies.workspace_id`, `uploads.workspace_id` | (changes — see §2) |
| API | `/api/workspaces/...` | `/api/segments/...` |
| Frontend | `WorkspaceView`, `workspaceStates`, "Workspace" labels | `SegmentView`, "Segment" labels |
| Verification entity_type | `workspace_synthesis` | `segment_synthesis` |

**Impact:** touches nearly every file. Mechanical but wide. (DB rename needs a migration + a data backfill, or a clean rebuild since we only have demo data.)

---

## 2. Biggest change: Company ↔ Segment becomes **many-to-many**

**Today:** a company belongs to exactly one workspace (`companies.workspace_id`, 1‑to‑many). The same real company appearing in two markets is stored as two rows.

**Required:** a company can belong to **multiple segments**.

Proposed model:
- `companies` becomes **sector-scoped** (a company lives under a Sector, not a single Segment), with a unique identity per sector.
- New join table **`company_segments`** (`company_id`, `segment_id`, + optional per-segment fields like `competitive_potential`, `notes`, `focal`) — because tier/notes can differ **per segment** (your `*1`: "same sector but might be different segments").
- The competitor-CSV **"Segment" column is parsed as a list** → one company row + N `company_segments` links.

**Decision needed:** are `competitive_potential`, `focal`, `notes` **per-segment** (on the join) or **per-company** (shared)? The sketch implies per-segment. (Recommended: per-segment.)

**Impact:** large — ingestion, serializers, all the tabs (Players/Comparative/Differentiation read `workspace.companies`), and the sector aggregates all change to go through the join.

---

## 3. Sector layer: aggregate of multiple segments

- A **Sector** owns a **Sector Synthesis** (1:1) that **aggregates many Segment Syntheses** (N:1).
- Store on the sector a **list of segment ids** it covers (we already have `sectors.synthesis_extra` JSONB — add `segment_ids: [...]`, or rely on the `segments.sector_id` FK + the join).
- This already partly exists: today `POST /api/sectors/{id}/synthesize` rolls up the sector's workspaces. The change is mostly **naming** + making the membership explicit (the segment-id list) and confirming the **N:1 segment-synthesis → sector-synthesis** framing.

**Decision needed:** is the segment-id list **derived** (from `segments.sector_id`) or **explicitly stored/editable**? (Recommended: derived, with the list surfaced read-only — simpler, no drift.)

---

## 4. AI enrichment (CRM → competitors)

New concept: **AI enrichment** sits between the **CRM** and the competitive graph.
- A CRM company can be **AI-enriched (1:1)** → an `ai_enrichment` record.
- Enrichment runs **AI market research** and **surfaces "new competitors"** → which get added as **Companies** (tagged to the chosen Sector, possibly across **different Segments**, per `*1`).

Proposed model: `ai_enrichment` table (`crm_company_id` or `company_id`, `sector_id`, `status`, `result` JSONB of discovered competitors + segments), 1:1 with the source company.

**Decision needed:** does enrichment attach to a **CRM company** (`crm_companies`) or to an analysed **Company**? The arrows show **CRM —1:1→ AI enrichment** *and* a **Company —1:1→ AI enrichment**. I read it as: the **source** is a CRM company (or manual add), enrichment is 1:1 with that source, and its **output** is new `companies`. Please confirm.

**Decision needed:** AI market research = LLM-only first pass, or LLM **+ web search/scraping**? (Web scraping was the Week-3 stretch we deferred — this is where it would land.)

---

## 5. Two creation flows

### Flow B — Industry-first (deepen at Sector level)
- **Move the CSV upload from the Segment/Workspace level to the Sector level.** Creating/curating a **Sector** is where you import the competitor CSV; **segments are derived from the CSV's (list-valued) Segment column**, and companies are linked N:N.
- Net: "Create a new workspace → upload CSV" becomes "**Create / open a Sector → import CSV**", which fans out into segments + companies.

### Flow A — Company-first (no prior analysis)
- Entry points:
  1. **Select a company from the CRM** (Deal Pipeline), or
  2. **Add one manually** via a **`[+]` button on the Deal Pipeline** that opens a tab to enter the company info.
- Then: **choose a Sector** (existing or new) — or **let AI suggest** one; **same for Segment(s)**.
- That **triggers AI market research** → discovers competitors → **adds Companies** (the `*1` enrichment, same sector / possibly other segments).

**Impact:** new UI (pipeline `[+]` add-company tab, "analyse this company" action, sector/segment pickers with an "AI-suggest" option), plus the enrichment endpoint from §4.

---

## 6. Proposed implementation order (once approved)

1. **Rename Workspace → Segment** (DB migration + API + frontend) — mechanical, do first so everything else is named right.
2. **Company ↔ Segment N:N** (`company_segments` join; ingestion parses list Segment column; serializers + tabs go through the join).
3. **Sector aggregation** explicit (segment-id list; rename sector synthesis framing).
4. **Move CSV import to Sector level** (Flow B).
5. **AI enrichment table + endpoint** and **Company-first flow A** (CRM/manual → suggest sector/segments → market research → add companies).
6. Updated **target schema PNG** + docs refresh.

Steps 1–4 are re-architecture of what exists; 5 is genuinely new capability (and the heaviest, esp. if it includes web research).

---

## 7. Decisions I need from you before coding

1. **Rename** Workspace→Segment now, with a **clean DB rebuild** (we only have demo data) rather than a data-preserving migration? (Recommended: clean rebuild.)
2. **Per-segment vs per-company** fields for `competitive_potential` / `focal` / `notes` (§2). (Recommended: per-segment.)
3. Sector's **segment list**: derived from FK, or explicitly stored/editable? (Recommended: derived.)
4. **AI enrichment source**: CRM company / manual-add only, and output = new Companies — confirm (§4).
5. **AI market research scope**: LLM-only first pass now, web-search/scraping later? (Recommended: LLM-only first, scraping as a follow-up.)
6. **CSV import location**: move entirely to Sector level and remove the Segment-level upload? (Your note says "remove from segment" — confirm.)
7. **Scope/sequencing**: do all of 1–5 now, or land 1–4 (re-architecture) first and treat 5 (enrichment + company-first flow) as the next milestone?

Reply inline (e.g. "1: yes, 2: per-segment, …") or edit this file, and I'll proceed against your answers.

---

## 8. Sector UI — proposed richer design (you asked for suggestions)

Because companies are now N:N across segments and the Sector aggregates everything, the
Sector page can become the real "command center." Proposed sections (additive to the
current sector canvas):

1. **Sector header + AI Sector Synthesis** — headline "bet" + body, *derived from the
   segment syntheses* (drill-down link per segment). Editable + Save (already built).
2. **Segments strip** — one card per segment: focal company, # companies, tier mix
   (1/2/3), adoption stage. Click → segment view. Add-segment ("AI-suggest or new").
3. **Company × Segment matrix** ⭐ *new and central* — a grid: rows = companies,
   columns = segments, cell = tier (or a dot) where that company competes. Instantly
   shows **multi-segment players** (companies competing in 2+ segments) — the whole point
   of the N:N change. Sort by "breadth" (how many segments a company spans).
4. **Multi-segment players callout** — a short list of companies competing across the
   most segments (the cross-cutting threats), pulled from the matrix.
5. **AI-enrichment panel** ⭐ *new* — "AI-found competitors not in our CRM": the
   `origin='ai'` companies for this sector, with **provenance** (web sources) and a
   **"add to segment / dismiss / mark in-CRM"** action + the VerifyDot trust dots.
6. **CRM overlap** — of the competitors in this sector, how many are already in our CRM
   (`origin='crm'` / matched) vs net-new (`origin='ai'`). A small stat + filter.
7. **Cross-segment signals & watchlist** (existing roll-ups, now segment-aware).
8. **Ask across segments** (existing Q&A, now sector-wide).

I'll spec exact layouts when we build §1–4 of the plan; flag any you want dropped/added.

## 9. Recommended sequencing (need your go-ahead)

Given the size, I suggest **two milestones**:

- **Milestone 1 — Re-architecture (do now):** rename Workspace→Segment (clean rebuild),
  Company↔Segment N:N with `company_segments` (per-segment fields), list-valued Segment
  column in ingestion, Sector aggregation, **move CSV import to Sector level**, and the
  **richer Sector UI §8 items 1–4 + 6**. End state: everything we have today, re-modelled
  correctly + the company×segment matrix.
- **Milestone 2 — AI enrichment + company-first flow (next):** `origin` field +
  enrichment runs (LLM **+ web scraping**) that add `origin='ai'` competitors; the
  **company-first flow** (CRM select / `[+]` manual add on the pipeline → suggest
  sector+segments → market research → add companies); Sector UI §8 item 5.

**Question:** proceed with **Milestone 1 now**, Milestone 2 right after? Or do you want
everything in one pass? (M1 is re-architecture of existing features; M2 is the heaviest
new capability — web research + new flows.)
