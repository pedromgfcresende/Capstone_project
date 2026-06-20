"""Unit tests for the Comparative-tab axis parsing (no DB / network)."""

from __future__ import annotations

import math

from app.services.axes import (
    EMPLOYEE_CUTOFF,
    FUNDING_EUR_CUTOFF,
    YEAR_FOUNDED_CUTOFF,
    coalesce,
    employee_range_label,
    parse_employee_count,
    parse_funding_to_eur,
    parse_year,
)


def test_cutoffs_match_spec():
    assert FUNDING_EUR_CUTOFF == 2_000_000.0
    assert YEAR_FOUNDED_CUTOFF == 2023
    assert EMPLOYEE_CUTOFF == 15


def test_parse_funding_symbols_and_suffixes():
    assert parse_funding_to_eur("€8M") == 8_000_000
    assert parse_funding_to_eur("€106M") == 106_000_000
    assert parse_funding_to_eur("€1M") == 1_000_000
    assert parse_funding_to_eur("500K") == 500_000
    assert parse_funding_to_eur("€1.5bn") == 1_500_000_000
    # raw numeric strings / numbers pass straight through
    assert parse_funding_to_eur("25180000.0") == 25_180_000
    assert parse_funding_to_eur(12_000_000) == 12_000_000


def test_parse_funding_usd_is_converted_and_handles_trailing_text():
    # "$16.6M (Seed-Series A)" -> 16.6M USD * 0.92
    val = parse_funding_to_eur("$16.6M (Seed-Series A)")
    assert math.isclose(val, 16_600_000 * 0.92, rel_tol=1e-6)


def test_parse_funding_blanks():
    for blank in (None, "", "N/A", "—", float("nan")):
        assert parse_funding_to_eur(blank) is None


def test_parse_year():
    assert parse_year("2021") == 2021
    assert parse_year("2021.0") == 2021
    assert parse_year(2018) == 2018
    assert parse_year("Founded 2024") == 2024
    assert parse_year("N/A") is None
    assert parse_year(None) is None
    assert parse_year("1500") is None  # out of plausible range


def test_parse_employee_count_ranges_to_midpoint():
    assert parse_employee_count("11-50") == 30      # (11+50)/2 = 30.5 -> 30
    assert parse_employee_count("1-10") == 6        # 5.5 -> 6
    assert parse_employee_count("201-500") == 350
    assert parse_employee_count("501–1000") == 750  # en dash
    assert parse_employee_count("5000+") == 5000
    assert parse_employee_count("52.0") == 52
    assert parse_employee_count("42") == 42
    assert parse_employee_count(None) is None
    assert parse_employee_count("") is None


def test_employee_range_label():
    assert employee_range_label(30) == "11–50"
    assert employee_range_label(5) == "1–10"
    assert employee_range_label(750) == "501–1000"
    assert employee_range_label(99999) == "5000+"
    assert employee_range_label(None) is None


def test_coalesce_prefers_first_non_blank():
    # mirrors the duplicate-column merge: numeric wins, range is the fallback
    assert coalesce("52.0", "51-200") == "52.0"
    assert coalesce(None, "51-200") == "51-200"
    assert coalesce("", float("nan"), "2023") == "2023"
    assert coalesce(None, "") is None
