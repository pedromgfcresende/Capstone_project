"""SEC EDGAR full-text search collector — keyless funding/traction signal.

EDGAR's full-text search API (`efts.sec.gov`) counts how many public regulatory
filings mention a query string. For a private startup this is a *comparability*
signal — how often the company is named in US public-company filings (partners,
acquirers, competitors). Keyless; SEC only requires a descriptive User-Agent,
which the shared HTTP wrapper already sends.

Best-effort: any failure returns None so an enrichment run never breaks.
"""

from __future__ import annotations

from typing import Any

from app.services.collect.http import get_json

_BASE = "https://efts.sec.gov/LATEST/search-index"


def edgar_filing_mentions(query: str, forms: str = "10-K") -> dict[str, Any] | None:
    """Count SEC filing mentions of `query` (exact phrase). Returns a signal dict.

    `forms` restricts to a filing type (default "10-K" — substantive annual
    reports). Returns {filingMentions, recent[...], source...} or None if nothing
    usable came back.
    """
    q = (query or "").strip()
    if not q:
        return None

    params: dict[str, Any] = {"q": f'"{q}"'}
    if forms:
        params["forms"] = forms

    body = get_json(_BASE, params=params)
    if not isinstance(body, dict):
        return None

    hits = body.get("hits") or {}
    total = (hits.get("total") or {}).get("value")
    if total is None:
        return None

    recent: list[dict[str, Any]] = []
    for h in (hits.get("hits") or [])[:5]:
        src = h.get("_source") or {}
        names = src.get("display_names") or []
        recent.append({
            "form": src.get("root_form") or src.get("file_type"),
            "filed": src.get("file_date"),
            "filer": names[0] if names else None,
        })

    return {
        "query": q,
        "forms": forms,
        "filingMentions": total,
        "recent": recent,
        "sourceName": "SEC EDGAR (full-text search)",
        "sourceUrl": f'https://efts.sec.gov/LATEST/search-index?q="{q}"',
        "reliability": "High",
    }
