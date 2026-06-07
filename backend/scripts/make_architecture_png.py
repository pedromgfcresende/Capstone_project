"""Render the system-architecture diagram for the XAnge Market Intelligence
platform to a PNG (nested-container flow, editorial palette).

Run:  python3 backend/scripts/make_architecture_png.py
Writes: architecture.png  (repo root)
"""

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

# ── palette (project editorial system) ──────────────────────────────────────
BG = "#ecebe4"
INK = "#1a1a1a"
SOFT = "#4a4a4a"
MUTE = "#7d776e"
WHITE = "#ffffff"

BROWSER_FC, BROWSER_HDR = "#eef0ff", "#5b6ee0"
RUNTIME_FC, RUNTIME_HDR = "#f0eee6", "#8a8580"
FASTAPI_FC, FASTAPI_HDR = "#fff7ec", "#d6891c"
DB_FC, DB_HDR = "#e9f1fb", "#3b7bd0"
INGEST_FC, INGEST_HDR = "#e6f5f1", "#1f9e8f"
SYNTH_FC, SYNTH_HDR = "#f2ecff", "#7a3fd0"
ENRICH_FC, ENRICH_HDR = "#fdebf0", "#c0306a"
VERIFY_FC, VERIFY_HDR = "#eaf6ea", "#2d8a4f"
EXT_FC, EXT_HDR = "#eef6ee", "#2d8a4f"
CHIP = "#ffffff"
WRITE, READ = "#b8401f", "#1f7a4d"

W, H = 16.0, 23.0
fig, ax = plt.subplots(figsize=(W, H), dpi=140)
ax.set_xlim(0, W)
ax.set_ylim(0, H)
ax.axis("off")
fig.patch.set_facecolor(BG)
ax.set_facecolor(BG)


# ── helpers ─────────────────────────────────────────────────────────────────
def panel(x, y, w, h, fc, ec, lw=1.4, z=2, shadow=True, rounding=0.14):
    if shadow:
        ax.add_patch(FancyBboxPatch((x + 0.05, y - 0.05), w, h,
                     boxstyle=f"round,pad=0.02,rounding_size={rounding}",
                     fc="#00000012", ec="none", zorder=z - 0.5))
    ax.add_patch(FancyBboxPatch((x, y), w, h,
                 boxstyle=f"round,pad=0.02,rounding_size={rounding}",
                 fc=fc, ec=ec, lw=lw, zorder=z))


def pill(x, y_top, text, fc, fg="#ffffff", fs=11.5, pad=0.16):
    """Header pill anchored with its TOP-LEFT corner near (x, y_top)."""
    ax.text(x, y_top, text, color=fg, fontsize=fs, fontweight="bold",
            va="center", ha="left", family="monospace", zorder=6,
            bbox=dict(boxstyle=f"round,pad={pad}", fc=fc, ec="none"))


def txt(x, y, s, fs=9.5, color=SOFT, weight="normal", ha="left", va="center",
        family="sans-serif", style="normal"):
    return ax.text(x, y, s, fontsize=fs, color=color, fontweight=weight,
                   ha=ha, va=va, family=family, style=style, zorder=5)


def chip(x, y, w, h, title, body, accent, fs_t=10, fs_b=8.6):
    ax.add_patch(FancyBboxPatch((x, y), w, h,
                 boxstyle="round,pad=0.02,rounding_size=0.08",
                 fc=CHIP, ec="#e2dccf", lw=1.1, zorder=4))
    ax.add_patch(FancyBboxPatch((x, y + h - 0.07), 0.12, 0.07 - h, mutation_aspect=1,
                 boxstyle="square,pad=0", fc=accent, ec="none", zorder=4.5))
    txt(x + 0.28, y + h - 0.32, title, fs=fs_t, color=INK, weight="bold")
    if body:
        ax.text(x + 0.28, y + h - 0.62, body, fontsize=fs_b, color=SOFT,
                va="top", ha="left", family="sans-serif", zorder=5,
                wrap=True)


