"""Ingest XAnge's Affinity CRM lead exports into crm_companies.

Accepts one or more CSVs. Each file may carry a lead_status (hot/pass/unknown);
rows are concatenated, deduped on organization_id, mapped to core columns, and
everything else is stored in `extra`.
"""

from __future__ import annotations

import pandas as pd
from sqlalchemy.orm import Session

from app.db.models import CrmCompany, Upload
from app.services.ingestion.common import build_extra, clean, to_date, to_float, to_int

# CSV column -> model field
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
    "Year Founded": "year_founded",
    "Total Funding Amount (USD)": "total_funding_usd",
    "Total Funding Amount (EUR)": "total_funding_eur",
    "LinkedIn URL": "linkedin_url",
    "Dealroom.co URL": "dealroom_url",
    "Last Email": "last_email",
    "Last Meeting": "last_meeting",
    "Next Meeting": "next_meeting",
    "Employees (Current)": "employees_current",
    "lead_status": "lead_status",
}

_INT_FIELDS = {"year_founded", "employees_current"}
_FLOAT_FIELDS = {"total_funding_usd", "total_funding_eur"}
_DATE_FIELDS = {"last_email", "last_meeting", "next_meeting"}


def _row_to_company(row: dict) -> CrmCompany:
    fields: dict = {}
    for csv_col, model_field in CORE_MAP.items():
        if csv_col not in row:
            continue
        raw = row[csv_col]
        if model_field in _INT_FIELDS:
            fields[model_field] = to_int(raw)
        elif model_field in _FLOAT_FIELDS:
            fields[model_field] = to_float(raw)
        elif model_field in _DATE_FIELDS:
            fields[model_field] = to_date(raw)
        else:
            fields[model_field] = clean(raw)

    fields["name"] = fields.get("name") or "(unnamed)"
    fields["extra"] = build_extra(row, set(CORE_MAP.keys()))
    return CrmCompany(**fields)


def ingest_crm_frames(
    db: Session, frames: list[pd.DataFrame], filename: str | None = None
) -> Upload:
    """Ingest already-loaded dataframes (each must have a 'lead_status' column)."""
    upload = Upload(kind="crm", filename=filename, status="pending")
    db.add(upload)
    try:
        merged = pd.concat(frames, ignore_index=True)
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
