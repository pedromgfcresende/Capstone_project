"""Official business-registry collectors for the "Founded" / "Location" fields.

These are the trusted, structured sources the Comparative spec calls out for the
Year Founded axis (registries are High reliability). Each lookup returns a
provenance-carrying dict the analyst can verify before it counts.

  • France — Annuaire des Entreprises (recherche-entreprises.api.gouv.fr): keyless
  • UK     — Companies House: needs a free API key (settings.companies_house_api_key)
"""

from __future__ import annotations

import re
from typing import Any

from app.config import settings
from app.services.collect.http import get_json

_FR_SEARCH = "https://recherche-entreprises.api.gouv.fr/search"
_UK_SEARCH = "https://api.company-information.service.gov.uk/search/companies"

# country hints (from a company's stored geography) -> which registry to try
_FR_HINTS = {"france", "fr", "french", "paris"}
_UK_HINTS = {"uk", "u.k.", "united kingdom", "england", "scotland", "wales", "london", "gb"}


def _year(date_str: str | None) -> int | None:
    if not date_str:
        return None
    m = re.search(r"(19|20)\d{2}", str(date_str))
    return int(m.group(0)) if m else None


def lookup_french_registry(name: str) -> dict[str, Any] | None:
    """Annuaire des Entreprises — keyless. Returns founded year + HQ + provenance."""
    data = get_json(_FR_SEARCH, params={"q": name, "page": 1, "per_page": 1})
    results = (data or {}).get("results") or []
    if not results:
        return None
    r = results[0]
    siege = r.get("siege") or {}
    year = _year(r.get("date_creation")) or _year(siege.get("date_creation"))
    city = siege.get("libelle_commune")
    siren = r.get("siren")
    return {
        "yearFounded": year,
        "location": "France",
        "hqCity": city,
        "matchedName": r.get("nom_complet"),
        "siren": siren,
        "sourceName": "Annuaire des Entreprises (data.gouv.fr)",
        "sourceUrl": f"https://annuaire-entreprises.data.gouv.fr/entreprise/{siren}" if siren else _FR_SEARCH,
        "reliability": "High",
    }


def lookup_uk_registry(name: str) -> dict[str, Any] | None:
    """UK Companies House — requires a free API key; returns None if unset."""
    key = settings.companies_house_api_key
    if not key:
        return None
    data = get_json(_UK_SEARCH, params={"q": name, "items_per_page": 1}, auth=(key, ""))
    items = (data or {}).get("items") or []
    if not items:
        return None
    it = items[0]
    addr = it.get("address") or {}
    return {
        "yearFounded": _year(it.get("date_of_creation")),
        "location": "United Kingdom",
        "hqCity": addr.get("locality"),
        "matchedName": it.get("title"),
        "companyNumber": it.get("company_number"),
        "sourceName": "UK Companies House",
        "sourceUrl": f"https://find-and-update.company-information.service.gov.uk/company/{it.get('company_number')}",
        "reliability": "High",
    }


def lookup_company_registry(name: str, geography: str | None = None) -> dict[str, Any] | None:
    """Pick the registry by geography hint, then fall back to trying both.

    Returns the first result that yields a founding year, with full provenance.
    """
    geo = (geography or "").strip().lower()
    order = []
    if geo in _UK_HINTS or any(h in geo for h in _UK_HINTS):
        order = [lookup_uk_registry, lookup_french_registry]
    elif geo in _FR_HINTS or any(h in geo for h in _FR_HINTS):
        order = [lookup_french_registry, lookup_uk_registry]
    else:
        order = [lookup_french_registry, lookup_uk_registry]

    for fn in order:
        res = fn(name)
        if res and res.get("yearFounded"):
            return res
    return None
