"""Persist AI-discovered competitors into the sector (shared by both entry points)."""

from __future__ import annotations

import re

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.db.models import Company, CompanySegment, CrmCompany, Sector, Segment


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip()).lower()


def _ensure_ai_pipeline_row(db: Session, comp: dict) -> None:
    """Add an 'AI added' row to the Deal Pipeline for a net-new competitor (one the
    CSV import never contained), tagged extra.source='ai'. Idempotent by name."""
    name = comp.get("name", "")
    if not name:
        return
    exists = (
        db.query(CrmCompany)
        .filter(func.lower(CrmCompany.name) == name.lower())
        .filter(CrmCompany.extra["source"].astext == "ai")
        .first()
    )
    if exists:
        return
    db.add(CrmCompany(
        name=name,
        website=comp.get("website"),
        country=comp.get("geography") or comp.get("hq"),
        investment_stage=comp.get("funding"),
        lead_status="unknown",
        extra={"source": "ai"},
    ))


def persist_competitors(
    db: Session, sector: Sector, target_segment: Segment | None, competitors: list[dict]
) -> int:
    """Create origin='ai' companies for new competitors; match against the CRM; link to a
    segment (the target, or one derived from the suggestion). Returns count created."""
    existing = {norm(c.name) for c in sector.companies}
    seg_by_title = {norm(s.title): s for s in sector.segments}
    created = 0
    for comp in competitors:
        nkey = norm(comp.get("name", ""))
        if not nkey or nkey in existing:
            continue
        existing.add(nkey)
        # match only against original CSV-imported pipeline rows (not AI-added ones)
        crm = (
            db.query(CrmCompany)
            .filter(func.lower(CrmCompany.name) == comp["name"].lower())
            .filter(or_(
                CrmCompany.extra["source"].astext.is_(None),
                CrmCompany.extra["source"].astext != "ai",
            ))
            .first()
        )
        if crm is None:
            _ensure_ai_pipeline_row(db, comp)  # net-new -> surface in the pipeline as "AI added"
        company = Company(
            sector_id=sector.id, name=comp["name"], founded=comp.get("founded"),
            funding_status=comp.get("funding"), description=comp.get("description"),
            origin="ai", crm_company_id=crm.id if crm else None,
            extra={"why": comp.get("why_competitor"), "confidence": comp.get("confidence"),
                   "sources": comp.get("sources", []), "website": comp.get("website"),
                   "in_crm": bool(crm)},
        )
        db.add(company); db.flush()
        seg = target_segment
        if seg is None:
            stitle = comp.get("suggested_segment") or "AI-discovered"
            seg = seg_by_title.get(norm(stitle))
            if seg is None:
                seg = Segment(sector_id=sector.id, title=stitle, status="ready")
                db.add(seg); db.flush(); seg_by_title[norm(stitle)] = seg
        db.add(CompanySegment(company_id=company.id, segment_id=seg.id,
                              competitive_potential=None, focal=False, notes=comp.get("why_competitor")))
        created += 1
    return created
