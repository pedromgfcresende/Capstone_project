from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import crm, enrichment, sectors, segments, uploads, verifications
from app.config import settings

app = FastAPI(title="XAnge Market Intelligence API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sectors.router, prefix="/api")
app.include_router(segments.router, prefix="/api")
app.include_router(crm.router, prefix="/api")
app.include_router(uploads.router, prefix="/api")
app.include_router(verifications.router, prefix="/api")
app.include_router(enrichment.router, prefix="/api")


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
