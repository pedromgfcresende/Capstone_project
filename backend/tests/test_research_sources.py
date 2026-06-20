"""Unit tests for per-company source research (web search mocked)."""

from __future__ import annotations

import app.services.research.sources as srcmod
from app.services.research.sources import _host, _slug, collect_company_sources


def test_slug_and_host():
    assert _slug("Diligent (YC)") == "diligent"
    assert _slug("Gradient Labs") == "gradient-labs"
    assert _host("https://www.crunchbase.com/organization/qonto") == "crunchbase.com"


def test_collect_dedupes_by_host_and_drops_junk(monkeypatch):
    results = {
        "default": [
            {"url": "https://qonto.com/about", "title": "Qonto — Homepage"},
            {"url": "https://qonto.com/pricing", "title": "Qonto pricing"},   # same host -> dropped
            {"url": "https://www.crunchbase.com/organization/qonto", "title": "Qonto Crunchbase"},
            {"url": "https://www.google.com/search?q=qonto", "title": "google"},  # junk -> dropped
            {"url": "https://sifted.eu/articles/qonto-raises", "title": "Qonto raises"},
        ]
    }
    monkeypatch.setattr(srcmod, "web_search", lambda q, max_results=4: results["default"])
    out = collect_company_sources("Qonto", max_links=6)
    hosts = [_host(s["url"]) for s in out]
    assert "qonto.com" in hosts
    assert "crunchbase.com" in hosts
    assert "sifted.eu" in hosts
    assert "google.com" not in hosts          # junk dropped
    assert hosts.count("qonto.com") == 1       # deduped by host
    # multiple direct links, not just one
    assert len(out) >= 3


def test_collect_falls_back_to_profile_links_when_no_search(monkeypatch):
    monkeypatch.setattr(srcmod, "web_search", lambda q, max_results=4: [])
    out = collect_company_sources("Acme Corp", domain="acme.com", max_links=6)
    fields = {s.get("field") for s in out}
    urls = " ".join(s["url"] for s in out)
    assert "homepage" in fields
    assert "crunchbase.com/organization/acme-corp" in urls
    assert "linkedin.com/company/acme-corp" in urls
    assert len(out) >= 3   # multiple direct links even with no live search


def test_collect_caps_results(monkeypatch):
    many = [{"url": f"https://h{i}.com/x", "title": f"t{i}"} for i in range(20)]
    monkeypatch.setattr(srcmod, "web_search", lambda q, max_results=4: many)
    out = collect_company_sources("BigCo", max_links=6)
    assert len(out) == 6
