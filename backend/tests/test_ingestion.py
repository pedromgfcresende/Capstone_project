"""Unit tests for the CSV ingestion mappers (no DB / network)."""

from __future__ import annotations

import pandas as pd

from app.services.ingestion.common import build_extra, to_date, to_float, to_int
from app.services.ingestion.competitor_csv import _norm, _note_in_row, _segments_in_row
from app.services.ingestion.crm_csv import (
    _norm_name,
    _row_to_company as crm_row,
    coalesce_duplicate_columns,
    diff_stage_funding,
)
from types import SimpleNamespace


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


def test_crm_coalesces_duplicate_columns():
    # Affinity/Dealroom duplicate headers: pandas suffixes the 2nd with ".1".
    # The numeric "Number of Employees" is blank; the range duplicate fills it.
    raw = pd.DataFrame(
        [["Acme", None, "11-50", None, "2020"]],
        columns=[
            "Name",
            "Number of Employees",
            "Number of Employees.1",
            "Year Founded",
            "Year Founded.1",
        ],
    )
    merged = coalesce_duplicate_columns(raw)
    assert "Number of Employees.1" not in merged.columns
    assert "Year Founded.1" not in merged.columns
    assert merged.loc[0, "Number of Employees"] == "11-50"
    assert merged.loc[0, "Year Founded"] == "2020"


def test_crm_employee_range_parsed_to_midpoint():
    row = {"Name": "Acme", "Number of Employees": "51-200"}
    c = crm_row(row)
    assert c.employees_current == 126  # (51+200)/2 = 125.5 -> 126 (round-half-even)


def test_crm_prefers_numeric_employee_over_range():
    # "Employees (Current)" numeric is the fallback when Number of Employees blank
    row = {"Name": "Acme", "Number of Employees": None, "Employees (Current)": "52.0"}
    c = crm_row(row)
    assert c.employees_current == 52
    # the structured employee columns must not leak into extra
    assert "Number of Employees" not in c.extra
    assert "Employees (Current)" not in c.extra


# ── reconcile-upload diff (name-matched upsert) ───────────────────────────────
def test_reconcile_detects_only_stage_and_funding_changes():
    existing = SimpleNamespace(
        name="Acme", investment_stage="Seed",
        total_funding_eur=1_000_000.0, total_funding_usd=None,
    )
    # stage advanced + funding grew -> both flagged
    incoming = SimpleNamespace(
        name="Acme", investment_stage="Series A",
        total_funding_eur=5_000_000.0, total_funding_usd=None,
    )
    delta = diff_stage_funding(existing, incoming)
    assert delta["investment_stage"] == ("Seed", "Series A")
    assert delta["total_funding_eur"] == (1_000_000.0, 5_000_000.0)


def test_reconcile_no_change_returns_empty():
    existing = SimpleNamespace(investment_stage="Seed", total_funding_eur=1e6, total_funding_usd=None)
    incoming = SimpleNamespace(investment_stage="Seed", total_funding_eur=1e6, total_funding_usd=None)
    assert diff_stage_funding(existing, incoming) == {}


def test_reconcile_ignores_null_incoming_values():
    # a blank cell in the new file must not wipe an existing value
    existing = SimpleNamespace(investment_stage="Series B", total_funding_eur=8e6, total_funding_usd=None)
    incoming = SimpleNamespace(investment_stage=None, total_funding_eur=None, total_funding_usd=None)
    assert diff_stage_funding(existing, incoming) == {}


def test_norm_name():
    assert _norm_name("  Gradient   Labs ") == "gradient labs"
    assert _norm_name(None) == ""
