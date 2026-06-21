"""Open-data collection endpoints.

Collects structured fields from the free / open sources in the source directory
(`source_directory_v4`): official business registries for a company's founding
year + HQ, and World Bank macro indicators for a sector's market context. Every
collected value carries its source so the analyst can verify it (trust model).
"""

from __future__ import annotations

import uuid
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.db.models import Company, CompanySegment, Sector, Segment
from app.db.session import get_db
from app.services.axes import parse_year
from app.services.collect.edgar import edgar_filing_mentions
from app.services.collect.eurostat import country_market_context as eurostat_context
from app.services.collect.registries import lookup_company_registry
from app.services.collect.sources import SOURCE_DIRECTORY
from app.services.collect.worldbank import country_market_context as worldbank_context

router = APIRouter(tags=["collect"])


@router.get("/sources")
def get_sources() -> list[dict]:
    """The source directory — what the platform can collect from, and how."""
    return SOURCE_DIRECTORY


def _append_source(extra: dict, field: str, collected: dict) -> None:
    srcs = extra.get("sources") or []
    srcs = [s for s in srcs if s.get("field") != field]  # replace prior of same field
    srcs.append({
        "field": field,
        "name": collected.get("sourceName"),
        "url": collected.get("sourceUrl"),
        "reliability": collected.get("reliability"),
    })
    extra["sources"] = srcs


class CompanyPatch(BaseModel):
    """Analyst edits to a company's core facts (year founded, location, etc.).

    Edits the shared company record — applies across every segment the company
    competes in. Per-segment facts (tier/focal/notes) are not touched here.
    """

    name: str | None = None
    founded: str | None = None
    geography: str | None = None
    funding_status: str | None = None
    funding_amount: str | None = None
    top_investors: str | None = None
    description: str | None = None
    primary_customer: str | None = None


_COMPANY_EDITABLE = (
    "name", "founded", "geography", "funding_status", "funding_amount",
    "top_investors", "description", "primary_customer",
)


@router.patch("/companies/{company_id}")
def patch_company(company_id: uuid.UUID, payload: CompanyPatch, db: Session = Depends(get_db)) -> dict:
    """Update a company's analyst-editable core fields."""
    company = db.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    data = payload.model_dump(exclude_unset=True)
    for field in _COMPANY_EDITABLE:
        if field in data and data[field] is not None:
            setattr(company, field, data[field])
    db.commit()
    db.refresh(company)
    return {
        "id": str(company.id),
        "name": company.name,
        "founded": company.founded,
        "geography": company.geography,
        "fundingStatus": company.funding_status,
        "fundingAmount": company.funding_amount,
        "topInvestors": company.top_investors,
        "description": company.description,
        "primaryCustomer": company.primary_customer,
    }


class MoveSegmentIn(BaseModel):
    fromSegmentId: uuid.UUID
    toSegmentId: uuid.UUID


@router.post("/companies/{company_id}/move-segment")
def move_segment(company_id: uuid.UUID, payload: MoveSegmentIn, db: Session = Depends(get_db)) -> dict:
    """Reassign a company from one segment to another within the same sector."""
    company = db.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    target = db.get(Segment, payload.toSegmentId)
    if target is None or target.sector_id != company.sector_id:
        raise HTTPException(status_code=400, detail="Target segment not in this company's sector")

    from_link = (
        db.query(CompanySegment)
        .filter_by(company_id=company_id, segment_id=payload.fromSegmentId)
        .first()
    )
    if from_link is None:
        raise HTTPException(status_code=404, detail="Company is not in the source segment")

    existing = (
        db.query(CompanySegment)
        .filter_by(company_id=company_id, segment_id=payload.toSegmentId)
        .first()
    )
    if existing:
        db.delete(from_link)  # already a member of the target — just leave the source
    else:
        from_link.segment_id = payload.toSegmentId  # carries tier/focal/notes over
    db.commit()
    return {"moved": True, "companyId": str(company_id), "toSegmentId": str(payload.toSegmentId)}


@router.post("/companies/{company_id}/collect-registry")
def collect_registry(company_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    """Look up a company in official registries -> founding year + HQ (with source).

    Persists the founding year into `extra.yearFounded` (the serializer reads it
    as a fallback) and backfills HQ country if missing, so a company that lacked a
    Founded value can now plot on the Comparative matrix.
    """
    company = db.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")

    collected = lookup_company_registry(company.name, company.geography)
    if not collected or not collected.get("yearFounded"):
        return {"found": False, "company": {"id": str(company.id), "name": company.name}}

    extra = dict(company.extra or {})
    year = collected["yearFounded"]
    extra["yearFounded"] = year
    _append_source(extra, "yearFounded", collected)

    if not company.geography and collected.get("location"):
        company.geography = collected["location"]
    if not company.founded:
        company.founded = str(year)

    company.extra = extra
    flag_modified(company, "extra")
    db.commit()
    db.refresh(company)

    return {
        "found": True,
        "collected": collected,
        "company": {
            "id": str(company.id),
            "name": company.name,
            "yearFounded": parse_year(company.founded) or year,
            "location": company.geography,
        },
    }


class MarketContextIn(BaseModel):
    country: str | None = None


@router.post("/sectors/{sector_id}/market-context")
def collect_market_context(
    sector_id: uuid.UUID, payload: MarketContextIn, db: Session = Depends(get_db)
) -> dict:
    """Macro context (population / GDP) for the sector's geography.

    Collects from World Bank (global) and Eurostat (EU-authoritative, for European
    geographies). If no country is given, infers it from the most common company
    HQ in the sector. Persisted onto the sector so the Overview tab can show it.
    """
    sector = db.get(Sector, sector_id)
    if sector is None:
        raise HTTPException(status_code=404, detail="Sector not found")

    country = payload.country
    if not country:
        geos = [c.geography for c in sector.companies if c.geography]
        country = Counter(geos).most_common(1)[0][0] if geos else None

    worldbank = worldbank_context(country)
    eurostat = eurostat_context(country)
    if not worldbank and not eurostat:
        return {"found": False, "country": country}

    extra = dict(sector.synthesis_extra or {})
    if worldbank:
        extra["marketContext"] = worldbank
    if eurostat:
        extra["marketContextEu"] = eurostat
    sector.synthesis_extra = extra
    flag_modified(sector, "synthesis_extra")
    db.commit()

    return {"found": True, "marketContext": worldbank, "marketContextEu": eurostat}


@router.post("/companies/{company_id}/collect-edgar")
def collect_edgar(company_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    """SEC EDGAR full-text mention count for a company (a comparability signal).

    Counts how many US public-company filings name the company, and persists the
    signal into `extra.edgarMentions` (with a source for the trust model).
    """
    company = db.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")

    collected = edgar_filing_mentions(company.name)
    if not collected:
        return {"found": False, "company": {"id": str(company.id), "name": company.name}}

    extra = dict(company.extra or {})
    extra["edgarMentions"] = collected["filingMentions"]
    _append_source(extra, "edgarMentions", collected)
    company.extra = extra
    flag_modified(company, "extra")
    db.commit()

    return {"found": True, "collected": collected,
            "company": {"id": str(company.id), "name": company.name}}
