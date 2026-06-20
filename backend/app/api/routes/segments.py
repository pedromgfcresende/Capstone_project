from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.api.serializers import company_link_out, segment_out
from app.config import settings
from app.db.models import Segment, SegmentSynthesis
from app.db.session import get_db
from app.services.research.sources import deep_research_company
from app.services.synthesis.chains import synthesize_segment
from app.services.verification import verification_map

router = APIRouter(prefix="/segments", tags=["segments"])


def _deep_research_segment(db: Session, seg: Segment, *, only_missing: bool = False) -> list[dict]:
    """Run deep web research for every company in the segment: save the direct
    source links to company.extra.sources and return per-company text digests
    (used to ground the LLM synthesis). Best-effort per company."""
    research: list[dict] = []
    changed = False
    for link in seg.links:
        c = link.company
        extra = dict(c.extra or {})
        if only_missing and extra.get("sources"):
            research.append({"name": c.name, "digest": ""})
            continue
        try:
            r = deep_research_company(
                c.name, domain=extra.get("website") or extra.get("domain"), description=c.description
            )
        except Exception:  # noqa: BLE001 - research is best-effort
            r = {"sources": [], "digest": ""}
        if r["sources"]:
            extra["sources"] = r["sources"]
            c.extra = extra
            flag_modified(c, "extra")
            changed = True
        research.append({"name": c.name, "digest": r["digest"]})
    if changed:
        db.commit()
    return research


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

    # deep research first: collect direct sources per company + grounding digests
    research = _deep_research_segment(db, seg, only_missing=False)

    try:
        result = synthesize_segment(
            title=seg.title, focal=seg.focal_company, thesis=seg.thesis,
            companies=companies, research=research,
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


@router.post("/{segment_id}/collect-sources")
def collect_sources(segment_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    """Run per-company deep research and (re)populate direct source links for the
    Sources tab, without re-running the full synthesis."""
    seg = db.get(Segment, segment_id)
    if seg is None:
        raise HTTPException(status_code=404, detail="Segment not found")
    if not seg.links:
        raise HTTPException(status_code=400, detail="Segment has no companies")
    research = _deep_research_segment(db, seg, only_missing=False)
    db.refresh(seg)
    return {
        "updated": sum(1 for r in research if r.get("digest")),
        "segment": segment_out(seg, with_synthesis=True, verifications=_verifs(db, seg)),
    }
