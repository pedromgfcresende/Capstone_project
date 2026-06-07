"""Serialize ORM objects into the shape the React frontend expects (camelCase).

Company is now sector-scoped and linked to segments many-to-many. A segment's
`companies` are the per-segment views (company fields + the link's tier/focal/
notes), so the existing tabs keep working. The sector also exposes a flat
`companies` list with each company's segment memberships — the source for the
Company × Segment matrix.
"""

from __future__ import annotations

from datetime import date, datetime

from app.db.models import (
    Company,
    CompanySegment,
    CrmCompany,
    Sector,
    Segment,
    SegmentSynthesis,
)


def _day(dt: datetime | None) -> str | None:
    return dt.date().isoformat() if dt else None


def _iso(d: date | None) -> str | None:
    return d.isoformat() if d else None


# ── companies ─────────────────────────────────────────────────────────────


def company_link_out(link: CompanySegment) -> dict:
    """Per-segment view of a company (the shape the tabs consume)."""
    c = link.company
    return {
        "id": str(c.id),
        "linkId": str(link.id),
        "name": c.name,
        "focal": link.focal,
        "founded": c.founded,
        "geography": c.geography,
        "fundRound": c.funding_status,
        "fundingAmount": c.funding_amount,
        "topInvestors": c.top_investors,
        "priority": link.competitive_potential,
        "description": c.description,
        "segment": link.segment.title if link.segment else None,
        "primaryCustomer": c.primary_customer,
        "notes": link.notes,
        "origin": c.origin,
        "extra": c.extra or {},
    }


def company_matrix_out(c: Company) -> dict:
    """Company-level view + its segment memberships (matrix source)."""
    segs = sorted(c.links, key=lambda l: (l.segment.title if l.segment else ""))
    extra = c.extra or {}
    return {
        "id": str(c.id),
        "name": c.name,
        "geography": c.geography,
        "fundRound": c.funding_status,
        "founded": c.founded,
        "description": c.description,
        "origin": c.origin,
        "inCrm": c.crm_company_id is not None,
        "why": extra.get("why"),
        "confidence": extra.get("confidence"),
        "sources": extra.get("sources", []),
        "focal": any(l.focal for l in c.links),
        "segments": [
            {
                "segmentId": str(l.segment_id),
                "title": l.segment.title if l.segment else None,
                "tier": l.competitive_potential,
                "focal": l.focal,
            }
            for l in segs
        ],
    }


# ── synthesis ─────────────────────────────────────────────────────────────


def synthesis_out(syn: SegmentSynthesis | None, verifications: dict[str, str] | None = None) -> dict | None:
    if syn is None:
        return None
    return {
        "overview": syn.overview,
        "comparative": syn.comparative,
        "differentiation": syn.differentiation,
        "summary": syn.summary,
        "commentary": syn.commentary,
        "sources": syn.sources,
        "model": syn.model,
        "generatedAt": syn.generated_at.isoformat() if syn.generated_at else None,
        "verifications": verifications or {},
    }


# ── segments ──────────────────────────────────────────────────────────────


def segment_out(
    s: Segment,
    *,
    with_companies: bool = True,
    with_synthesis: bool = False,
    verifications: dict[str, str] | None = None,
) -> dict:
    out = {
        "id": str(s.id),
        "sectorId": str(s.sector_id),
        "title": s.title,
        "focalCompany": s.focal_company,
        "updatedAt": _day(s.updated_at),
        "status": s.status,
        "summary": s.summary,
        "keyInsight": s.key_insight,
        "thesis": s.thesis,
        "priorityCompanies": [],
        "openQuestions": [],
    }
    if with_companies:
        out["companies"] = [company_link_out(l) for l in s.links]
    if with_synthesis:
        out["synthesis"] = synthesis_out(s.synthesis, verifications)
    return out


# ── sectors ───────────────────────────────────────────────────────────────


def sector_out(s: Sector, *, with_segments: bool = True, with_companies: bool = True) -> dict:
    out = {
        "id": str(s.id),
        "label": s.label,
        "updatedAt": _day(s.updated_at),
        "synthesisHeadline": s.synthesis_headline,
        "synthesisBody": s.synthesis_body,
        "synthesisExtra": s.synthesis_extra or {},
    }
    if with_segments:
        out["segments"] = [segment_out(seg) for seg in s.segments]
        out["workspaces"] = out["segments"]  # legacy alias (frontend transitioning)
    if with_companies:
        comps = list(s.companies)
        out["companies"] = [company_matrix_out(c) for c in comps]
        out["stats"] = {
            "companies": len(comps),
            "aiCompanies": sum(1 for c in comps if c.origin == "ai"),
            "inCrm": sum(1 for c in comps if c.crm_company_id is not None),
        }
    return out


def enrichment_out(e) -> dict:
    return {
        "id": str(e.id),
        "status": e.status,
        "queries": (e.query_plan or {}).get("queries", []),
        "competitors": (e.result or {}).get("competitors", []),
        "createdCount": (e.result or {}).get("created", 0),
        "fetchMethods": (e.result or {}).get("fetch_methods", {}),
        "model": e.model,
        "error": e.error,
        "generatedAt": e.created_at.isoformat() if e.created_at else None,
    }


# ── CRM ───────────────────────────────────────────────────────────────────


def crm_company_out(c: CrmCompany) -> dict:
    return {
        "id": str(c.id),
        "organizationId": c.organization_id,
        "name": c.name,
        "website": c.website,
        "leadStatus": c.lead_status,
        "affinityStatus": c.affinity_status,
        "owner": c.owner,
        "tag": c.tag,
        "investors": c.investors,
        "investmentStage": c.investment_stage,
        "country": c.country,
        "industryXange": c.industry_xange,
        "description": c.description,
        "yearFounded": c.year_founded,
        "totalFundingUsd": c.total_funding_usd,
        "totalFundingEur": c.total_funding_eur,
        "linkedinUrl": c.linkedin_url,
        "dealroomUrl": c.dealroom_url,
        "lastEmail": _iso(c.last_email),
        "lastMeeting": _iso(c.last_meeting),
        "nextMeeting": _iso(c.next_meeting),
        "employeesCurrent": c.employees_current,
    }
