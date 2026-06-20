"""World Bank Open Data collector — keyless macro context for a sector's market.

Feeds the Market Overview / Market Snapshot with addressable-market anchors
(population, GDP, GDP per capita) for the sector's primary geography. These are
TAM/SAM/SOM inputs per the source directory, not company-level facts.
"""

from __future__ import annotations

from typing import Any

from app.services.collect.http import get_json

_BASE = "https://api.worldbank.org/v2"
_INDICATORS = {
    "population": "SP.POP.TOTL",
    "gdpUsd": "NY.GDP.MKTP.CD",
    "gdpPerCapitaUsd": "NY.GDP.PCAP.CD",
}

# common country names / codes -> ISO-2 used by the World Bank API
_COUNTRY_ISO2 = {
    "france": "FR", "fr": "FR",
    "united kingdom": "GB", "uk": "GB", "england": "GB", "gb": "GB",
    "germany": "DE", "de": "DE", "deutschland": "DE",
    "spain": "ES", "es": "ES",
    "italy": "IT", "it": "IT",
    "netherlands": "NL", "nl": "NL",
    "sweden": "SE", "se": "SE",
    "denmark": "DK", "dk": "DK",
    "belgium": "BE", "be": "BE",
    "ireland": "IE", "ie": "IE",
    "portugal": "PT", "pt": "PT",
    "european union": "EU", "eu": "EU", "europe": "EU",
    "united states": "US", "usa": "US", "us": "US",
}


def to_iso2(country: str | None) -> str | None:
    if not country:
        return None
    return _COUNTRY_ISO2.get(country.strip().lower())


def _latest(iso2: str, indicator: str) -> dict[str, Any] | None:
    body = get_json(
        f"{_BASE}/country/{iso2}/indicator/{indicator}",
        params={"format": "json", "per_page": 60, "mrnev": 1},  # most-recent non-empty value
    )
    if not isinstance(body, list) or len(body) < 2 or not body[1]:
        return None
    row = body[1][0]
    if row.get("value") is None:
        return None
    return {"value": row["value"], "year": row.get("date")}


def country_market_context(country: str | None) -> dict[str, Any] | None:
    """Return {population, gdpUsd, gdpPerCapitaUsd, year, country, source...} or None."""
    iso2 = to_iso2(country)
    if not iso2:
        return None
    out: dict[str, Any] = {
        "country": country,
        "iso2": iso2,
        "sourceName": "World Bank Open Data",
        "sourceUrl": f"https://data.worldbank.org/country/{iso2}",
        "reliability": "High",
    }
    found = False
    latest_year = None
    for key, indicator in _INDICATORS.items():
        res = _latest(iso2, indicator)
        if res:
            out[key] = res["value"]
            latest_year = res["year"] or latest_year
            found = True
    if not found:
        return None
    out["year"] = latest_year
    return out
