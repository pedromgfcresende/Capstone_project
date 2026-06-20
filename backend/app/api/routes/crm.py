from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.api.serializers import crm_company_out, sector_out
from app.config import settings
from app.db.models import (
    AiEnrichment,
    Company,
    CompanySegment,
    CrmCompany,
    Sector,
    Segment,
)
from app.db.session import get_db
from app.services.ingestion.crm_csv import reconcile_crm_csv
from app.services.research.enrich import run_enrichment, suggest_sector_segment
from app.services.research.persist import persist_competitors

router = APIRouter(prefix="/crm", tags=["crm"])


@router.get("/facets")
def crm_facets(db: Session = Depends(get_db)) -> dict:
    total = db.query(func.count(CrmCompany.id)).scalar() or 0
    by_status = dict(
        db.query(CrmCompany.lead_status, func.count(CrmCompany.id))
        .group_by(CrmCompany.lead_status)
        .all()
    )
    countries = [
        {"value": c, "count": n}
        for c, n in db.query(CrmCompany.country, func.count(CrmCompany.id))
        .filter(CrmCompany.country.isnot(None))
        .group_by(CrmCompany.country)
        .order_by(func.count(CrmCompany.id).desc())
        .limit(40)
        .all()
    ]
    return {"total": total, "statuses": by_status, "countries": countries}


@router.get("/companies")
def list_crm_companies(
    db: Session = Depends(get_db),
    status: str | None = Query(None, description="hot|pass|unknown"),
    country: str | None = None,
    tag: str | None = None,
    q: str | None = Query(None, description="search name/description"),
    limit: int = Query(50, le=500),
    offset: int = 0,
) -> dict:
    query = db.query(CrmCompany)
    if status:
        query = query.filter(CrmCompany.lead_status == status)
    if country:
        query = query.filter(CrmCompany.country == country)
    if tag:
        query = query.filter(CrmCompany.tag.ilike(f"%{tag}%"))
    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(CrmCompany.name.ilike(like), CrmCompany.description.ilike(like))
        )

    total = query.count()
    rows = query.order_by(CrmCompany.name).offset(offset).limit(limit).all()
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": [crm_company_out(c) for c in rows],
    }


@router.post("/upload")
async def upload_crm_reconcile(
    db: Session = Depends(get_db), file: UploadFile = File(...)
) -> dict:
    """Re-upload a CRM CSV to refresh the pipeline. Existing companies (matched by
    name) only have Stage / Funding updated when they changed; unseen companies are
    added as new records. Returns a reconciliation summary."""
    content = await file.read()
    try:
        summary = reconcile_crm_csv(db, content, filename=file.filename)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Reconcile failed: {exc}") from exc
    return summary


@router.get("/companies/{company_id}")
def get_crm_company(company_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    c = db.get(CrmCompany, company_id)
    if c is None:
        raise HTTPException(status_code=404, detail="CRM company not found")
    out = crm_company_out(c)
    out["extra"] = c.extra or {}
    return out


@router.post("/companies/{company_id}/analyse")
def analyse_crm_company(company_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    """Company-first flow: take a CRM company with no prior analysis, let AI suggest a
    sector + segment, create them with this company as focal, then run market research
    to populate competitors."""
    c = db.get(CrmCompany, company_id)
    if c is None:
        raise HTTPException(status_code=404, detail="CRM company not found")
    if not settings.has_llm_key:
        raise HTTPException(status_code=400, detail=f"No LLM API key for '{settings.llm_provider}'.")
    if not settings.tavily_api_key:
        raise HTTPException(status_code=400, detail="No TAVILY_API_KEY configured.")

    sug = suggest_sector_segment(name=c.name, description=c.description, industry=c.industry_xange)

    sector = db.query(Sector).filter(Sector.label == sug.sector).first()
    if sector is None:
        sector = Sector(label=sug.sector)
        db.add(sector); db.flush()
    segment = db.query(Segment).filter(Segment.sector_id == sector.id, Segment.title == sug.segment).first()
    if segment is None:
        segment = Segment(sector_id=sector.id, title=sug.segment, focal_company=c.name, status="ready")
        db.add(segment); db.flush()

    focal = Company(
        sector_id=sector.id, name=c.name, description=c.description, geography=c.country,
        founded=str(c.year_founded) if c.year_founded else None, origin="crm", crm_company_id=c.id,
        extra={"in_crm": True},
    )
    db.add(focal); db.flush()
    db.add(CompanySegment(company_id=focal.id, segment_id=segment.id, competitive_potential=None, focal=True, notes=None))

    run = AiEnrichment(sector_id=sector.id, focal_company_id=focal.id, segment_id=segment.id, status="pending")
    db.add(run); db.commit()
    try:
        out = run_enrichment(focal_name=c.name, focal_desc=c.description, sector_label=sector.label,
                             segment=segment.title, known_names=[c.name])
    except Exception as exc:  # noqa: BLE001
        run.status = "failed"; run.error = str(exc); db.commit()
        raise HTTPException(status_code=502, detail=f"Analysis failed: {exc}") from exc

    created = persist_competitors(db, sector, segment, out["competitors"])
    run.query_plan = {"queries": out["queries"]}
    run.result = {"competitors": out["competitors"], "created": created, "fetch_methods": out.get("fetch_methods", {})}
    run.model = out.get("model"); run.status = "done"
    db.commit(); db.refresh(sector)
    return {"sector": sector_out(sector), "suggestion": {"sector": sug.sector, "segment": sug.segment}, "createdCount": created}

