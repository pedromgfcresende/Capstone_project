"""AI market-research pipeline: discover competitors NOT yet in the picture.

plan queries (LLM) → search (Tavily) → extract candidates (LLM) → fetch candidate
sites (trafilatura→Playwright) → finalize structured competitors (LLM), each with
source URLs (provenance) and a confidence score for the analyst to verify.
"""

from __future__ import annotations

import json

from dotenv import load_dotenv
from langchain.chat_models import init_chat_model
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from app.config import settings
from app.services.research.web import fetch_page, web_search

load_dotenv()

MAX_QUERIES = 4
MAX_CANDIDATES_TO_FETCH = 6


def _model(temperature: float = 0.2):
    return init_chat_model(settings.resolved_model, model_provider=settings.llm_provider, temperature=temperature)


# ── schemas ──
class QueryPlan(BaseModel):
    queries: list[str] = Field(description="3-4 web search queries to find competitors")


class Candidate(BaseModel):
    name: str
    website: str | None = Field(default=None, description="domain or url if known")
    why: str = Field(description="why it competes with the focal company")
    suggested_segment: str | None = None
    sources: list[str] = Field(default_factory=list, description="result URLs supporting this")


class CandidateList(BaseModel):
    candidates: list[Candidate]


class Competitor(BaseModel):
    name: str
    website: str | None = None
    description: str | None = None
    suggested_segment: str | None = None
    why_competitor: str
    founded: str | None = None
    funding: str | None = None
    confidence: float = Field(description="0-1 confidence this is a real, relevant competitor")
    sources: list[str] = Field(default_factory=list)


class CompetitorList(BaseModel):
    competitors: list[Competitor]


SYS_PLAN = (
    "You are a VC market-research assistant for XAnge. Given a focal company and its "
    "sector/segment, write 3-4 high-signal web search queries that would surface its "
    "competitors (alternatives, 'companies like X', category + space). Output queries only."
)
SYS_EXTRACT = (
    "You extract competitor companies from web search results. Return only real, named "
    "companies that plausibly COMPETE with the focal company. Exclude the focal company "
    "itself, exclude any names in the provided 'already known' list, exclude generic pages, "
    "news outlets, and non-companies. For each, cite the result URLs it came from."
)
SYS_FINAL = (
    "You finalize a competitor list for a VC analyst. Using the candidates and any scraped "
    "site text, produce clean records (description, founded, funding if evident) with a "
    "confidence score (0-1) and the supporting source URLs. Do NOT invent facts not present "
    "in the provided text/snippets. Drop anything that isn't clearly a competitor."
)


def _invoke(system: str, human: str, schema):
    return _model().with_structured_output(schema).invoke(
        [SystemMessage(content=system), HumanMessage(content=human)]
    )


class Suggestion(BaseModel):
    sector: str = Field(description="market sector label, title case")
    segment: str = Field(description="the specific competitive segment within that sector")


def suggest_sector_segment(*, name: str, description: str | None, industry: str | None) -> Suggestion:
    sys = (
        "You place a company on a VC competitive map. Suggest the market SECTOR and the "
        "specific competitive SEGMENT it belongs to. Short, title-case labels (no sentences)."
    )
    human = f"Company: {name}\nDescription: {description or '(n/a)'}\nIndustry: {industry or '(n/a)'}"
    return _invoke(sys, human, Suggestion)


def run_enrichment(*, focal_name: str, focal_desc: str | None, sector_label: str,
                   segment: str | None, known_names: list[str]) -> dict:
    """Returns {queries, competitors, fetch_methods}. Best-effort; never raises on web errors."""
    ctx = (f"Focal company: {focal_name}\nDescription: {focal_desc or '(n/a)'}\n"
           f"Sector: {sector_label}\nSegment: {segment or '(any)'}")

    plan = _invoke(SYS_PLAN, ctx, QueryPlan)
    queries = plan.queries[:MAX_QUERIES] or [f"{focal_name} competitors", f"companies like {focal_name}"]

    results = []
    for q in queries:
        results.extend(web_search(q, max_results=5))
    # dedup search results by url
    seen, deduped = set(), []
    for r in results:
        u = r.get("url")
        if u and u not in seen:
            seen.add(u); deduped.append(r)

    extract_human = (
        f"{ctx}\n\nAlready known (exclude these): {', '.join(known_names) or '(none)'}\n\n"
        f"Search results (JSON):\n{json.dumps(deduped[:24], ensure_ascii=False)[:9000]}"
    )
    cand = _invoke(SYS_EXTRACT, extract_human, CandidateList)

    # fetch a few candidate sites to verify/enrich
    fetch_methods = {}
    enriched_text = []
    for c in cand.candidates[:MAX_CANDIDATES_TO_FETCH]:
        # prefer the company's own site; fall back to the first supporting source URL
        url = None
        if c.website:
            url = c.website if c.website.startswith("http") else f"https://{c.website}"
        elif c.sources:
            url = c.sources[0]
        if not url:
            continue
        page = fetch_page(url)
        fetch_methods[c.name] = page["method"]
        if page["text"]:
            enriched_text.append({"name": c.name, "url": url, "text": page["text"][:2500]})

    final_human = (
        f"{ctx}\n\nCandidates (JSON):\n{json.dumps([c.model_dump() for c in cand.candidates], ensure_ascii=False)[:6000]}\n\n"
        f"Scraped site text (JSON):\n{json.dumps(enriched_text, ensure_ascii=False)[:9000]}\n\n"
        f"Already known (exclude): {', '.join(known_names) or '(none)'}"
    )
    final = _invoke(SYS_FINAL, final_human, CompetitorList)

    return {
        "queries": queries,
        "competitors": [c.model_dump() for c in final.competitors],
        "fetch_methods": fetch_methods,
        "model": settings.resolved_model,
    }
