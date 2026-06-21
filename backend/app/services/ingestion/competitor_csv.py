"""Ingest a competitor-analysis CSV -> one Sector, fanning out into Segments and
companies linked many-to-many.

Each CSV row is a company. Its "Segment" cell is treated as a LIST (split on
';', '|', or newline) so one company can compete in several segments. Companies
are deduped by name within the sector; per-segment facts (competitive potential,
focal, notes) live on the company_segments join. The focal company is the row
with no competitive-potential tier (the subject of the analysis).
"""

from __future__ import annotations

import io
import re

import pandas as pd
from sqlalchemy.orm import Session

from app.db.models import Company, CompanySegment, Sector, Segment, Upload
from app.services.ingestion.common import build_extra, clean, to_int
from app.services.ingestion.segment_naming import normalize_segment_title

# company-level CSV column -> model field
COMPANY_MAP = {
    "Name": "name",
    "Founded": "founded",
    "HQ": "geography",
    "Funding Status": "funding_status",
    "Funding Amount": "funding_amount",
    "Top Investors": "top_investors",
    "Description": "description",
    "Primary Customer": "primary_customer",
}
# columns consumed elsewhere (not company-level, not extra)
_CONSUMED = set(COMPANY_MAP) | {
    "Competitive Potential", "Segment",
    "Notes/ Relevance", "Notes/Relevance", "Notes / Relevance", "Notes",
}
_NOTE_KEYS = ["Notes/ Relevance", "Notes/Relevance", "Notes / Relevance", "Notes"]


def _norm(name: str) -> str:
    return re.sub(r"\s+", " ", (name or "").strip()).lower()


def _segments_in_row(row: dict) -> list[str]:
    raw = clean(row.get("Segment"))
    if not raw:
        return ["Unsegmented"]
    parts = [p.strip() for p in re.split(r"[;|\n]", str(raw)) if p.strip()]
    return parts or ["Unsegmented"]


def _note_in_row(row: dict) -> str | None:
    for k in _NOTE_KEYS:
        if k in row:
            v = clean(row.get(k))
            if v:
                return v
    return None


def ingest_competitor_df(
    db: Session,
    df: pd.DataFrame,
    *,
    sector_label: str,
    filename: str | None = None,
) -> Sector:
    upload = Upload(kind="competitor", filename=filename, status="pending")
    db.add(upload)
    try:
        # find or create the sector
        sector = db.query(Sector).filter(Sector.label == sector_label).first()
        if sector is None:
            sector = Sector(label=sector_label)
            db.add(sector)
            db.flush()

        companies: dict[str, Company] = {}       # norm name -> Company
        segments: dict[str, Segment] = {}        # norm title -> Segment
        links: set[tuple[str, str]] = set()      # (company_norm, segment_norm)
        n_links = 0

        for raw in df.to_dict(orient="records"):
            cname = clean(raw.get("Name")) or "(unnamed)"
            ckey = _norm(cname)
            tier = to_int(raw.get("Competitive Potential"))
            is_focal = tier is None
            note = _note_in_row(raw)

            # company (dedup within sector)
            company = companies.get(ckey)
            if company is None:
                fields = {dst: clean(raw.get(src)) for src, dst in COMPANY_MAP.items()}
                fields["name"] = cname
                fields["origin"] = "csv"
                fields["extra"] = build_extra(raw, _CONSUMED)
                company = Company(sector_id=sector.id, **fields)
                db.add(company)
                db.flush()
                companies[ckey] = company

            for sname in _segments_in_row(raw):
                stitle = normalize_segment_title(sname) or sname
                skey = _norm(stitle)
                segment = segments.get(skey)
                if segment is None:
                    segment = Segment(sector_id=sector.id, title=stitle, status="ready")
                    db.add(segment)
                    db.flush()
                    segments[skey] = segment
                if is_focal and not segment.focal_company:
                    segment.focal_company = cname
                if (ckey, skey) not in links:
                    db.add(CompanySegment(
                        company_id=company.id, segment_id=segment.id,
                        competitive_potential=tier, focal=is_focal, notes=note,
                    ))
                    links.add((ckey, skey))
                    n_links += 1

        upload.row_count = len(df)
        upload.status = "done"
        upload.sector_id = sector.id
        db.commit()
        db.refresh(sector)
        return sector
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        upload.status = "failed"
        upload.error = str(exc)
        db.add(upload)
        db.commit()
        raise


def ingest_competitor_bytes(
    db: Session, content: bytes, *, sector_label: str, filename: str | None = None
) -> Sector:
    df = pd.read_csv(io.BytesIO(content))
    return ingest_competitor_df(db, df, sector_label=sector_label, filename=filename)
