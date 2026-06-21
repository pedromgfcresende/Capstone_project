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


class Signal(BaseModel):
    title: str = Field(description="short signal headline")
    detail: str = Field(description="one sentence of supporting detail")


class RegItem(BaseModel):
    region: str = Field(description="2-4 letter region code, e.g. EU, US, UK")
    date: str = Field(description="approx date or year")
    label: str = Field(description="the regulatory development")
    note: str = Field(description="why it matters")
    impact: str = Field(description="High | Medium | Low")


class Market(BaseModel):
    tam: str = Field(description="estimated total addressable market — value only, e.g. '$8B'. No parenthetical descriptions.")
    sam: str = Field(description="estimated serviceable addressable market — value only, e.g. '$2B'. No parentheticals.")
    som: str = Field(description="estimated obtainable market near-term — value only, e.g. '$300M'. No parentheticals.")
    cagr: str = Field(description="estimated market CAGR — short value only, e.g. '~25% CAGR' or '~25–35% CAGR'. No parenthetical category descriptions.")
    adoption_stage: str = Field(
        description="one of: Early Adopters | Early Majority | Late Majority | Laggards"
    )
    adoption_evidence: str = Field(description="one sentence justifying the adoption stage")
    tailwinds: list[Signal] = Field(description="2-4 structural tailwinds")
    headwinds: list[Signal] = Field(description="2-4 structural headwinds")
    why_now: list[Signal] = Field(description="2-4 'why now' catalysts")
    regulatory: list[RegItem] = Field(description="0-4 relevant regulatory items")


class WorkspaceSynthesisResult(BaseModel):
    summary: str = Field(description="2-3 sentence executive summary of the landscape")
    key_insight: str = Field(description="the single most important takeaway, one sentence")
    market_overview: str = Field(description="market context, structure, dynamics (1 paragraph)")
    market: Market = Field(description="estimated, first-pass market sizing and signals")
    comparative: str = Field(description="how the players compare across the field (1 paragraph)")
    differentiation: str = Field(
        description="how the focal company is differentiated vs competitors (1 paragraph)"
    )
    commentary: str = Field(description="the analyst's so-what / investment angle (1 paragraph)")
    claims: list[Claim] = Field(description="4-8 verifiable factual claims with stable keys")


def _model(temperature: float = 0.3):
    return init_chat_model(
        settings.resolved_model, model_provider=settings.llm_provider, temperature=temperature
    )


def _research_text(research: list[dict] | None) -> str:
    """Render per-company web-research digests for the prompt."""
    if not research:
        return "(no web research available)"
    blocks = []
    for r in research:
        digest = (r.get("digest") or "").strip()
        if not digest:
            continue
        blocks.append(f"### {r.get('name', '?')}\n{digest}")
    return "\n\n".join(blocks) or "(no web research available)"


def synthesize_segment(
    *, title: str, focal: str | None, thesis: str | None, companies: list[dict],
    research: list[dict] | None = None,
) -> WorkspaceSynthesisResult:
    """companies: list of dicts (name, focal, tier, founded, geography, funding_status,
    funding_amount, top_investors, segment, primary_customer, description, notes).
    research: optional list of {name, digest} web-research digests per company."""
    structured = _model().with_structured_output(WorkspaceSynthesisResult)
    human = HUMAN_TEMPLATE.format(
        title=title,
        focal=focal or "(none specified)",
        thesis=thesis or "(none provided)",
        companies_json=json.dumps(companies, ensure_ascii=False, indent=2),
        research_text=_research_text(research),
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
