"""Render the Postgres data schema (ER diagram) to a PNG. Reflects app/db/models.py.

Run:  python3 backend/scripts/make_schema_png.py
"""

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

BG = "#f4f1ea"; CARD = "#ffffff"; INK = "#1a1a1a"; SOFT = "#4a4a4a"
MUTE = "#8a8580"; RULE = "#d8d2c5"; PK = "#b8401f"; FK = "#2a5fd4"; JSONB = "#5a3d9a"; HDR = "#1a1a1a"

TABLES = {
    "sectors": ["id  ·  uuid  PK", "label  ·  text", "synthesis_headline / _body  ·  text",
                "synthesis_extra  ·  jsonb  (watchlist, questions)", "created_at / updated_at"],
    "segments": ["id  ·  uuid  PK", "sector_id  →  sectors.id  (FK, cascade)", "title  ·  text",
                 "focal_company  ·  text", "thesis / summary / key_insight", "status  ·  draft|synthesizing|ready",
                 "source_upload_id  ⇢  uploads.id  (soft)", "created_at / updated_at"],
    "companies": ["id  ·  uuid  PK", "sector_id  →  sectors.id  (FK, cascade)", "name  ·  text",
                  "founded / geography  ·  text", "funding_status / funding_amount", "top_investors / description",
                  "primary_customer  ·  text", "origin  ·  csv|crm|ai", "crm_company_id  ·  uuid (M2)",
                  "extra  ·  jsonb"],
    "company_segments": ["id  ·  uuid  PK", "company_id  →  companies.id  (FK)", "segment_id  →  segments.id  (FK)",
                         "competitive_potential  ·  int", "focal  ·  bool", "notes  ·  text",
                         "UNIQUE(company_id, segment_id)"],
    "segment_synthesis": ["id  ·  uuid  PK", "segment_id  →  segments.id  (FK, unique 1:1)",
                          "overview / comparative  ·  jsonb", "differentiation / summary  ·  jsonb",
                          "commentary / sources  ·  jsonb", "model  ·  text", "generated_at  ·  ts"],
    "uploads": ["id  ·  uuid  PK", "sector_id  →  sectors.id  (FK, set null)", "kind  ·  competitor|crm",
                "filename  ·  text", "row_count  ·  int", "status  ·  pending|done|failed", "error  ·  text"],
    "verifications": ["id  ·  uuid  PK", "entity_type  ·  segment_synthesis|sector", "entity_id  ⇢  uuid (polymorphic)",
                      "claim_key  ·  text", "status  ·  ai|verified|needs", "verified_by / verified_at",
                      "UNIQUE(entity_type, entity_id, claim_key)"],
    "ai_enrichment": ["id  ·  uuid  PK", "sector_id  →  sectors.id  (FK, cascade)", "focal_company_id  ·  uuid",
                      "segment_id  ·  uuid", "status  ·  pending|done|failed", "query_plan  ·  jsonb",
                      "result  ·  jsonb  (competitors + sources)", "model / error"],
    "crm_companies": ["id  ·  uuid  PK", "affinity_row_id / organization_id", "name / website",
                      "lead_status  ·  text", "affinity_status / owner / tag", "investors / investment_stage",
                      "country / industry_xange", "description  ·  text", "year_founded  ·  int",
                      "total_funding_usd / _eur  ·  float", "linkedin_url / dealroom_url",
                      "last_email / last_meeting / next_meeting", "employees_current  ·  int", "extra  ·  jsonb"],
}

POS = {
    "sectors":            (0.4, 18.6),
    "segments":           (0.4, 14.7),
    "companies":          (0.4, 9.6),
    "company_segments":   (6.7, 12.4),
    "segment_synthesis":  (6.7, 18.6),
    "uploads":            (6.7, 7.6),
    "verifications":      (6.7, 3.6),
    "crm_companies":      (12.9, 17.6),
    "ai_enrichment":      (12.9, 6.0),
}
WIDTH = {k: 5.8 for k in TABLES}; WIDTH["company_segments"] = 5.8; WIDTH["crm_companies"] = 6.0
HDR_H, ROW_H, PAD = 0.62, 0.42, 0.12


def kind_of(r):
    if "PK" in r: return "pk"
    if "→" in r: return "fk"
    if "⇢" in r: return "soft"
    if "UNIQUE" in r: return "uniq"
    if "jsonb" in r: return "json"
    return "col"


COLOR = {"pk": PK, "fk": FK, "soft": FK, "json": JSONB, "uniq": MUTE, "col": SOFT}

fig, ax = plt.subplots(figsize=(19.5, 21), dpi=140)
ax.set_xlim(0, 19.5); ax.set_ylim(0, 21); ax.axis("off")
fig.patch.set_facecolor(BG); ax.set_facecolor(BG)
anchors = {}


