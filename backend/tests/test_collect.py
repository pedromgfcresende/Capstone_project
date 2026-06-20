"""Unit tests for the open-data collectors (network mocked — no real calls)."""

from __future__ import annotations

import app.services.collect.edgar as edgar
import app.services.collect.registries as registries
import app.services.collect.worldbank as worldbank
from app.services.collect.sources import SOURCE_DIRECTORY, live_collectors


# ── source directory ──────────────────────────────────────────────────────────
def test_source_directory_shape():
    assert len(SOURCE_DIRECTORY) >= 5
    for s in SOURCE_DIRECTORY:
        assert {"section", "name", "url", "access", "reliability"} <= set(s)
    # the keyless registries + world bank must be marked live
    live_names = {s["name"] for s in live_collectors()}
    assert "Annuaire des Entreprises (data.gouv.fr)" in live_names
    assert "World Bank Open Data" in live_names


# ── French registry ───────────────────────────────────────────────────────────
def test_french_registry_parses_year_and_hq(monkeypatch):
    monkeypatch.setattr(registries, "get_json", lambda *a, **k: {
        "results": [{
            "siren": "819489626",
            "nom_complet": "QONTO",
            "date_creation": "2016-07-01",
            "siege": {"libelle_commune": "PARIS", "date_creation": "2016-07-01"},
        }]
    })
    res = registries.lookup_french_registry("Qonto")
    assert res["yearFounded"] == 2016
    assert res["location"] == "France"
    assert res["hqCity"] == "PARIS"
    assert res["siren"] == "819489626"
    assert "annuaire-entreprises" in res["sourceUrl"]
    assert res["reliability"] == "High"


def test_french_registry_empty(monkeypatch):
    monkeypatch.setattr(registries, "get_json", lambda *a, **k: {"results": []})
    assert registries.lookup_french_registry("Nonexistent") is None


def test_registry_routing_prefers_uk_for_uk_geo(monkeypatch):
    calls = []
    monkeypatch.setattr(registries, "lookup_uk_registry",
                        lambda n: calls.append("uk") or {"yearFounded": 2019, "location": "United Kingdom"})
    monkeypatch.setattr(registries, "lookup_french_registry",
                        lambda n: calls.append("fr") or {"yearFounded": 2020})
    res = registries.lookup_company_registry("Acme", geography="UK")
    assert res["location"] == "United Kingdom"
    assert calls[0] == "uk"  # UK registry tried first for a UK company


def test_uk_registry_needs_key(monkeypatch):
    monkeypatch.setattr(registries.settings, "companies_house_api_key", "")
    assert registries.lookup_uk_registry("Monzo") is None


# ── World Bank ────────────────────────────────────────────────────────────────
def test_worldbank_iso2_mapping():
    assert worldbank.to_iso2("France") == "FR"
    assert worldbank.to_iso2("uk") == "GB"
    assert worldbank.to_iso2("Germany") == "DE"
    assert worldbank.to_iso2("Atlantis") is None
    assert worldbank.to_iso2(None) is None


def test_worldbank_market_context(monkeypatch):
    def fake_get_json(url, **kwargs):
        # World Bank returns [meta, [row]]; vary by indicator in the URL
        if "SP.POP.TOTL" in url:
            return [{"page": 1}, [{"value": 68000000, "date": "2023"}]]
        if "NY.GDP.MKTP.CD" in url:
            return [{"page": 1}, [{"value": 3.1e12, "date": "2023"}]]
        if "NY.GDP.PCAP.CD" in url:
            return [{"page": 1}, [{"value": 45000, "date": "2023"}]]
        return None
    monkeypatch.setattr(worldbank, "get_json", fake_get_json)

    ctx = worldbank.country_market_context("France")
    assert ctx["iso2"] == "FR"
    assert ctx["population"] == 68000000
    assert ctx["gdpUsd"] == 3.1e12
    assert ctx["gdpPerCapitaUsd"] == 45000
    assert ctx["year"] == "2023"
    assert ctx["sourceName"] == "World Bank Open Data"


def test_worldbank_unknown_country_is_none(monkeypatch):
    assert worldbank.country_market_context("Atlantis") is None


# ── SEC EDGAR ─────────────────────────────────────────────────────────────────
def test_edgar_mentions(monkeypatch):
    monkeypatch.setattr(edgar, "get_json", lambda *a, **k: {"hits": {"total": {"value": 1167}}})
    res = edgar.edgar_filing_mentions("Stripe")
    assert res["filingMentions"] == 1167
    assert res["forms"] == "10-K"
