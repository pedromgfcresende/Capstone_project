"""Unit tests for the CSV ingestion mappers (no DB / network)."""

from __future__ import annotations

import pandas as pd

from app.services.ingestion.common import build_extra, to_date, to_float, to_int
from app.services.ingestion.competitor_csv import _norm, _note_in_row, _segments_in_row
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


def test_competitor_focal_is_untiered_row():
    # focal = the row with no competitive-potential tier
    assert to_int(None) is None         # focal row
    assert to_int("2") == 2             # competitor row


def test_segment_column_is_list():
    assert _segments_in_row({"Segment": "FS point solution"}) == ["FS point solution"]
    assert _segments_in_row({"Segment": "A; B | C"}) == ["A", "B", "C"]
    # a slash is NOT a list separator (e.g. "Custom build / infra" is one segment)
    assert _segments_in_row({"Segment": "Custom build / infra"}) == ["Custom build / infra"]
    assert _segments_in_row({"Segment": None}) == ["Unsegmented"]


def test_competitor_helpers():
    assert _norm("  Gradient   Labs ") == "gradient labs"
    assert _note_in_row({"Notes/ Relevance": "lacks FS guardrails"}) == "lacks FS guardrails"
    assert _note_in_row({"Notes": "x"}) == "x"
    assert _note_in_row({"other": "y"}) is None


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
