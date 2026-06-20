"""Structured-axis parsing + cutoffs for the Comparative (2x2) tab.

The Comparative tab plots companies on a transparent 2x2 grid whose positions
come *only* from structured fields — never from an LLM score (per the design
spec, LLM scoring is inconsistent across segments). This module turns the messy
string values that live on companies (CRM fields, competitor-CSV cells, AI
enrichment) into clean numerics, and defines the published cutoffs.

Axes:
  - X: Funding (EUR)        cutoff €2M   (Seed -> Series A boundary)
  - Y option 1: Year Founded cutoff 2023 ("founded in last 2 years" vs older)
  - Y option 2: Employee count cutoff 15 ("real team formation" for this dataset)

Plotting rule: a company plots only when BOTH the chosen X and Y values are
present. Missing either -> it does not plot (the analyst may place it manually).
"""

from __future__ import annotations

import re
from typing import Any

# ── Published cutoffs (single source of truth; mirrored to the frontend) ───────
FUNDING_EUR_CUTOFF = 2_000_000.0   # €2M
YEAR_FOUNDED_CUTOFF = 2023
EMPLOYEE_CUTOFF = 15

# Rough USD->EUR conversion. CRM trusted values are already EUR; this only
# matters for competitor-CSV / AI values quoted in dollars. A fixed rate keeps
# positioning deterministic (no live FX, which would make the grid move).
_USD_TO_EUR = 0.92

_MULTIPLIER = {
    "k": 1_000,
    "m": 1_000_000,
    "mn": 1_000_000,
    "b": 1_000_000_000,
    "bn": 1_000_000_000,
}

# Standard employee-range buckets, used to render a "Team" label from a count.
_EMPLOYEE_BUCKETS = [
    (10, "1–10"),
    (50, "11–50"),
    (200, "51–200"),
    (500, "201–500"),
    (1000, "501–1000"),
    (5000, "1001–5000"),
    (float("inf"), "5000+"),
]


def _is_blank(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, float) and value != value:  # NaN
        return True
    s = str(value).strip().lower()
    return s in {"", "n/a", "na", "none", "null", "unknown", "-", "—"}


def parse_funding_to_eur(value: Any) -> float | None:
    """Parse a funding string/number into an absolute EUR amount.

    Handles: '€8M', '$16.6M (Seed-Series A)', '€106M', '25180000.0', 1.2e7,
    '€1.5bn', '500K'. Currency is inferred from a $/€/£ symbol (default EUR);
    USD is converted at a fixed rate. Returns None when no number is present.
    """
    if _is_blank(value):
        return None
    if isinstance(value, (int, float)):
        return float(value)

    s = str(value)
    is_usd = "$" in s or re.search(r"\busd\b", s, re.I) is not None
    # first number, optional decimal, with an optional k/m/b suffix
    m = re.search(r"(\d[\d,]*\.?\d*)\s*(bn|mn|[kmb])?", s, re.I)
    if not m:
        return None
    num = float(m.group(1).replace(",", ""))
    suffix = (m.group(2) or "").lower()
    amount = num * _MULTIPLIER.get(suffix, 1)
    if is_usd:
        amount *= _USD_TO_EUR
    return round(amount, 2)


def parse_year(value: Any) -> int | None:
    """Parse a founding year. '2021', '2021.0' -> 2021; junk/out-of-range -> None."""
    if _is_blank(value):
        return None
    if isinstance(value, (int, float)):
        year = int(value)
    else:
        m = re.search(r"(19|20)\d{2}", str(value))
        if not m:
            return None
        year = int(m.group(0))
    return year if 1800 <= year <= 2100 else None


def parse_employee_count(value: Any) -> int | None:
    """Parse an employee count to an integer, converting ranges to their midpoint.

    '11-50' -> 30, '501–1000' -> 750 (en-dash ok), '5000+' -> 5000,
    '52.0' -> 52, '42' -> 42. Returns None for blanks.
    """
    if _is_blank(value):
        return None
    if isinstance(value, (int, float)):
        return int(round(float(value)))

    s = str(value).strip().replace(",", "").replace("–", "-").replace("—", "-")
    # range a-b -> midpoint
    rng = re.match(r"^\s*(\d+)\s*-\s*(\d+)\s*$", s)
    if rng:
        lo, hi = int(rng.group(1)), int(rng.group(2))
        return int(round((lo + hi) / 2))
    # open-ended '5000+' -> lower bound
    plus = re.match(r"^\s*(\d+)\s*\+\s*$", s)
    if plus:
        return int(plus.group(1))
    # plain number (possibly decimal)
    m = re.search(r"\d+\.?\d*", s)
    return int(round(float(m.group(0)))) if m else None


def employee_range_label(count: int | None) -> str | None:
    """Render a standard team-size bucket label from a numeric employee count."""
    if count is None:
        return None
    for ceiling, label in _EMPLOYEE_BUCKETS:
        if count <= ceiling:
            return label
    return None


def coalesce(*values: Any) -> Any:
    """First non-blank value (used to combine duplicate CSV columns)."""
    for v in values:
        if not _is_blank(v):
            return v
    return None


def format_eur(amount: float | None) -> str | None:
    """Compact EUR label for display, e.g. 8_000_000 -> '€8M', 500_000 -> '€500K'."""
    if amount is None:
        return None
    if amount >= 1_000_000_000:
        return f"€{amount / 1_000_000_000:.1f}".rstrip("0").rstrip(".") + "B"
    if amount >= 1_000_000:
        return f"€{amount / 1_000_000:.1f}".rstrip("0").rstrip(".") + "M"
    if amount >= 1_000:
        return f"€{amount / 1_000:.0f}K"
    return f"€{amount:.0f}"
