from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.serializers import sector_out
from app.config import settings
from app.db.models import Sector
from app.db.session import get_db
from app.services.synthesis.chains import ask_sector, synthesize_sector

router = APIRouter(prefix="/sectors", tags=["sectors"])


@router.get("")
def list_sectors(db: Session = Depends(get_db)) -> list[dict]:
    sectors = db.query(Sector).order_by(Sector.created_at).all()
    return [sector_out(s) for s in sectors]


@router.get("/{sector_id}")
def get_sector(sector_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    sector = db.get(Sector, sector_id)
    if sector is None:
        raise HTTPException(status_code=404, detail="Sector not found")
    return sector_out(sector)


class SectorPatch(BaseModel):
    synthesisHeadline: str | None = None
    synthesisBody: str | None = None
    synthesisExtra: dict | None = None


@router.patch("/{sector_id}")
def patch_sector(sector_id: uuid.UUID, payload: SectorPatch, db: Session = Depends(get_db)) -> dict:
    sector = db.get(Sector, sector_id)
    if sector is None:
        raise HTTPException(status_code=404, detail="Sector not found")
    if payload.synthesisHeadline is not None:
        sector.synthesis_headline = payload.synthesisHeadline
    if payload.synthesisBody is not None:
        sector.synthesis_body = payload.synthesisBody
    if payload.synthesisExtra is not None:
        sector.synthesis_extra = payload.synthesisExtra
    db.commit()
    db.refresh(sector)
    return sector_out(sector)


def _segments_payload(sector: Sector) -> list[dict]:
    out = []
    for seg in sector.segments:
        companies = [
            {"name": l.company.name, "tier": l.competitive_potential, "focal": l.focal,
             "segment": seg.title, "funding_status": l.company.funding_status}
            for l in seg.links
        ]
        out.append(
            {
                "title": seg.title,
                "focal": seg.focal_company,
                "summary": seg.summary,
                "key_insight": seg.key_insight,
                "companies": companies,
            }
        )
    return out


@router.post("/{sector_id}/synthesize")
def synthesize(sector_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    sector = db.get(Sector, sector_id)
    if sector is None:
        raise HTTPException(status_code=404, detail="Sector not found")
    if not sector.segments:
        raise HTTPException(status_code=400, detail="Sector has no segments to synthesize")
    if not settings.has_llm_key:
        raise HTTPException(
            status_code=400,
            detail=f"No API key configured for provider '{settings.llm_provider}'.",
        )
    try:
        result = synthesize_sector(label=sector.label, segments=_segments_payload(sector))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Sector synthesis failed: {exc}") from exc

    sector.synthesis_headline = result.headline
    sector.synthesis_body = result.body
    sector.synthesis_extra = {
        "watchlist": [w.model_dump() for w in result.watchlist],
        "openQuestions": result.open_questions,
        "model": settings.resolved_model,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }
    db.commit()
    db.refresh(sector)
    return sector_out(sector)


class AskIn(BaseModel):
    question: str


@router.post("/{sector_id}/ask")
def ask(sector_id: uuid.UUID, payload: AskIn, db: Session = Depends(get_db)) -> dict:
    sector = db.get(Sector, sector_id)
    if sector is None:
        raise HTTPException(status_code=404, detail="Sector not found")
    if not settings.has_llm_key:
        raise HTTPException(
            status_code=400,
            detail=f"No API key configured for provider '{settings.llm_provider}'.",
        )
    try:
        result = ask_sector(
            label=sector.label, question=payload.question, context=_segments_payload(sector)
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Q&A failed: {exc}") from exc
    return {"answer": result.answer, "citations": result.citations}
