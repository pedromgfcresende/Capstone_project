"""Seed the database from the real CRM CSVs and a demo competitor workspace.

Run from the backend/ dir:  uv run python -m scripts.seed
"""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

from app.config import settings
from app.db.models import Company, CrmCompany, Sector, Segment
from app.db.session import SessionLocal
from app.services.ingestion.competitor_csv import ingest_competitor_df
from app.services.ingestion.crm_csv import ingest_crm_frames

CRM_FILES = {
    "hot": "Hot Leads_Master_Scouting_unsaved_view__export_Feb-26-2026.csv",
    "pass": "Pass Leads_Master_Scouting_unsaved_view__export_Feb-26-2026.csv",
    "unknown": "Unknown Leads_Master_Scouting_unsaved_view__export_Feb-26-2026.csv",
}


def seed_crm(db) -> None:
    if db.query(CrmCompany).count() > 0:
        print("· CRM already seeded, skipping")
        return
    data_dir = (Path(__file__).resolve().parent.parent / settings.crm_data_dir).resolve()
    print(f"· Reading CRM CSVs from {data_dir}")
    frames = []
    for status, fname in CRM_FILES.items():
        path = data_dir / fname
        if not path.exists():
            print(f"  ! missing {path} — skipping {status}")
            continue
        df = pd.read_csv(path)
        df["lead_status"] = status
        frames.append(df)
        print(f"  - {status}: {len(df)} rows")
    if not frames:
        print("  ! no CRM files found")
        return
    upload = ingest_crm_frames(db, frames, filename="; ".join(CRM_FILES.values()))
    print(f"· Ingested {upload.row_count} CRM companies (status={upload.status})")


def seed_demo_sector(db) -> None:
    """Optional: seed a competitor sector if a demo CSV is present."""
    demo = Path(__file__).resolve().parent.parent / "scripts" / "demo_competitor.csv"
    if not demo.exists():
        print("· No demo_competitor.csv — skipping demo sector")
        return
    if db.query(Sector).count() > 0:
        print("· Sector already exists, skipping demo")
        return
    df = pd.read_csv(demo)
    sector = ingest_competitor_df(
        db, df, sector_label="AI Agents for Financial Services", filename="demo_competitor.csv"
    )
    print(f"· Created sector '{sector.label}' with {len(sector.segments)} segments, "
          f"{len(sector.companies)} companies")


def main() -> int:
    db = SessionLocal()
    try:
        seed_crm(db)
        seed_demo_sector(db)
        sectors = db.query(Sector).count()
        segs = db.query(Segment).count()
        comps = db.query(Company).count()
        crm = db.query(CrmCompany).count()
        print(f"\nDONE — sectors={sectors} segments={segs} companies={comps} crm_companies={crm}")
    finally:
        db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
