from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.verification import upsert_verification

router = APIRouter(prefix="/verifications", tags=["verifications"])


class VerificationIn(BaseModel):
    entityType: str
    entityId: uuid.UUID
    claimKey: str
    status: str  # ai | verified | needs
    verifiedBy: str | None = None


@router.patch("")
def patch_verification(payload: VerificationIn, db: Session = Depends(get_db)) -> dict:
    try:
        row = upsert_verification(
            db,
            entity_type=payload.entityType,
            entity_id=payload.entityId,
            claim_key=payload.claimKey,
            status=payload.status,
            verified_by=payload.verifiedBy,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {
        "entityType": row.entity_type,
        "entityId": str(row.entity_id),
        "claimKey": row.claim_key,
        "status": row.status,
    }
