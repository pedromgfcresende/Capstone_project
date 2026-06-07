"""LangChain workspace-synthesis chain (provider-agnostic, structured output)."""

from __future__ import annotations

import json

from dotenv import load_dotenv
from langchain.chat_models import init_chat_model
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from app.config import settings
from app.services.synthesis.prompts import (
    HUMAN_TEMPLATE,
    QA_HUMAN_TEMPLATE,
    QA_SYSTEM_PROMPT,
    SECTOR_HUMAN_TEMPLATE,
    SECTOR_SYSTEM_PROMPT,
    SYSTEM_PROMPT,
)

load_dotenv()  # make ANTHROPIC_API_KEY / OPENAI_API_KEY visible to LangChain


class Claim(BaseModel):
    key: str = Field(description="short stable snake_case identifier for the claim")
    text: str = Field(description="an atomic, checkable factual statement")


class WorkspaceSynthesisResult(BaseModel):
    summary: str = Field(description="2-3 sentence executive summary of the landscape")
    key_insight: str = Field(description="the single most important takeaway, one sentence")
    market_overview: str = Field(description="market context, structure, dynamics (1 paragraph)")
    comparative: str = Field(description="how the players compare across the field (1 paragraph)")
    differentiation: str = Field(
        description="how the focal company is differentiated vs competitors (1 paragraph)"
    )
    commentary: str = Field(description="the analyst's so-what / investment angle (1 paragraph)")
    claims: list[Claim] = Field(description="4-8 verifiable factual claims with stable keys")


def _company_payload(companies: list) -> list[dict]:
    out = []
    for c in companies:
        out.append(
            {
                "name": c.name,
                "focal": c.focal,
                "tier": c.competitive_potential,
                "founded": c.founded,
                "geography": c.geography,
                "funding_status": c.funding_status,
                "funding_amount": c.funding_amount,
                "top_investors": c.top_investors,
                "segment": c.segment,
                "primary_customer": c.primary_customer,
                "description": c.description,
                "notes": c.notes,
            }
        )
    return out


def _model(temperature: float = 0.3):
    return init_chat_model(
        settings.resolved_model, model_provider=settings.llm_provider, temperature=temperature
    )


def synthesize_workspace(
    *, title: str, focal: str | None, thesis: str | None, companies: list
) -> WorkspaceSynthesisResult:
    structured = _model().with_structured_output(WorkspaceSynthesisResult)
    human = HUMAN_TEMPLATE.format(
        title=title,
        focal=focal or "(none specified)",
        thesis=thesis or "(none provided)",
        companies_json=json.dumps(_company_payload(companies), ensure_ascii=False, indent=2),
    )
    return structured.invoke(
        [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=human)]
    )


# ── Sector-level synthesis ────────────────────────────────────────────────


class WatchItem(BaseModel):
    name: str = Field(description="company name")
    reason: str = Field(description="one-line reason it's worth tracking")


class SectorSynthesisResult(BaseModel):
    headline: str = Field(description="the sector-level bet, one punchy sentence")
    body: str = Field(description="one short paragraph of supporting reasoning")
    watchlist: list[WatchItem] = Field(description="3-6 companies to track across the sector")
    open_questions: list[str] = Field(description="3-5 open questions about the sector")


def synthesize_sector(*, label: str, segments: list[dict]) -> SectorSynthesisResult:
    structured = _model().with_structured_output(SectorSynthesisResult)
    human = SECTOR_HUMAN_TEMPLATE.format(
        label=label, segments_json=json.dumps(segments, ensure_ascii=False, indent=2)
    )
    return structured.invoke(
        [SystemMessage(content=SECTOR_SYSTEM_PROMPT), HumanMessage(content=human)]
    )


# ── Cross-segment Q&A ─────────────────────────────────────────────────────


class QAResult(BaseModel):
    answer: str = Field(description="concise answer grounded in the context")
    citations: list[str] = Field(description="segment titles relied on")


def ask_sector(*, label: str, question: str, context: list[dict]) -> QAResult:
    structured = _model(temperature=0.2).with_structured_output(QAResult)
    human = QA_HUMAN_TEMPLATE.format(
        label=label,
        question=question,
        context_json=json.dumps(context, ensure_ascii=False, indent=2),
    )
    return structured.invoke(
        [SystemMessage(content=QA_SYSTEM_PROMPT), HumanMessage(content=human)]
    )
