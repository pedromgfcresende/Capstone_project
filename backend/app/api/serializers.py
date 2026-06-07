"""Serialize ORM objects into the shape the existing React frontend expects.

The frontend was built around the mock-data shape (camelCase, `fundRound`,
`priority`, nested workspaces/companies), so we mirror it here to avoid a large
frontend rewrite in Week 1.
"""

from __future__ import annotations

from datetime import date, datetime

from app.db.models import Company, CrmCompany, Sector, Workspace, WorkspaceSynthesis


def _day(dt: datetime | None) -> str | None:
    return dt.date().isoformat() if dt else None


def synthesis_out(syn: WorkspaceSynthesis | None, verifications: dict[str, str] | None = None) -> dict | None:
    if syn is None:
        return None
    return {
        "overview": syn.overview,
        "comparative": syn.comparative,
        "differentiation": syn.differentiation,
        "summary": syn.summary,
        "commentary": syn.commentary,
        "sources": syn.sources,  # holds {"claims": [...]} in v1
        "model": syn.model,
        "generatedAt": syn.generated_at.isoformat() if syn.generated_at else None,
        "verifications": verifications or {},
    }


def company_out(c: Company) -> dict:
    return {
        "id": str(c.id),
        "name": c.name,
        "focal": c.focal,
        "founded": c.founded,
        "geography": c.geography,
        "fundRound": c.funding_status,
        "fundingAmount": c.funding_amount,
        "topInvestors": c.top_investors,
        "priority": c.competitive_potential,
        "description": c.description,
        "segment": c.segment,
        "primaryCustomer": c.primary_customer,
        "notes": c.notes,
        "extra": c.extra or {},
    }


def workspace_out(
    w: Workspace,
    *,
    with_companies: bool = True,
    with_synthesis: bool = False,
    verifications: dict[str, str] | None = None,
) -> dict:
    out = {
        "id": str(w.id),
        "sectorId": str(w.sector_id),
        "title": w.title,
        "focalCompany": w.focal_company,
        "updatedAt": _day(w.updated_at),
        "status": w.status,
        "summary": w.summary,
        "keyInsight": w.key_insight,
        "thesis": w.thesis,
        "priorityCompanies": [],  # filled by synthesis (Week 3)
        "openQuestions": [],
    }
    if with_companies:
        out["companies"] = [company_out(c) for c in w.companies]
    if with_synthesis:
        out["synthesis"] = synthesis_out(w.synthesis, verifications)
    return out


def sector_out(s: Sector, *, with_workspaces: bool = True) -> dict:
    out = {
        "id": str(s.id),
        "label": s.label,
        "updatedAt": _day(s.updated_at),
        "synthesisHeadline": s.synthesis_headline,
        "synthesisBody": s.synthesis_body,
        "synthesisExtra": s.synthesis_extra or {},
    }
    if with_workspaces:
        out["workspaces"] = [workspace_out(w) for w in s.workspaces]
    return out


def _iso(d: date | None) -> str | None:
    return d.isoformat() if d else None


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
