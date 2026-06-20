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

from app.db.models import Company, Sector
from app.db.session import get_db
from app.services.axes import parse_year
from app.services.collect.registries import lookup_company_registry
from app.services.collect.sources import SOURCE_DIRECTORY
from app.services.collect.worldbank import country_market_context

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
    """World Bank macro context (population / GDP) for the sector's geography.

    If no country is given, infers it from the most common company HQ in the sector.
    Persisted onto the sector so the Overview tab can show it.
    """
    sector = db.get(Sector, sector_id)
    if sector is None:
        raise HTTPException(status_code=404, detail="Sector not found")

    country = payload.country
    if not country:
        geos = [c.geography for c in sector.companies if c.geography]
        country = Counter(geos).most_common(1)[0][0] if geos else None

    ctx = country_market_context(country)
    if not ctx:
        return {"found": False, "country": country}

    extra = dict(sector.synthesis_extra or {})
    extra["marketContext"] = ctx
    sector.synthesis_extra = extra
    flag_modified(sector, "synthesis_extra")
    db.commit()

    return {"found": True, "marketContext": ctx}
