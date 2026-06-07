"""Shared ingestion helpers — the 'fixed core + flexible extras' rule.

Given a row and a {csv_column -> model_field} mapping, split into typed core
fields and an `extra` dict of everything else, dropping empties and the
unexportable Crunchbase columns.
"""

from __future__ import annotations

import math
from typing import Any

import pandas as pd


def clean(value: Any) -> Any:
    """Convert pandas NaN/NaT and blank strings to None; trim strings."""
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    if value is pd.NaT:
        return None
    if isinstance(value, str):
        v = value.strip()
        return v or None
    return value


def to_int(value: Any) -> int | None:
    value = clean(value)
    if value is None:
        return None
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return None


def to_float(value: Any) -> float | None:
    value = clean(value)
    if value is None:
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def to_date(value: Any):
    """Parse a CSV date (Affinity uses MM/DD/YYYY) to a date, else None."""
    value = clean(value)
    if value is None:
        return None
    ts = pd.to_datetime(value, errors="coerce")
    if ts is pd.NaT or pd.isna(ts):
        return None
    return ts.date()


def is_droppable_column(col: str) -> bool:
    """Skip columns that never carry exportable data."""
    return "Not available for export" in col


def build_extra(row: dict, mapped_columns: set[str]) -> dict:
    """Everything not mapped to a core field, cleaned, as JSON-safe dict."""
    extra: dict[str, Any] = {}
    for col, val in row.items():
        if col in mapped_columns or is_droppable_column(col):
            continue
        cleaned = clean(val)
        if cleaned is None:
            continue
        # JSON cannot hold pandas/np scalars cleanly — coerce to primitives
        if isinstance(cleaned, float):
            cleaned = round(cleaned, 4)
        elif not isinstance(cleaned, (str, int, bool)):
            cleaned = str(cleaned)
        extra[col] = cleaned
    return extra