def draw(name):
    x, top = POS[name]; w = WIDTH[name]; rows = TABLES[name]
    h = HDR_H + len(rows) * ROW_H + PAD
    ax.add_patch(FancyBboxPatch((x + 0.05, top - h - 0.05), w, h, boxstyle="round,pad=0.02,rounding_size=0.12", fc="#00000010", ec="none", zorder=1))
    ax.add_patch(FancyBboxPatch((x, top - h), w, h, boxstyle="round,pad=0.02,rounding_size=0.12", fc=CARD, ec=RULE, lw=1.4, zorder=2))
    ax.add_patch(FancyBboxPatch((x, top - HDR_H), w, HDR_H, boxstyle="round,pad=0.02,rounding_size=0.12", fc=HDR, ec="none", zorder=3))
    ax.text(x + 0.25, top - HDR_H / 2, name, color="#fff", fontsize=13, fontweight="bold", va="center", ha="left", family="monospace", zorder=4)
    rowys = []
    for i, r in enumerate(rows):
        ry = top - HDR_H - (i + 0.5) * ROW_H; rowys.append(ry)
        k = kind_of(r)
        ax.scatter([x + 0.28], [ry], s=26, color=COLOR[k], zorder=4)
        ax.text(x + 0.5, ry, r, color=COLOR[k] if k != "col" else INK, fontsize=9.3, va="center", ha="left", family="monospace", fontweight="bold" if k in ("pk", "fk") else "normal", zorder=4)
        if i < len(rows) - 1:
            ax.plot([x + 0.12, x + w - 0.12], [ry - ROW_H / 2, ry - ROW_H / 2], color="#efe9dd", lw=0.7, zorder=3)
    anchors[name] = {"l": x, "r": x + w, "top": top, "bot": top - h, "cx": x + w / 2, "rowy": rowys}


for t in TABLES: draw(t)


def edge(src, srow, dst, color, dashed=False, rad=0.0, label=""):
    a, b = anchors[src], anchors[dst]
    ay = a["rowy"][srow]; by = b["rowy"][0]
    same = abs(a["cx"] - b["cx"]) < 0.5
    if same:
        ax_, bx_ = a["cx"], b["cx"]
        if by > ay: ay = a["top"]; by = b["bot"]
        else: ay = a["bot"]; by = b["top"]
    else:
        ax_ = a["r"] if b["cx"] >= a["cx"] else a["l"]
        bx_ = b["l"] if b["cx"] >= a["cx"] else b["r"]
    ax.annotate("", xy=(bx_, by), xytext=(ax_, ay), zorder=1.5,
                arrowprops=dict(arrowstyle="-|>", color=color, lw=1.8, linestyle="--" if dashed else "-",
                                connectionstyle="arc3,rad=%.2f" % rad, shrinkA=4, shrinkB=4))
    if label:
        ax.text((ax_ + bx_) / 2, (ay + by) / 2 + (0 if same else 0.22), label, fontsize=8, color=color, ha="center", va="center",
                family="monospace", fontweight="bold", bbox=dict(boxstyle="round,pad=0.15", fc=BG, ec="none"), zorder=5)


edge("segments", 1, "sectors", FK, label="N:1")
edge("companies", 1, "sectors", FK, label="N:1")
edge("company_segments", 1, "companies", FK, rad=0.15, label="N:1")
edge("company_segments", 2, "segments", FK, rad=-0.15, label="N:1")
edge("segment_synthesis", 1, "segments", FK, rad=-0.15, label="1:1")
edge("uploads", 1, "sectors", FK, rad=-0.2, label="N:1")
edge("segments", 6, "uploads", FK, dashed=True, rad=-0.35, label="soft")
edge("verifications", 2, "segment_synthesis", FK, dashed=True, rad=-0.3, label="polymorphic")

ax.text(0.4, 20.2, "XAnge Market Intelligence — Postgres schema", fontsize=20, fontweight="bold", color=INK)
ax.text(0.4, 19.75, "sectors → segments → companies, linked many-to-many via company_segments (a company can compete in several segments)", fontsize=11, color=SOFT)
ax.text(12.9, 19.75, "CRM / pipeline — separate domain", fontsize=11, color=SOFT, fontweight="bold")
ax.text(12.9, 9.0, "M2: companies.origin (csv|crm|ai) + crm_company_id\nlink AI-found competitors back to the CRM.\nai_enrichment logs each market-research run.", fontsize=9.5, color=MUTE, style="italic", va="top")

ly = 1.2
for i, (lab, c) in enumerate([("PK", PK), ("FK / ref", FK), ("jsonb", JSONB), ("column", SOFT)]):
    ax.scatter([0.5 + i * 2.7], [ly], s=40, color=c); ax.text(0.7 + i * 2.7, ly, lab, fontsize=9, va="center", color=SOFT)
ax.text(0.4, ly + 0.55, "Legend", fontsize=10, fontweight="bold", color=INK, family="monospace")
ax.text(0.4, ly - 0.55, "──▶ FK (enforced)     – – ▶ soft / polymorphic     company_segments = the N:N join", fontsize=9, color=MUTE, family="monospace")

fig.savefig("data_schema.png", facecolor=BG, bbox_inches="tight", pad_inches=0.3)
print("wrote data_schema.png")