def varrow(x, y1, y2, color="#8a8580", label="", lx=0.0):
    ax.annotate("", xy=(x, y2), xytext=(x, y1), zorder=3,
                arrowprops=dict(arrowstyle="-|>", color=color, lw=2.0))
    if label:
        txt(x + lx, (y1 + y2) / 2, label, fs=9, color=MUTE, ha="left",
            family="monospace")


def harrow(x1, x2, y, color, label, dashed=False, up=0.16):
    ax.annotate("", xy=(x2, y), xytext=(x1, y), zorder=3,
                arrowprops=dict(arrowstyle="-|>", color=color, lw=1.7,
                                linestyle="--" if dashed else "-"))
    if label:
        ax.text((x1 + x2) / 2, y + up, label, fontsize=7.8, color=color,
                ha="center", va="center", family="monospace", fontweight="bold",
                bbox=dict(boxstyle="round,pad=0.12", fc=BG, ec="none"), zorder=6)


def step(x, y, n, label, sub, accent, w=2.55, h=1.0):
    ax.add_patch(FancyBboxPatch((x, y), w, h,
                 boxstyle="round,pad=0.02,rounding_size=0.07",
                 fc=CHIP, ec="#e2dccf", lw=1.1, zorder=4))
    ax.add_patch(plt.Circle((x + 0.32, y + h - 0.3), 0.16, color=accent, zorder=5))
    ax.text(x + 0.32, y + h - 0.3, str(n), fontsize=9, color="#fff",
            ha="center", va="center", fontweight="bold", zorder=6)
    txt(x + 0.58, y + h - 0.3, label, fs=8.8, color=INK, weight="bold")
    ax.text(x + 0.18, y + h - 0.56, sub, fontsize=7.6, color=SOFT, va="top",
            ha="left", family="sans-serif", zorder=5)


# ── title ────────────────────────────────────────────────────────────────────
ax.text(W / 2, 22.4, "XAnge Market Intelligence — System Architecture",
        fontsize=21, fontweight="bold", color=INK, ha="center")
ax.text(W / 2, 21.95, "Analyst-in-the-loop competitive-intelligence platform",
        fontsize=12.5, color=MUTE, ha="center")

# ── USER'S BROWSER ───────────────────────────────────────────────────────────
panel(0.5, 19.3, 15.0, 2.25, BROWSER_FC, BROWSER_HDR)
pill(0.85, 21.3, "USER'S BROWSER", BROWSER_HDR)
txt(0.9, 20.75, "React 19 + Vite SPA  ·  Tailwind v4 editorial UI  ·  recharts  ·  lucide-react",
    fs=11, color=INK, weight="bold")
ax.text(0.9, 20.32,
        "Sidebar nav tree  ·  Sector canvas (Company × Segment matrix, thesis, watchlist, “Ask across segments” Q&A)",
        fontsize=9.3, color=SOFT, va="top", ha="left", family="sans-serif")
ax.text(0.9, 20.0,
        "Segment tabs: AI Analysis · Market Overview · Players · Comparative · Differentiation · Sources   |   CRM pipeline   |   VerifyDot trust dots",
        fontsize=9.3, color=SOFT, va="top", ha="left", family="sans-serif")

varrow(8.0, 19.25, 18.7, label="  HTTP · REST / JSON · API :8000", lx=0.0)

# ── RUNTIME outer container ──────────────────────────────────────────────────
panel(0.4, 3.9, 15.2, 14.7, RUNTIME_FC, RUNTIME_HDR, lw=1.6)
pill(0.75, 18.35, "RUNTIME  —  local / Docker compose", RUNTIME_HDR)

# ── FASTAPI container ────────────────────────────────────────────────────────
FX, FW = 0.85, 9.55
panel(FX, 4.35, FW, 13.45, FASTAPI_FC, FASTAPI_HDR, lw=1.5)
pill(FX + 0.3, 17.55, "FASTAPI  ·  uvicorn :8000", FASTAPI_HDR)
FCX = FX + FW / 2  # 5.625

# INGESTION
panel(1.25, 15.25, 8.75, 1.95, INGEST_FC, INGEST_HDR, lw=1.2, shadow=False)
pill(1.55, 17.0, "INGESTION  ·  pandas CSV → core + JSONB extras", INGEST_HDR, fs=9.5)
chip(1.5, 15.45, 4.05, 1.25, "competitor_csv.py",
     "Builds a Sector + Segments.\nList-valued Segment column → N:N\ncompany_segments. Focal = untiered row.",
     INGEST_HDR)
