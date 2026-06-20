"""Funding-stage consolidation.

CRM/competitor funding values are messy free text ("Seed + Series A (Redpoint,
LocalGlobe)", "$16.6M (Seed-Series A)", "Acquired by X", "IPO 2021"). The sector
analysis only wants a small, comparable set of canonical stages:

    Pre-Seed · Seed · Series A · Series B · Series C · Series D · Public · Acquired

`normalize_funding_stage` maps any raw value into one of those (latest stage
wins when several are mentioned), or None when nothing recognisable is present.
"""

from __future__ import annotations

import re

# canonical buckets, earliest -> latest (the order the analysis displays them in)
CANONICAL_STAGES = [
    "Pre-Seed",
    "Seed",
    "Series A",
    "Series B",
    "Series C",
    "Series D",
    "Public",
    "Acquired",
]
_SERIES_BUCKET = ["Series A", "Series B", "Series C", "Series D"]


def normalize_funding_stage(raw: str | None) -> str | None:
    """Map a raw funding string to one canonical stage (or None)."""
    if not raw:
        return None
    s = str(raw).lower()

    # exit states win outright
    if "acqui" in s or "m&a" in s or "merger" in s:
        return "Acquired"
    if re.search(r"\b(ipo|public|publicly|listed|nasdaq|nyse|euronext)\b", s):
        return "Public"

    # latest private round mentioned wins ("Seed + Series A" -> Series A);
    # Series E and beyond collapse into the top bucket (Series D)
    letters = re.findall(r"series\s*-?\s*([a-h])\b", s)
    if letters:
        idx = max(ord(c) - ord("a") for c in letters)
        return _SERIES_BUCKET[min(idx, len(_SERIES_BUCKET) - 1)]

    # pre-seed must be checked before seed (it contains "seed")
    if "pre-seed" in s or "preseed" in s or "pre seed" in s or "angel" in s:
        return "Pre-Seed"
    if "seed" in s:
        return "Seed"
    return None
