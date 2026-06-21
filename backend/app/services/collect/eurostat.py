"""Eurostat collector — keyless EU-authoritative macro context for a market.

Same role as the World Bank collector, but sourced from Eurostat (the EU's own
statistics office) for European geographies: population and GDP as TAM/SAM/SOM
anchors. Uses the dissemination API's JSON-stat 2.0 output. Every non-time
dimension is pinned in the query, so only `time` varies and we can take the
most recent value robustly.

Best-effort: any network/parse failure returns None.
"""

from __future__ import annotations

from typing import Any

from app.services.collect.http import get_json

_BASE = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data"

# Eurostat geo codes differ from ISO-2 for a few cases (UK, Greece, EU aggregate).
_COUNTRY_GEO = {
    "france": "FR", "fr": "FR",
    "united kingdom": "UK", "uk": "UK", "england": "UK", "gb": "UK",
    "germany": "DE", "de": "DE", "deutschland": "DE",
    "spain": "ES", "es": "ES",
    "italy": "IT", "it": "IT",
    "netherlands": "NL", "nl": "NL",
    "sweden": "SE", "se": "SE",
    "denmark": "DK", "dk": "DK",
    "belgium": "BE", "be": "BE",
    "ireland": "IE", "ie": "IE",
    "portugal": "PT", "pt": "PT",
    "greece": "EL", "el": "EL",
    "european union": "EU27_2020", "eu": "EU27_2020", "europe": "EU27_2020",
}

# dataset + the dimensions to pin so that only `time` varies.
_INDICATORS = {
    "population": {
        "dataset": "demo_pjan",
        "params": {"freq": "A", "age": "TOTAL", "sex": "T", "unit": "NR"},
    },
    "gdpEurMillion": {
        "dataset": "nama_10_gdp",
        "params": {"freq": "A", "unit": "CP_MEUR", "na_item": "B1GQ"},
    },
}


def to_geo(country: str | None) -> str | None:
    if not country:
        return None
    return _COUNTRY_GEO.get(country.strip().lower())


def _latest_from_jsonstat(body: Any) -> dict[str, Any] | None:
    """Extract the most-recent (time) value from a JSON-stat 2.0 response."""
    if not isinstance(body, dict):
        return None
    ids = body.get("id") or []
    sizes = body.get("size") or []
    values = body.get("value") or {}
    dims = body.get("dimension") or {}
    if not ids or not values or "time" not in ids or len(ids) != len(sizes):
        return None

    # row-major strides: stride[i] = product(sizes[i+1:])
    strides = [1] * len(sizes)
    for i in range(len(sizes) - 2, -1, -1):
        strides[i] = strides[i + 1] * sizes[i + 1]

    time_pos = ids.index("time")
    time_index = (((dims.get("time") or {}).get("category") or {}).get("index")) or {}
    pos_to_time = {v: k for k, v in time_index.items()}

    best_time: str | None = None
    best_val: Any = None
    for flat_str, val in values.items():
        if val is None:
            continue
        try:
            flat = int(flat_str)
        except (TypeError, ValueError):
            continue
        tpos = (flat // strides[time_pos]) % sizes[time_pos]
        tlabel = pos_to_time.get(tpos)
        if tlabel is None:
            continue
        if best_time is None or tlabel > best_time:
            best_time, best_val = tlabel, val

    if best_val is None:
        return None
    return {"value": best_val, "year": best_time}


def country_market_context(country: str | None) -> dict[str, Any] | None:
    """Return {population, gdpEurMillion, year, country, source...} or None."""
    geo = to_geo(country)
    if not geo:
        return None

    out: dict[str, Any] = {
        "country": country,
        "geo": geo,
        "sourceName": "Eurostat",
        "sourceUrl": "https://ec.europa.eu/eurostat/web/main/data/database",
        "reliability": "High",
    }
    found = False
    latest_year = None
    for key, spec in _INDICATORS.items():
        params = {"format": "JSON", "lang": "EN", "geo": geo, **spec["params"]}
        body = get_json(f"{_BASE}/{spec['dataset']}", params=params)
        res = _latest_from_jsonstat(body)
        if res:
            out[key] = res["value"]
            latest_year = res["year"] or latest_year
            found = True

    if not found:
        return None
    out["year"] = latest_year
    return out
