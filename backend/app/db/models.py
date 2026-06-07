"""SQLAlchemy 2.0 models for the XAnge Market Intelligence Platform.

Two domains:
  - Competitive intelligence: sectors -> workspaces -> companies (+ synthesis, verifications)
  - CRM / pipeline: crm_companies (separate, not joined in v1)

Every domain table has typed core columns plus an `extra` JSONB column for
unmapped CSV columns (the "fixed core + flexible extras" rule).
"""

from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


def _pk() -> Mapped[uuid.UUID]:
    return mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


# ── Competitive intelligence ──────────────────────────────────────────────


class Sector(Base, TimestampMixin):
    __tablename__ = "sectors"

    id: Mapped[uuid.UUID] = _pk()
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    synthesis_headline: Mapped[str | None] = mapped_column(Text)
    synthesis_body: Mapped[str | None] = mapped_column(Text)
    # watchlist + open questions + model/generated_at (the cross-segment roll-up)
    synthesis_extra: Mapped[dict | None] = mapped_column(JSONB)

    workspaces: Mapped[list[Workspace]] = relationship(
        back_populates="sector", cascade="all, delete-orphan", order_by="Workspace.created_at"
    )


class Workspace(Base, TimestampMixin):
    __tablename__ = "workspaces"

    id: Mapped[uuid.UUID] = _pk()
    sector_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("sectors.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    focal_company: Mapped[str | None] = mapped_column(String(200))
    thesis: Mapped[str | None] = mapped_column(Text)
    summary: Mapped[str | None] = mapped_column(Text)
    key_insight: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft|synthesizing|ready
    # no FK (avoids circular dependency with uploads); just a soft reference
    source_upload_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))

    sector: Mapped[Sector] = relationship(back_populates="workspaces")
    companies: Mapped[list[Company]] = relationship(
        back_populates="workspace", cascade="all, delete-orphan", order_by="Company.created_at"
    )
    synthesis: Mapped[WorkspaceSynthesis | None] = relationship(
        back_populates="workspace", cascade="all, delete-orphan", uselist=False
    )


class Company(Base, TimestampMixin):
    __tablename__ = "companies"

    id: Mapped[uuid.UUID] = _pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    founded: Mapped[str | None] = mapped_column(String(50))
    geography: Mapped[str | None] = mapped_column(String(200))
    funding_status: Mapped[str | None] = mapped_column(String(200))
    funding_amount: Mapped[str | None] = mapped_column(String(200))
    top_investors: Mapped[str | None] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    segment: Mapped[str | None] = mapped_column(String(200))
    primary_customer: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    competitive_potential: Mapped[int | None] = mapped_column(Integer)
    focal: Mapped[bool] = mapped_column(Boolean, default=False)
    extra: Mapped[dict] = mapped_column(JSONB, default=dict)

    workspace: Mapped[Workspace] = relationship(back_populates="companies")


class WorkspaceSynthesis(Base):
    __tablename__ = "workspace_synthesis"

    id: Mapped[uuid.UUID] = _pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), unique=True, index=True
    )
    overview: Mapped[dict | None] = mapped_column(JSONB)
    comparative: Mapped[dict | None] = mapped_column(JSONB)
    differentiation: Mapped[dict | None] = mapped_column(JSONB)
    summary: Mapped[dict | None] = mapped_column(JSONB)
    commentary: Mapped[dict | None] = mapped_column(JSONB)
    sources: Mapped[dict | None] = mapped_column(JSONB)
    model: Mapped[str | None] = mapped_column(String(100))
    generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    workspace: Mapped[Workspace] = relationship(back_populates="synthesis")


class Verification(Base, TimestampMixin):
    __tablename__ = "verifications"
    __table_args__ = (
        UniqueConstraint("entity_type", "entity_id", "claim_key", name="uq_verification_claim"),
    )

    id: Mapped[uuid.UUID] = _pk()
    entity_type: Mapped[str] = mapped_column(String(40), index=True)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    claim_key: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(20), default="ai")  # ai|verified|needs
    verified_by: Mapped[str | None] = mapped_column(String(200))
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


# ── CRM / pipeline (separate domain) ──────────────────────────────────────


class CrmCompany(Base, TimestampMixin):
    __tablename__ = "crm_companies"

    id: Mapped[uuid.UUID] = _pk()
    affinity_row_id: Mapped[str | None] = mapped_column(String(50), index=True)
    organization_id: Mapped[str | None] = mapped_column(String(50), index=True)
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    website: Mapped[str | None] = mapped_column(String(500))
    lead_status: Mapped[str | None] = mapped_column(String(20), index=True)  # hot|pass|unknown
    affinity_status: Mapped[str | None] = mapped_column(String(100))
    owner: Mapped[str | None] = mapped_column(String(300))
    tag: Mapped[str | None] = mapped_column(String(200))
    investors: Mapped[str | None] = mapped_column(Text)
    investment_stage: Mapped[str | None] = mapped_column(String(100))
    country: Mapped[str | None] = mapped_column(String(100), index=True)
    industry_xange: Mapped[str | None] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    year_founded: Mapped[int | None] = mapped_column(Integer)
    total_funding_usd: Mapped[float | None] = mapped_column(Float)
    total_funding_eur: Mapped[float | None] = mapped_column(Float)
    linkedin_url: Mapped[str | None] = mapped_column(String(500))
    dealroom_url: Mapped[str | None] = mapped_column(String(500))
    last_email: Mapped[date | None] = mapped_column(Date)
    last_meeting: Mapped[date | None] = mapped_column(Date)
    next_meeting: Mapped[date | None] = mapped_column(Date)
    employees_current: Mapped[int | None] = mapped_column(Integer)
    extra: Mapped[dict] = mapped_column(JSONB, default=dict)


# ── Shared: ingestion audit ───────────────────────────────────────────────


class Upload(Base, TimestampMixin):
    __tablename__ = "uploads"

    id: Mapped[uuid.UUID] = _pk()
    kind: Mapped[str] = mapped_column(String(20))  # competitor|crm
    filename: Mapped[str | None] = mapped_column(String(500))
    row_count: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending|done|failed
    error: Mapped[str | None] = mapped_column(Text)
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("workspaces.id", ondelete="SET NULL")
    )
