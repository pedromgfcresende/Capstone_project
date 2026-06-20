"""Per-company source research — the deep-research step behind the Sources tab.

For each company in a segment, run web research and return *multiple direct
links to specific pages* (homepage, Crunchbase/Dealroom/LinkedIn profile, funding
news), not one generic link and not broad industry sites. Results are deduped by
host so the analyst gets a diverse set of places the data can be verified against.

Best-effort: if web search is unavailable, fall back to deterministic per-company
profile URLs built from the name slug (the templates in the source directory).
"""

from __future__ import annotations

import re
from urllib.parse import urlparse

from app.services.research.web import web_search

# Hosts that are search engines / social login / aggregator front-doors — never a
# "direct link to where the info lives", so they are dropped.
_JUNK_HOSTS = {
    "google.com", "www.google.com", "bing.com", "duckduckgo.com",
    "facebook.com", "twitter.com", "x.com", "youtube.com", "reddit.com",
    "medium.com",
}


def _slug(name: str) -> str:
    s = re.sub(r"\([^)]*\)", "", name or "")            # drop "(YC)" etc.
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return s


def _host(url: str) -> str:
    try:
        return urlparse(url).netloc.replace("www.", "").lower()
    except Exception:  # noqa: BLE001
        return ""


def _profile_links(name: str, domain: str | None) -> list[dict]:
    """Deterministic per-company profile URLs (fallback / supplement)."""
    slug = _slug(name)
    out: list[dict] = []
    if domain:
        d = domain.replace("https://", "").replace("http://", "").strip("/")
        out.append({"url": f"https://{d}", "name": "Homepage", "field": "homepage"})
    if slug:
        out += [
            {"url": f"https://www.crunchbase.com/organization/{slug}", "name": "Crunchbase profile", "field": "crunchbase"},
            {"url": f"https://app.dealroom.co/companies/{slug}", "name": "Dealroom profile", "field": "dealroom"},
            {"url": f"https://www.linkedin.com/company/{slug}", "name": "LinkedIn page", "field": "linkedin"},
        ]
    return out


def collect_company_sources(
    name: str, *, domain: str | None = None, description: str | None = None, max_links: int = 6
) -> list[dict]:
    """Return up to `max_links` direct, company-specific source links.

    Each link is {url, name, field}. Web-research hits (deduped to one per host)
    come first; deterministic profile links fill any remaining slots.
    """
    found: list[dict] = []
    seen_hosts: set[str] = set()

    queries = [
        f"{name} official website",
        f"{name} startup crunchbase OR dealroom",
        f"{name} funding round raise",
    ]
    for q in queries:
        for r in web_search(q, max_results=4):
            url = (r.get("url") or "").strip()
            host = _host(url)
            if not url or not host or host in _JUNK_HOSTS or host in seen_hosts:
                continue
            seen_hosts.add(host)
            found.append({"url": url, "name": (r.get("title") or host)[:90], "field": None})
            if len(found) >= max_links:
                break
        if len(found) >= max_links:
            break

    # supplement with deterministic profiles (skipping hosts we already have)
    for link in _profile_links(name, domain):
        if len(found) >= max_links:
            break
        if _host(link["url"]) in seen_hosts:
            continue
        seen_hosts.add(_host(link["url"]))
        found.append(link)

    return found[:max_links]
