"""Ingest a competitor-analysis CSV -> one Workspace + its companies.

Maps the known columns (see the screenshot/CLAUDE.md) to typed fields and keeps
any extra columns in `extra`. The focal company is the row with no
'Competitive Potential' tier (the subject of the analysis).
"""

from __future__ import annotations

import io

import pandas as pd
from sqlalchemy.orm import Session

from app.db.models import Company, Sector, Upload, Workspace
from app.services.ingestion.common import build_extra, clean, to_int

# CSV column -> model field. Several spellings tolerated for the notes column.
CORE_MAP = {
    "Competitive Potential": "competitive_potential",
    "Name": "name",
    "Founded": "founded",
    "HQ": "geography",
    "Funding Status": "funding_status",
    "Funding Amount": "funding_amount",
    "Top Investors": "top_investors",
    "Description": "description",
    "Segment": "segment",
    "Primary Customer": "primary_customer",
    "Notes/ Relevance": "notes",
    "Notes/Relevance": "notes",
    "Notes / Relevance": "notes",
    "Notes": "notes",
}


def _row_to_company(row: dict) -> Company:
    fields: dict = {}
    for csv_col, model_field in CORE_MAP.items():
        if csv_col not in row:
            continue
        raw = row[csv_col]
        if model_field == "competitive_potential":
            fields[model_field] = to_int(raw)
        else:
            fields[model_field] = clean(raw)

    fields["name"] = fields.get("name") or "(unnamed)"
    fields["focal"] = fields.get("competitive_potential") is None
    fields["extra"] = build_extra(row, set(CORE_MAP.keys()))
    return Company(**fields)


def ingest_competitor_df(
    db: Session,
    df: pd.DataFrame,
    *,
    title: str,
    sector_id=None,
    sector_label: str | None = None,
    filename: str | None = None,
) -> Workspace:
    """Create a workspace (under an existing or new sector) from the dataframe."""
    upload = Upload(kind="competitor", filename=filename, status="pending")
    db.add(upload)
    try:
        # Resolve sector
        sector = None
        if sector_id is not None:
            sector = db.get(Sector, sector_id)
        if sector is None:
            label = sector_label or "Uncategorised"
            sector = db.query(Sector).filter(Sector.label == label).first()
            if sector is None:
                sector = Sector(label=label)
                db.add(sector)
                db.flush()

        companies = [_row_to_company(r) for r in df.to_dict(orient="records")]
        focal = next((c for c in companies if c.focal), None)

        workspace = Workspace(
            sector_id=sector.id,
            title=title,
            focal_company=focal.name if focal else None,
            status="ready",
            source_upload_id=upload.id,
            companies=companies,
        )
        db.add(workspace)
        db.flush()

        upload.row_count = len(companies)
        upload.status = "done"
        upload.workspace_id = workspace.id
        db.commit()
        db.refresh(workspace)
        return workspace
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        upload.status = "failed"
        upload.error = str(exc)
        db.add(upload)
        db.commit()
        raise


def ingest_competitor_bytes(
    db: Session, content: bytes, *, title: str, sector_id=None, sector_label=None, filename=None
) -> Workspace:
    df = pd.read_csv(io.BytesIO(content))
    return ingest_competitor_df(
        db, df, title=title, sector_id=sector_id, sector_label=sector_label, filename=filename
    )
