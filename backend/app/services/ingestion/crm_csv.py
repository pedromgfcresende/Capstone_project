"""Ingest XAnge's Affinity CRM lead exports into crm_companies.

Accepts one or more CSVs. Each file may carry a lead_status (hot/pass/unknown);
rows are concatenated, deduped on organization_id, mapped to core columns, and
everything else is stored in `extra`.

Affinity + Dealroom enrichment produces *duplicate* `Year Founded` and
`Number of Employees` columns (pandas reads the second as `…​.1`). Per the
Comparative-tab spec these must be coalesced into one trusted value, and
employee counts that arrive as ranges ("11-50") parsed to their midpoint so the
2x2 matrix can position the company.
"""

from __future__ import annotations

import re

import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from app.db.models import CrmCompany, Upload
from app.services.axes import coalesce, parse_employee_count, parse_year
from app.services.ingestion.common import build_extra, clean, to_date, to_float

# CSV column -> model field. Year Founded / employee count are handled specially
# below (coalesced + parsed), so they are not in this straight map.
CORE_MAP = {
    "Affinity Row ID": "affinity_row_id",
    "Organization Id": "organization_id",
    "Name": "name",
    "Website": "website",
    "Status": "affinity_status",
    "Owner": "owner",
    "Jenny Tag": "tag",
    "Investors": "investors",
    "Investment Stage": "investment_stage",
    "Location (Country)": "country",
    "Industry XAnge": "industry_xange",
    "Description": "description",
    "Total Funding Amount (USD)": "total_funding_usd",
    "Total Funding Amount (EUR)": "total_funding_eur",
    "LinkedIn URL": "linkedin_url",
    "Dealroom.co URL": "dealroom_url",
    "Last Email": "last_email",
    "Last Meeting": "last_meeting",
    "Next Meeting": "next_meeting",
    "lead_status": "lead_status",
}

# Columns consumed by the special structured-field handling (kept out of `extra`).
_STRUCTURED_COLUMNS = {"Year Founded", "Number of Employees", "Employees (Current)"}
# Duplicate-header base names to coalesce (merges "X" with "X.1", "X.2", …).
_DUPLICATE_BASES = ("Year Founded", "Number of Employees")

_FLOAT_FIELDS = {"total_funding_usd", "total_funding_eur"}
_DATE_FIELDS = {"last_email", "last_meeting", "next_meeting"}


def _blank_to_na(series: pd.Series) -> pd.Series:
    """Treat empty/`n/a` strings as missing so combine_first skips them."""
    out = series.copy()
    blank = out.astype(str).str.strip().str.lower().isin(
        ["", "nan", "nat", "n/a", "na", "none", "null"]
    )
    out[blank] = np.nan
    return out


def coalesce_duplicate_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Merge duplicate `Year Founded` / `Number of Employees` columns into one.

    Affinity/Dealroom exports carry the same field twice; pandas suffixes the
    second occurrence with `.1`. We fill the canonical column with the first
    non-blank value across all occurrences, then drop the extras.
    """
    df = df.copy()
    for base in _DUPLICATE_BASES:
        dupes = [
            c for c in df.columns
            if c == base or re.fullmatch(re.escape(base) + r"\.\d+", str(c))
        ]
        if len(dupes) <= 1:
            continue
        merged = _blank_to_na(df[dupes[0]])
        for col in dupes[1:]:
            merged = merged.combine_first(_blank_to_na(df[col]))
        df = df.drop(columns=dupes)
        df[base] = merged
    return df


def _row_to_company(row: dict) -> CrmCompany:
    fields: dict = {}
    for csv_col, model_field in CORE_MAP.items():
        if csv_col not in row:
            continue
        raw = row[csv_col]
        if model_field in _FLOAT_FIELDS:
            fields[model_field] = to_float(raw)
        elif model_field in _DATE_FIELDS:
            fields[model_field] = to_date(raw)
        else:
            fields[model_field] = clean(raw)

    # Structured axis fields: coalesced value, parsed (employee ranges -> midpoint)
    fields["year_founded"] = parse_year(row.get("Year Founded"))
    fields["employees_current"] = parse_employee_count(
        coalesce(row.get("Number of Employees"), row.get("Employees (Current)"))
    )

    fields["name"] = fields.get("name") or "(unnamed)"
    fields["extra"] = build_extra(row, set(CORE_MAP) | _STRUCTURED_COLUMNS)
    return CrmCompany(**fields)


def ingest_crm_frames(
    db: Session, frames: list[pd.DataFrame], filename: str | None = None
) -> Upload:
    """Ingest already-loaded dataframes (each must have a 'lead_status' column)."""
    upload = Upload(kind="crm", filename=filename, status="pending")
    db.add(upload)
    try:
        merged = pd.concat(frames, ignore_index=True)
        # merge duplicate Year Founded / Number of Employees columns into one
        merged = coalesce_duplicate_columns(merged)
        # dedupe on organization_id when present (keep first occurrence)
        if "Organization Id" in merged.columns:
            merged = merged.drop_duplicates(subset=["Organization Id"], keep="first")

        records = merged.to_dict(orient="records")
        companies = [_row_to_company(r) for r in records]
        db.add_all(companies)
        upload.row_count = len(companies)
        upload.status = "done"
        db.commit()
    except Exception as exc:  # noqa: BLE001 - record failure, re-raise
        upload.status = "failed"
        upload.error = str(exc)
        db.commit()
        raise
    db.refresh(upload)
    return upload


def ingest_crm_files(db: Session, files: dict[str, bytes]) -> Upload:
    """files: {filename: csv_bytes}. lead_status inferred from filename."""
    import io

    frames = []
    for fname, content in files.items():
        df = pd.read_csv(io.BytesIO(content))
        df["lead_status"] = _status_from_filename(fname)
        frames.append(df)
    return ingest_crm_frames(db, frames, filename="; ".join(files.keys()))


def _status_from_filename(fname: str) -> str:
    low = fname.lower()
    if "hot" in low:
        return "hot"
    if "pass" in low:
        return "pass"
    if "unknown" in low:
        return "unknown"
    return "unknown"
