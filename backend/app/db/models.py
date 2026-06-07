"""SQLAlchemy 2.0 models for the XAnge Market Intelligence Platform.

Domains:
  - Competitive intelligence: sectors -> segments -> companies, with companies
    linked to segments many-to-many via `company_segments` (a company can compete
    in multiple segments). Each segment has a 1:1 segment_synthesis; each sector
    has its synthesis stored on the sector row + aggregated from its segments.
  - CRM / pipeline: crm_companies (separate; AI-enrichment matching is M2).

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
    synthesis_extra: Mapped[dict | None] = mapped_column(JSONB)

    segments: Mapped[list[Segment]] = relationship(
        back_populates="sector", cascade="all, delete-orphan", order_by="Segment.created_at"
    )
    companies: Mapped[list[Company]] = relationship(
        back_populates="sector", cascade="all, delete-orphan", order_by="Company.created_at"
    )


class Segment(Base, TimestampMixin):
    __tablename__ = "segments"

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
    source_upload_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))

    sector: Mapped[Sector] = relationship(back_populates="segments")
    links: Mapped[list[CompanySegment]] = relationship(
        back_populates="segment", cascade="all, delete-orphan"
    )
    synthesis: Mapped[SegmentSynthesis | None] = relationship(
        back_populates="segment", cascade="all, delete-orphan", uselist=False
    )


class Company(Base, TimestampMixin):
    """A company within a sector. Company-level facts are shared; per-segment
    facts (tier, focal, notes) live on CompanySegment."""

    __tablename__ = "companies"

    id: Mapped[uuid.UUID] = _pk()
    sector_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("sectors.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    founded: Mapped[str | None] = mapped_column(String(50))
    geography: Mapped[str | None] = mapped_column(String(200))
    funding_status: Mapped[str | None] = mapped_column(String(200))
    funding_amount: Mapped[str | None] = mapped_column(String(200))
    top_investors: Mapped[str | None] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    primary_customer: Mapped[str | None] = mapped_column(Text)
    # provenance — 'csv' today; 'crm' / 'ai' arrive with M2 enrichment
    origin: Mapped[str] = mapped_column(String(20), default="csv")
    crm_company_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    extra: Mapped[dict] = mapped_column(JSONB, default=dict)

    sector: Mapped[Sector] = relationship(back_populates="companies")
    links: Mapped[list[CompanySegment]] = relationship(
        back_populates="company", cascade="all, delete-orphan"
    )


class CompanySegment(Base):
    """Join: a company competing in a segment, with per-segment attributes."""

    __tablename__ = "company_segments"
    __table_args__ = (
        UniqueConstraint("company_id", "segment_id", name="uq_company_segment"),
    )

    id: Mapped[uuid.UUID] = _pk()
    company_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), index=True
    )
    segment_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("segments.id", ondelete="CASCADE"), index=True
    )
    competitive_potential: Mapped[int | None] = mapped_column(Integer)
    focal: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    company: Mapped[Company] = relationship(back_populates="links")
    segment: Mapped[Segment] = relationship(back_populates="links")


class SegmentSynthesis(Base):
    __tablename__ = "segment_synthesis"

    id: Mapped[uuid.UUID] = _pk()
    segment_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("segments.id", ondelete="CASCADE"), unique=True, index=True
    )
    overview: Mapped[dict | None] = mapped_column(JSONB)
    comparative: Mapped[dict | None] = mapped_column(JSONB)
    differentiation: Mapped[dict | None] = mapped_column(JSONB)
    summary: Mapped[dict | None] = mapped_column(JSONB)
    commentary: Mapped[dict | None] = mapped_column(JSONB)
    sources: Mapped[dict | None] = mapped_column(JSONB)
    model: Mapped[str | None] = mapped_column(String(100))
    generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    segment: Mapped[Segment] = relationship(back_populates="synthesis")


class Verification(Base, TimestampMixin):
    __tablename__ = "verifications"
    __table_args__ = (
        UniqueConstraint("entity_type", "entity_id", "claim_key", name="uq_verification_claim"),
    )

    id: Mapped[uuid.UUID] = _pk()
    entity_type: Mapped[str] = mapped_column(String(40), index=True)  # segment_synthesis|sector
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
    sector_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("sectors.id", ondelete="SET NULL")
    )


# ── AI enrichment (M2): AI-discovered competitors not (yet) in the CRM ─────


class AiEnrichment(Base, TimestampMixin):
    __tablename__ = "ai_enrichment"

    id: Mapped[uuid.UUID] = _pk()
    sector_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("sectors.id", ondelete="CASCADE"), index=True
    )
    focal_company_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    segment_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending|done|failed
    query_plan: Mapped[dict | None] = mapped_column(JSONB)  # {queries: [...]}
    result: Mapped[dict | None] = mapped_column(JSONB)  # {competitors: [...]} with provenance
    model: Mapped[str | None] = mapped_column(String(100))
    error: Mapped[str | None] = mapped_column(Text)
