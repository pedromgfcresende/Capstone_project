from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.serializers import workspace_out
from app.db.session import get_db
from app.services.ingestion.competitor_csv import ingest_competitor_bytes
from app.services.ingestion.crm_csv import ingest_crm_files

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("/competitor")
async def upload_competitor(
    db: Session = Depends(get_db),
    file: UploadFile = File(...),
    title: str = Form(...),
    sector_id: uuid.UUID | None = Form(None),
    sector_label: str | None = Form(None),
) -> dict:
    content = await file.read()
    try:
        ws = ingest_competitor_bytes(
            db,
            content,
            title=title,
            sector_id=sector_id,
            sector_label=sector_label,
            filename=file.filename,
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Ingestion failed: {exc}") from exc
    return {"workspace": workspace_out(ws)}


@router.post("/crm")
async def upload_crm(
    db: Session = Depends(get_db),
    files: list[UploadFile] = File(...),
) -> dict:
    payload = {f.filename or f"file-{i}": await f.read() for i, f in enumerate(files)}
    try:
        upload = ingest_crm_files(db, payload)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Ingestion failed: {exc}") from exc
    return {
        "id": str(upload.id),
        "kind": upload.kind,
        "rowCount": upload.row_count,
        "status": upload.status,
    }
