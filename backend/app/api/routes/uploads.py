from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.serializers import sector_out
from app.db.session import get_db
from app.services.ingestion.competitor_csv import ingest_competitor_bytes
from app.services.ingestion.crm_csv import ingest_crm_files

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("/competitor")
async def upload_competitor(
    db: Session = Depends(get_db),
    file: UploadFile = File(...),
    sector_label: str = Form(...),
) -> dict:
    """A competitor-analysis CSV builds (or extends) a Sector: segments are
    derived from the list-valued Segment column, companies linked many-to-many."""
    content = await file.read()
    try:
        sector = ingest_competitor_bytes(db, content, sector_label=sector_label, filename=file.filename)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Ingestion failed: {exc}") from exc
    return {"sector": sector_out(sector)}


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
    return {"id": str(upload.id), "kind": upload.kind, "rowCount": upload.row_count, "status": upload.status}
