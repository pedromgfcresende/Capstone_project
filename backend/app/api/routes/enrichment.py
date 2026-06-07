from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.serializers import enrichment_out, sector_out
from app.config import settings
from app.db.models import AiEnrichment, Company, Sector, Segment
from app.db.session import get_db
from app.services.research.enrich import run_enrichment
from app.services.research.persist import persist_competitors

router = APIRouter(prefix="/sectors", tags=["enrichment"])


class EnrichIn(BaseModel):
    focalCompanyId: uuid.UUID | None = None
    segmentId: uuid.UUID | None = None


@router.post("/{sector_id}/enrich")
def enrich(sector_id: uuid.UUID, payload: EnrichIn, db: Session = Depends(get_db)) -> dict:
    sector = db.get(Sector, sector_id)
    if sector is None:
        raise HTTPException(status_code=404, detail="Sector not found")
    if not settings.has_llm_key:
        raise HTTPException(status_code=400, detail=f"No LLM API key for '{settings.llm_provider}'.")
    if not settings.tavily_api_key:
        raise HTTPException(status_code=400, detail="No TAVILY_API_KEY configured (set it in backend/.env and restart).")

    # seed the research
    focal = db.get(Company, payload.focalCompanyId) if payload.focalCompanyId else None
    if focal is None:
        focal = next((c for c in sector.companies if any(l.focal for l in c.links)), None)
    focal_name = focal.name if focal else sector.label
    focal_desc = focal.description if focal else None

    target_segment = db.get(Segment, payload.segmentId) if payload.segmentId else None
    segment_title = target_segment.title if target_segment else None
    known = [c.name for c in sector.companies]

    run = AiEnrichment(sector_id=sector.id,
                       focal_company_id=focal.id if focal else None,
                       segment_id=target_segment.id if target_segment else None,
                       status="pending")
    db.add(run); db.commit()
    try:
        out = run_enrichment(focal_name=focal_name, focal_desc=focal_desc,
                             sector_label=sector.label, segment=segment_title, known_names=known)
    except Exception as exc:  # noqa: BLE001
        run.status = "failed"; run.error = str(exc); db.commit()
        raise HTTPException(status_code=502, detail=f"Enrichment failed: {exc}") from exc

    # persist discovered competitors as origin='ai' companies
    created = persist_competitors(db, sector, target_segment, out["competitors"])

    run.query_plan = {"queries": out["queries"]}
    run.result = {"competitors": out["competitors"], "created": created,
                  "fetch_methods": out.get("fetch_methods", {})}
    run.model = out.get("model")
    run.status = "done"
    db.commit()
    db.refresh(sector)
    return {"enrichment": enrichment_out(run), "sector": sector_out(sector)}
