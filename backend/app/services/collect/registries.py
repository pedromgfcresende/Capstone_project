"""Official business-registry collectors for the "Founded" / "Location" fields.

These are the trusted, structured sources the Comparative spec calls out for the
Year Founded axis (registries are High reliability). Each lookup returns a
provenance-carrying dict the analyst can verify before it counts.

  • France  — Annuaire des Entreprises (recherche-entreprises.api.gouv.fr): keyless
  • UK      — Companies House: needs a free API key (settings.companies_house_api_key)
  • Germany — OffeneRegister (Handelsregister open-data mirror), Wikidata fallback:
              the official registers (Unternehmensregister / Handelsregister) are
              JSF-stateful + anti-bot, so this scrapes the open mirror instead.
"""

from __future__ import annotations

import re
from typing import Any

from app.config import settings
from app.services.collect.http import get_json

_FR_SEARCH = "https://recherche-entreprises.api.gouv.fr/search"
_UK_SEARCH = "https://api.company-information.service.gov.uk/search/companies"
# OffeneRegister = a Datasette mirror of the German Handelsregister open data.
_DE_OFFENEREGISTER = "https://db.offeneregister.de/openregister-ef9e802.json"
# Wikidata REST API (api.php) — not the SPARQL endpoint, which rate-limits hard.
_WD_API = "https://www.wikidata.org/w/api.php"
_WD_GERMANY = "Q183"  # country = Germany (P17), used to keep only German companies

# country hints (from a company's stored geography) -> which registry to try
_FR_HINTS = {"france", "fr", "french", "paris"}
_UK_HINTS = {"uk", "u.k.", "united kingdom", "england", "scotland", "wales", "london", "gb"}
_DE_HINTS = {
    "de", "germany", "german", "deutschland", "berlin", "munich", "münchen",
    "muenchen", "hamburg", "frankfurt", "cologne", "köln", "koeln", "stuttgart",
}


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


def _de_offeneregister(name: str) -> dict[str, Any] | None:
    """OffeneRegister (Handelsregister open data, Datasette JSON) -> register id + HQ.

    Full-text match on the open mirror of the German company register. Returns the
    Handelsregister number + registered address; founding year is not exposed
    cleanly here (Wikidata supplies it). Best-effort — the public instance is
    intermittently down (502).
    """
    sql = (
        "select name, registered_address, native_company_number from company "
        "where rowid in (select rowid from company_fts where company_fts match :q) limit 1"
    )
    body = get_json(_DE_OFFENEREGISTER, params={"sql": sql, "q": name, "_shape": "array"})
    if not isinstance(body, list) or not body:
        return None
    r = body[0]
    if not r.get("name"):
        return None
    return {
        "hqCity": r.get("registered_address"),
        "matchedName": r.get("name"),
        "registerId": r.get("native_company_number"),
    }


def _wd_claim_id(claims: dict, pid: str) -> str | None:
    """First entity-id value of a Wikidata claim (e.g. P17 -> 'Q183')."""
    val = (claims.get(pid) or [{}])[0].get("mainsnak", {}).get("datavalue", {}).get("value")
    return val.get("id") if isinstance(val, dict) else None


def _wd_claim_time(claims: dict, pid: str) -> str | None:
    """First time value of a Wikidata claim (e.g. P571 -> '+1972-01-01T00:00:00Z')."""
    val = (claims.get(pid) or [{}])[0].get("mainsnak", {}).get("datavalue", {}).get("value")
    return val.get("time") if isinstance(val, dict) else None


def _de_wikidata(name: str) -> dict[str, Any] | None:
    """Wikidata fallback — founding year + HQ for a German company (name search).

    Uses the REST API (`api.php`) only, never the SPARQL endpoint (which 429s
    aggressively). Keeps only companies whose country (P17) is Germany.
    """
    res = get_json(_WD_API, params={
        "action": "wbsearchentities", "search": name, "language": "en",
        "type": "item", "limit": 7, "format": "json",
    })
    cands = (res or {}).get("search") or []
    if not cands:
        return None
    # prefer a candidate Wikidata itself describes as German; else the top hit.
    pick = next((c for c in cands if "german" in (c.get("description") or "").lower()), cands[0])
    qid = pick.get("id")
    if not qid:
        return None

    ent = get_json(_WD_API, params={
        "action": "wbgetentities", "ids": qid, "props": "claims", "format": "json",
    })
    claims = (((ent or {}).get("entities") or {}).get(qid) or {}).get("claims") or {}
    if not claims:
        return None
    if _wd_claim_id(claims, "P17") != _WD_GERMANY:
        return None  # not a German company — don't answer for the German register

    year = _year(_wd_claim_time(claims, "P571"))
    hq_qid = _wd_claim_id(claims, "P159")
    hq_city = None
    if hq_qid:
        lab = get_json(_WD_API, params={
            "action": "wbgetentities", "ids": hq_qid,
            "props": "labels", "languages": "en", "format": "json",
        })
        hq_city = ((((lab or {}).get("entities") or {}).get(hq_qid) or {})
                   .get("labels", {}).get("en", {}).get("value"))
    if not year and not hq_city:
        return None
    return {
        "yearFounded": year,
        "hqCity": hq_city,
        "matchedName": pick.get("label"),
        "wikidataId": qid,
    }


def lookup_german_registry(name: str) -> dict[str, Any] | None:
    """German company lookup -> founded year + HQ + register id + provenance.

    Scrapes OffeneRegister (the Handelsregister open-data mirror) for the register
    id + address, and Wikidata for the founding year, merging both. Returns None if
    neither source answers.
    """
    if not name or not name.strip():
        return None
    name = name.strip()

    reg = _de_offeneregister(name)
    wiki = _de_wikidata(name)
    if not reg and not wiki:
        return None

    reg = reg or {}
    wiki = wiki or {}
    out: dict[str, Any] = {
        "yearFounded": wiki.get("yearFounded"),
        "location": "Germany",
        "hqCity": reg.get("hqCity") or wiki.get("hqCity"),
        "matchedName": reg.get("matchedName") or wiki.get("matchedName") or name,
        "registerId": reg.get("registerId"),
    }
    if reg:  # the authoritative register answered
        out.update(
            sourceName="OffeneRegister (Handelsregister open data)",
            sourceUrl="https://offeneregister.de/",
            reliability="High",
        )
    else:  # Wikidata fallback
        qid = wiki.get("wikidataId")
        out.update(
            sourceName="Wikidata (German company)",
            sourceUrl=f"https://www.wikidata.org/wiki/{qid}" if qid else _WD_API,
            reliability="Medium",
        )
    return out


def lookup_company_registry(name: str, geography: str | None = None) -> dict[str, Any] | None:
    """Pick the registry by geography hint, then fall back to trying both.

    Returns the first result that yields a founding year, with full provenance.
    """
    geo = (geography or "").strip().lower()
    if geo in _UK_HINTS or any(h in geo for h in _UK_HINTS):
        order = [lookup_uk_registry, lookup_french_registry, lookup_german_registry]
    elif geo in _DE_HINTS or any(h in geo for h in _DE_HINTS):
        order = [lookup_german_registry, lookup_french_registry, lookup_uk_registry]
    elif geo in _FR_HINTS or any(h in geo for h in _FR_HINTS):
        order = [lookup_french_registry, lookup_uk_registry, lookup_german_registry]
    else:
        order = [lookup_french_registry, lookup_uk_registry, lookup_german_registry]

    for fn in order:
        res = fn(name)
        if res and res.get("yearFounded"):
            return res
    return None
