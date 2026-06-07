"""Persisted claim-verification status (the VerifyDot trust model)."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.db.models import Verification

VALID_STATUSES = {"ai", "verified", "needs"}


def verification_map(db: Session, entity_type: str, entity_id: uuid.UUID) -> dict[str, str]:
    rows = (
        db.query(Verification)
        .filter(Verification.entity_type == entity_type, Verification.entity_id == entity_id)
        .all()
    )
    return {r.claim_key: r.status for r in rows}


def upsert_verification(
    db: Session,
    *,
    entity_type: str,
    entity_id: uuid.UUID,
    claim_key: str,
    status: str,
    verified_by: str | None = None,
) -> Verification:
    if status not in VALID_STATUSES:
        raise ValueError(f"invalid status '{status}', must be one of {sorted(VALID_STATUSES)}")
    row = (
        db.query(Verification)
        .filter(
            Verification.entity_type == entity_type,
            Verification.entity_id == entity_id,
            Verification.claim_key == claim_key,
        )
        .one_or_none()
    )
    if row is None:
        row = Verification(
            entity_type=entity_type, entity_id=entity_id, claim_key=claim_key, status=status
        )
        db.add(row)
    else:
        row.status = status
    row.verified_by = verified_by
    row.verified_at = datetime.now(timezone.utc) if status != "ai" else None
    db.commit()
    db.refresh(row)
    return row
