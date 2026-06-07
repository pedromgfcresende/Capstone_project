from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.serializers import company_link_out, segment_out
from app.config import settings
from app.db.models import Segment, SegmentSynthesis
from app.db.session import get_db
from app.services.synthesis.chains import synthesize_segment
from app.services.verification import verification_map

router = APIRouter(prefix="/segments", tags=["segments"])


def _verifs(db: Session, seg: Segment) -> dict[str, str]:
    if seg.synthesis is None:
        return {}
    return verification_map(db, "segment_synthesis", seg.id)


@router.get("/{segment_id}")
def get_segment(segment_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    seg = db.get(Segment, segment_id)
    if seg is None:
        raise HTTPException(status_code=404, detail="Segment not found")
    return segment_out(seg, with_synthesis=True, verifications=_verifs(db, seg))


@router.get("/{segment_id}/companies")
def get_segment_companies(segment_id: uuid.UUID, db: Session = Depends(get_db)) -> list[dict]:
    seg = db.get(Segment, segment_id)
    if seg is None:
        raise HTTPException(status_code=404, detail="Segment not found")
    return [company_link_out(l) for l in seg.links]


class SegmentPatch(BaseModel):
    summary: str | None = None
    keyInsight: str | None = None
    thesis: str | None = None


@router.patch("/{segment_id}")
def patch_segment(segment_id: uuid.UUID, payload: SegmentPatch, db: Session = Depends(get_db)) -> dict:
    seg = db.get(Segment, segment_id)
    if seg is None:
        raise HTTPException(status_code=404, detail="Segment not found")
    if payload.summary is not None:
        seg.summary = payload.summary
    if payload.keyInsight is not None:
        seg.key_insight = payload.keyInsight
    if payload.thesis is not None:
        seg.thesis = payload.thesis
    db.commit()
    db.refresh(seg)
    return segment_out(seg, with_synthesis=True, verifications=_verifs(db, seg))


@router.post("/{segment_id}/synthesize")
def synthesize(segment_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    seg = db.get(Segment, segment_id)
    if seg is None:
        raise HTTPException(status_code=404, detail="Segment not found")
    if not seg.links:
        raise HTTPException(status_code=400, detail="Segment has no companies to synthesize")
    if not settings.has_llm_key:
        raise HTTPException(
            status_code=400,
            detail=f"No API key configured for provider '{settings.llm_provider}'. Set it in backend/.env and restart.",
        )

    companies = [
        {
            "name": l.company.name, "focal": l.focal, "tier": l.competitive_potential,
            "founded": l.company.founded, "geography": l.company.geography,
            "funding_status": l.company.funding_status, "funding_amount": l.company.funding_amount,
            "top_investors": l.company.top_investors, "segment": seg.title,
            "primary_customer": l.company.primary_customer, "description": l.company.description,
            "notes": l.notes,
        }
        for l in seg.links
    ]

    seg.status = "synthesizing"
    db.commit()
    try:
        result = synthesize_segment(
            title=seg.title, focal=seg.focal_company, thesis=seg.thesis, companies=companies
        )
    except Exception as exc:  # noqa: BLE001
        seg.status = "ready" if seg.synthesis else "draft"
        db.commit()
        raise HTTPException(status_code=502, detail=f"Synthesis failed: {exc}") from exc

    syn = seg.synthesis or SegmentSynthesis(segment_id=seg.id)
    syn.overview = {"text": result.market_overview, "market": result.market.model_dump()}
    syn.comparative = {"text": result.comparative}
    syn.differentiation = {"text": result.differentiation}
    syn.summary = {"text": result.summary}
    syn.commentary = {"text": result.commentary}
    syn.sources = {"claims": [c.model_dump() for c in result.claims]}
    syn.model = settings.resolved_model
    syn.generated_at = datetime.now(timezone.utc)
    db.add(syn)

    seg.summary = result.summary
    seg.key_insight = result.key_insight
    seg.status = "ready"
    db.commit()
    db.refresh(seg)
    return segment_out(seg, with_synthesis=True, verifications=_verifs(db, seg))
