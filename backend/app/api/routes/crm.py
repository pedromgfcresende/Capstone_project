from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.api.serializers import crm_company_out
from app.db.models import CrmCompany
from app.db.session import get_db

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


@router.get("/companies/{company_id}")
def get_crm_company(company_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    c = db.get(CrmCompany, company_id)
    if c is None:
        raise HTTPException(status_code=404, detail="CRM company not found")
    out = crm_company_out(c)
    out["extra"] = c.extra or {}
    return out
