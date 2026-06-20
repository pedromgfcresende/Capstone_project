"""SEC EDGAR full-text search collector — keyless public-market signal.

Counts how often a name appears in recent SEC filings (10-K / 10-Q). A non-zero
count is a weak signal that a company (or its larger public comparables) shows up
in regulated disclosures — useful colour for the Market Snapshot, not a core fact.
A User-Agent is required by the SEC.
"""

from __future__ import annotations

from typing import Any

from app.services.collect.http import get_json

_FTS = "https://efts.sec.gov/LATEST/search-index"


def edgar_filing_mentions(query: str, forms: str = "10-K") -> dict[str, Any] | None:
    body = get_json(_FTS, params={"q": f'"{query}"', "forms": forms})
    hits = ((body or {}).get("hits") or {}).get("total") or {}
    count = hits.get("value")
    if count is None:
        return None
    return {
        "query": query,
        "forms": forms,
        "filingMentions": count,
        "sourceName": "SEC EDGAR full-text search",
        "sourceUrl": f"https://efts.sec.gov/LATEST/search-index?q=%22{query}%22&forms={forms}",
        "reliability": "High",
    }
