"""Unit tests for the CSV ingestion mappers (no DB / network)."""

from __future__ import annotations

import pandas as pd

from app.services.ingestion.common import build_extra, to_date, to_float, to_int
from app.services.ingestion.competitor_csv import _row_to_company
from app.services.ingestion.crm_csv import _row_to_company as crm_row


def test_scalar_coercion():
    assert to_int("2021") == 2021
    assert to_int("2021.0") == 2021
    assert to_int(None) is None
    assert to_int("n/a") is None
    assert to_float("25180000.0") == 25180000.0
    assert to_float(float("nan")) is None
    assert to_date("11/06/2025").isoformat() == "2025-11-06"
    assert to_date(None) is None


def test_build_extra_drops_empty_and_cb_columns():
    row = {
        "Name": "Acme",
        "Weird Column": "keep me",
        "Empty": None,
        "CB Description - Not available for export": "x",
    }
    extra = build_extra(row, {"Name"})
    assert extra == {"Weird Column": "keep me"}


def test_competitor_focal_detection():
    focal = _row_to_company({"Name": "Gradient Labs", "Competitive Potential": None})
    rival = _row_to_company({"Name": "Sierra", "Competitive Potential": "2"})
    assert focal.focal is True
    assert rival.focal is False
    assert rival.competitive_potential == 2


def test_competitor_core_mapping_and_extra():
    c = _row_to_company(
        {
            "Name": "Sierra",
            "Founded": "2023",
            "HQ": "USA",
            "Segment": "Horizontal support platform",
            "Notes/ Relevance": "lacks FS guardrails",
            "Mystery": "stash this",
        }
    )
    assert c.geography == "USA"
    assert c.notes == "lacks FS guardrails"
    assert c.extra == {"Mystery": "stash this"}


def test_crm_core_mapping():
    df = pd.DataFrame(
        [
            {
                "Organization Id": "1",
                "Name": "Ivy",
                "Total Funding Amount (EUR)": 25180000.0,
                "Year Founded": 2021.0,
                "lead_status": "hot",
                "Random Enrichment": "x",
            }
        ]
    )
    c = crm_row(df.to_dict(orient="records")[0])
    assert c.name == "Ivy"
    assert c.total_funding_eur == 25180000.0
    assert c.year_founded == 2021
    assert c.lead_status == "hot"
    assert c.extra == {"Random Enrichment": "x"}
