"""Unit tests for funding-stage consolidation."""

from __future__ import annotations

from app.services.stages import CANONICAL_STAGES, normalize_funding_stage


def test_plain_stages():
    assert normalize_funding_stage("Pre-Seed") == "Pre-Seed"
    assert normalize_funding_stage("Seed") == "Seed"
    assert normalize_funding_stage("Series A") == "Series A"
    assert normalize_funding_stage("series c") == "Series C"
    assert normalize_funding_stage("Series D") == "Series D"


def test_latest_round_wins():
    # "Seed + Series A" -> Series A (latest mentioned)
    assert normalize_funding_stage("Seed + Series A (Redpoint, LocalGlobe)") == "Series A"
    assert normalize_funding_stage("$16.6M (Seed-Series A)") == "Series A"
    assert normalize_funding_stage("Series A, then Series B") == "Series B"


def test_series_e_and_beyond_collapse_to_d():
    assert normalize_funding_stage("Series E") == "Series D"
    assert normalize_funding_stage("Series G") == "Series D"


def test_exit_states():
    assert normalize_funding_stage("Acquired by Stripe") == "Acquired"
    assert normalize_funding_stage("IPO 2021") == "Public"
    assert normalize_funding_stage("Publicly listed (NASDAQ)") == "Public"


def test_pre_seed_and_angel():
    assert normalize_funding_stage("pre seed") == "Pre-Seed"
    assert normalize_funding_stage("Angel round") == "Pre-Seed"
    # pre-seed must not be misread as Seed
    assert normalize_funding_stage("Pre-Seed") == "Pre-Seed"


def test_unrecognised_is_none():
    assert normalize_funding_stage("Grant") is None
    assert normalize_funding_stage("Bootstrapped") is None
    assert normalize_funding_stage("") is None
    assert normalize_funding_stage(None) is None


def test_canonical_set_is_exactly_the_eight_buckets():
    assert CANONICAL_STAGES == [
        "Pre-Seed", "Seed", "Series A", "Series B",
        "Series C", "Series D", "Public", "Acquired",
    ]
