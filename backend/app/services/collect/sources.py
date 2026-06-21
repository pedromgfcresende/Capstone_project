"""The source directory — the free / open-data sources from `source_directory_v4`
that this platform can actually collect from without a paywall or login.

This is the machine-readable backbone behind the Sources view: every value the
platform surfaces should be traceable to one of these. `live=True` marks the
sources we have an automated collector for (keyless JSON APIs); the rest are
documented, manually-referenceable sources.
"""

from __future__ import annotations

# access levels mirror the spreadsheet's legend
FULLY = "Fully accessible"
PARTIAL = "Partially accessible"
LIMITED = "Login / paywall limited"

SOURCE_DIRECTORY: list[dict] = [
    # ── company-level structured fields (collectors) ──────────────────────────
    {
        "section": "Players · Founded",
        "name": "Annuaire des Entreprises (data.gouv.fr)",
        "url": "https://recherche-entreprises.api.gouv.fr",
        "access": FULLY,
        "dataType": "Official French business registry (JSON API)",
        "reliability": "High",
        "collector": "registry_fr",
        "live": True,
        "notes": "Keyless public API. Returns SIREN, creation date (year founded), HQ commune.",
    },
    {
        "section": "Players · Founded",
        "name": "UK Companies House",
        "url": "https://api.company-information.service.gov.uk",
        "access": FULLY,
        "dataType": "Official UK registry (JSON API)",
        "reliability": "High",
        "collector": "companies_house_uk",
        "live": True,
        "notes": "Free API key required. Returns incorporation date (year founded) + registered office.",
    },
    {
        "section": "Players · Founded",
        "name": "Unternehmensregister (DE)",
        "url": "https://www.unternehmensregister.de",
        "access": FULLY,
        "dataType": "Official German registry (HTML)",
        "reliability": "High (slow)",
        "collector": "registry_de",
        "live": True,
        "notes": "Official portal is JSF/anti-bot — scraped via OffeneRegister "
                 "(Handelsregister open-data mirror) with a Wikidata fallback.",
    },
    # ── market context (collectors) ───────────────────────────────────────────
    {
        "section": "Market · TAM/SAM/SOM",
        "name": "World Bank Open Data",
        "url": "https://api.worldbank.org/v2",
        "access": FULLY,
        "dataType": "Macro indicators (JSON API)",
        "reliability": "High",
        "collector": "worldbank",
        "live": True,
        "notes": "Keyless. Population, GDP, GDP/capita per country — addressable-market context.",
    },
    {
        "section": "Market · TAM/SAM/SOM",
        "name": "Eurostat",
        "url": "https://ec.europa.eu/eurostat/web/main/data/database",
        "access": FULLY,
        "dataType": "EU structured tables + CSV",
        "reliability": "High",
        "collector": "eurostat",
        "live": True,
        "notes": "Keyless JSON-stat API. Population + GDP per country (EU-authoritative market context).",
    },
    {
        "section": "Market · Funding signals",
        "name": "SEC EDGAR (full-text search)",
        "url": "https://efts.sec.gov/LATEST/search-index",
        "access": FULLY,
        "dataType": "Regulatory filings (JSON API)",
        "reliability": "High",
        "collector": "sec_edgar",
        "live": True,
        "notes": "Keyless (User-Agent required). Counts filing mentions — public-comparable signal.",
    },
    # ── structural signals (reference) ────────────────────────────────────────
    {
        "section": "Structural signals",
        "name": "EUR-Lex",
        "url": "https://eur-lex.europa.eu",
        "access": FULLY,
        "dataType": "EU legislation",
        "reliability": "High",
        "live": False,
        "notes": "Regulatory 'why now' — MiCA, DORA, AI Act. Manual reference.",
    },
    {
        "section": "Structural signals",
        "name": "Sifted / EU-Startups",
        "url": "https://sifted.eu",
        "access": FULLY,
        "dataType": "Editorial news (HTML)",
        "reliability": "Medium",
        "live": False,
        "notes": "Tailwinds / funding coverage. Reachable via the web-research agent.",
    },
    {
        "section": "Players · Profile",
        "name": "Company homepage",
        "url": "https://[company-domain]",
        "access": FULLY,
        "dataType": "Free text (HTML)",
        "reliability": "High",
        "live": True,
        "notes": "Scraped by the M2 research agent (trafilatura -> Playwright).",
    },
    {
        "section": "Players · Profile",
        "name": "Dealroom (public profiles)",
        "url": "https://app.dealroom.co/companies",
        "access": PARTIAL,
        "dataType": "Startup profile (HTML)",
        "reliability": "Medium",
        "live": False,
        "notes": "Individual company pages partially readable; funding/employees fallback.",
    },
    {
        "section": "Players · Team",
        "name": "LinkedIn company page",
        "url": "https://www.linkedin.com/company",
        "access": LIMITED,
        "dataType": "Public company page (HTML)",
        "reliability": "Medium",
        "live": False,
        "notes": "Not reliably accessible to automated research — manual only.",
    },
]


def live_collectors() -> list[dict]:
    return [s for s in SOURCE_DIRECTORY if s.get("live")]
