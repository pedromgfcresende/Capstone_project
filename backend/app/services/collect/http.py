"""Shared HTTP for open-data collectors — a small, polite httpx wrapper.

Collectors are best-effort: any network/parse failure returns None rather than
raising, so a missing data source never breaks an enrichment run.
"""

from __future__ import annotations

from typing import Any

import httpx

from app.config import settings

_TIMEOUT = httpx.Timeout(10.0, connect=5.0)


def get_json(url: str, *, params: dict | None = None, headers: dict | None = None,
             auth: tuple[str, str] | None = None) -> Any | None:
    """GET a JSON endpoint. Returns the parsed body, or None on any failure."""
    hdrs = {"User-Agent": settings.collect_user_agent, "Accept": "application/json"}
    if headers:
        hdrs.update(headers)
    try:
        resp = httpx.get(url, params=params, headers=hdrs, auth=auth, timeout=_TIMEOUT,
                         follow_redirects=True)
        resp.raise_for_status()
        return resp.json()
    except Exception:  # noqa: BLE001 - collection is best-effort
        return None