chip(5.7, 15.45, 4.1, 1.25, "crm_csv.py",
     "Affinity export (Hot / Pass / Unknown).\n~90 sparse cols → typed core +\nextra JSONB.  825 rows seeded.",
     INGEST_HDR)

varrow(FCX, 15.2, 14.9)

# SYNTHESIS (LangChain)
panel(1.25, 11.55, 8.75, 3.3, SYNTH_FC, SYNTH_HDR, lw=1.2, shadow=False)
pill(1.55, 14.65, "SYNTHESIS  ·  LangChain  (provider-abstracted)", SYNTH_HDR, fs=9.5)
ax.text(1.6, 14.18,
        "init_chat_model → Claude Sonnet 4.5 (default)  /  OpenAI gpt-4o-mini   ·   .with_structured_output (Pydantic)",
        fontsize=8.3, color=SYNTH_HDR, va="top", ha="left", family="monospace", fontweight="bold")
chip(1.5, 11.75, 2.78, 2.1, "Segment synthesis",
     "summary · key insight ·\nmarket read (TAM/SAM/\nSOM/CAGR, tailwinds,\nheadwinds, regulatory) ·\ncomparative · differen-\ntiation · commentary ·\n4–8 verifiable claims",
     SYNTH_HDR, fs_t=9, fs_b=7.8)
chip(4.4, 11.75, 2.78, 2.1, "Sector synthesis",
     "headline (the bet) ·\nbody · watchlist (3–6\ncompanies) · open\nquestions (3–5).\n\nAggregates all\nsegments in a sector.",
     SYNTH_HDR, fs_t=9, fs_b=7.8)
chip(7.3, 11.75, 2.5, 2.1, "Cross-segment Q&A",
     "“Ask across segments”\n→ grounded answer +\ncitations (segment\ntitles relied on).\n\ntemp 0.2",
     SYNTH_HDR, fs_t=9, fs_b=7.8)

varrow(FCX, 11.5, 11.2)

# AI ENRICHMENT (M2)
panel(1.25, 6.35, 8.75, 4.85, ENRICH_FC, ENRICH_HDR, lw=1.2, shadow=False)
pill(1.55, 11.0, "AI ENRICHMENT  ·  web research  (M2)", ENRICH_HDR, fs=9.5)
ax.text(1.6, 10.55,
        "Finds competitors NOT in the CRM. Multi-step LangChain pipeline; every result carries source URLs + confidence.",
        fontsize=8.1, color=ENRICH_HDR, va="top", ha="left", family="sans-serif", fontweight="bold")
# pipeline steps — two rows of 3
sy2, sy1 = 8.95, 7.75
step(1.5, sy2, 1, "plan queries", "LLM → 3–4 search queries", ENRICH_HDR)
step(4.15, sy2, 2, "search", "Tavily web search API", "#1f9e8f")
step(6.8, sy2, 3, "extract", "LLM → named candidates", ENRICH_HDR)
step(1.5, sy1, 4, "fetch pages", "trafilatura → Playwright", "#3b7bd0")
step(4.15, sy1, 5, "finalize", "LLM → competitors+conf.", ENRICH_HDR)
step(6.8, sy1, 6, "persist", "origin=ai · CRM match", WRITE)
# connecting little arrows
for ax1 in (4.05, 6.7):
    ax.annotate("", xy=(ax1 + 0.05, sy2 + 0.5), xytext=(ax1 - 0.05, sy2 + 0.5),
                arrowprops=dict(arrowstyle="-|>", color=MUTE, lw=1.3), zorder=4)
for ax1 in (4.05, 6.7):
    ax.annotate("", xy=(ax1 + 0.05, sy1 + 0.5), xytext=(ax1 - 0.05, sy1 + 0.5),
                arrowprops=dict(arrowstyle="-|>", color=MUTE, lw=1.3), zorder=4)
