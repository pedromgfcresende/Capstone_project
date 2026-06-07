from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.serializers import company_out, workspace_out
from app.config import settings
from app.db.models import Workspace, WorkspaceSynthesis
from app.db.session import get_db
from app.services.synthesis.chains import synthesize_workspace
from app.services.verification import verification_map

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


def _verifs(db: Session, syn: WorkspaceSynthesis | None) -> dict[str, str]:
    if syn is None:
        return {}
    # Keyed by workspace id (one synthesis per workspace) — matches what the
    # frontend sends as entityId in PATCH /verifications.
    return verification_map(db, "workspace_synthesis", syn.workspace_id)


@router.get("/{workspace_id}")
def get_workspace(workspace_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    ws = db.get(Workspace, workspace_id)
    if ws is None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace_out(ws, with_synthesis=True, verifications=_verifs(db, ws.synthesis))


class WorkspacePatch(BaseModel):
    summary: str | None = None
    keyInsight: str | None = None
    thesis: str | None = None


@router.patch("/{workspace_id}")
def patch_workspace(
    workspace_id: uuid.UUID, payload: WorkspacePatch, db: Session = Depends(get_db)
) -> dict:
    ws = db.get(Workspace, workspace_id)
    if ws is None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if payload.summary is not None:
        ws.summary = payload.summary
    if payload.keyInsight is not None:
        ws.key_insight = payload.keyInsight
    if payload.thesis is not None:
        ws.thesis = payload.thesis
    db.commit()
    db.refresh(ws)
    return workspace_out(ws, with_synthesis=True, verifications=_verifs(db, ws.synthesis))


@router.get("/{workspace_id}/companies")
def get_workspace_companies(workspace_id: uuid.UUID, db: Session = Depends(get_db)) -> list[dict]:
    ws = db.get(Workspace, workspace_id)
    if ws is None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return [company_out(c) for c in ws.companies]


@router.post("/{workspace_id}/synthesize")
def synthesize(workspace_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    ws = db.get(Workspace, workspace_id)
    if ws is None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if not ws.companies:
        raise HTTPException(status_code=400, detail="Workspace has no companies to synthesize")
    if not settings.has_llm_key:
        raise HTTPException(
            status_code=400,
            detail=(
                f"No API key configured for provider '{settings.llm_provider}'. "
                "Set it in backend/.env and restart the API."
            ),
        )

    ws.status = "synthesizing"
    db.commit()
    try:
        result = synthesize_workspace(
            title=ws.title, focal=ws.focal_company, thesis=ws.thesis, companies=ws.companies
        )
    except Exception as exc:  # noqa: BLE001
        ws.status = "ready" if ws.synthesis else "draft"
        db.commit()
        raise HTTPException(status_code=502, detail=f"Synthesis failed: {exc}") from exc

    syn = ws.synthesis or WorkspaceSynthesis(workspace_id=ws.id)
    syn.overview = {"text": result.market_overview}
    syn.comparative = {"text": result.comparative}
    syn.differentiation = {"text": result.differentiation}
    syn.summary = {"text": result.summary}
    syn.commentary = {"text": result.commentary}
    syn.sources = {"claims": [c.model_dump() for c in result.claims]}
    syn.model = settings.resolved_model
    syn.generated_at = datetime.now(timezone.utc)
    db.add(syn)

    ws.summary = result.summary
    ws.key_insight = result.key_insight
    ws.status = "ready"
    db.commit()
    db.refresh(ws)
    return workspace_out(ws, with_synthesis=True, verifications=_verifs(db, ws.synthesis))