ax.text(1.6, 7.45,
        "Entry points:  POST /sectors/{id}/enrich   ·   POST /crm/companies/{id}/analyse  (company-first: LLM suggests sector + segment, then researches)",
        fontsize=7.7, color=SOFT, va="top", ha="left", family="monospace")

varrow(FCX, 6.3, 6.0)

# VERIFICATION
panel(1.25, 4.55, 8.75, 1.45, VERIFY_FC, VERIFY_HDR, lw=1.2, shadow=False)
pill(1.55, 5.85, "VERIFICATION  ·  the trust spine", VERIFY_HDR, fs=9.5)
ax.text(1.6, 5.4,
        "Every surfaced claim → VerifyDot state:  AI-generated → human-verified → needs-verification.",
        fontsize=8.6, color=INK, va="top", ha="left", family="sans-serif", fontweight="bold")
ax.text(1.6, 5.08,
        "PATCH /verifications  persists status + verified_by + verified_at, keyed by (entity, claim_key).",
        fontsize=8.0, color=SOFT, va="top", ha="left", family="monospace")

# ── POSTGRESQL container ─────────────────────────────────────────────────────
DX, DW = 11.6, 3.6
panel(DX, 4.35, DW, 13.45, DB_FC, DB_HDR, lw=1.5)
pill(DX + 0.3, 17.55, "POSTGRESQL 17  ·  :5544", DB_HDR, fs=10)
ax.text(DX + DW / 2, 17.0, "SQLAlchemy 2.0  ·  Alembic", fontsize=8.4, color=DB_HDR,
        ha="center", family="monospace", fontweight="bold")
tables = [
    ("sectors", "label · AI through-line"),
    ("segments", "sub-market · synthesis"),
    ("companies", "origin csv|crm|ai"),
    ("company_segments", "the N:N join (tier/focal)"),
    ("segment_synthesis", "market read · claims"),
    ("verifications", "VerifyDot state"),
    ("uploads", "CSV provenance"),
    ("ai_enrichment", "research-run log"),
    ("crm_companies", "Affinity ~825 rows"),
]
ty = 16.2
for name, sub in tables:
    ax.add_patch(FancyBboxPatch((DX + 0.3, ty - 0.92), DW - 0.6, 0.9,
                 boxstyle="round,pad=0.02,rounding_size=0.06",
                 fc=CHIP, ec="#cfe0f3", lw=1.0, zorder=4))
    txt(DX + 0.5, ty - 0.34, name, fs=9.6, color=INK, weight="bold", family="monospace")
    txt(DX + 0.5, ty - 0.68, sub, fs=7.8, color=MUTE)
    ty -= 1.04

# DB arrows in the labeled channel between FastAPI (right x=10.4) and DB (x=11.6)
harrow(10.42, 11.58, 16.2, WRITE, "write core")
harrow(10.42, 11.58, 13.0, READ, "read", dashed=True)
harrow(10.42, 11.58, 12.2, WRITE, "write synth")
harrow(10.42, 11.58, 8.6, WRITE, "write ai")
harrow(10.42, 11.58, 5.2, WRITE, "upsert verify")

varrow(8.0, 3.85, 3.5)

# ── EXTERNAL SERVICES band ───────────────────────────────────────────────────
panel(0.5, 1.0, 15.0, 2.35, EXT_FC, EXT_HDR, lw=1.5)
pill(0.85, 3.1, "EXTERNAL SERVICES", EXT_HDR)
exts = [
    ("Anthropic / OpenAI", "LLM — all synthesis, Q&A,\nenrichment reasoning", SYNTH_HDR),
    ("Tavily", "web search API\n(grounded result snippets)", "#1f9e8f"),
    ("Target websites", "trafilatura + headless\nPlaywright (Chromium) scrape", "#3b7bd0"),
    ("Affinity CRM export", "3 CSVs (Hot/Pass/Unknown)\n→ pipeline view", DB_HDR),
]
cw = 3.55
for i, (t, b, acc) in enumerate(exts):
    cx = 0.85 + i * 3.7
    chip(cx, 1.25, cw, 1.45, t, b, acc, fs_t=10, fs_b=8.2)

fig.savefig("architecture.png", facecolor=BG, bbox_inches="tight", pad_inches=0.35)
print("wrote architecture.png")
