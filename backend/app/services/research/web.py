"""Web layer for AI market research.

- web_search: Tavily (LLM-grounded search; returns clean content snippets).
- fetch_page: trafilatura (fast, static) first, Playwright (headless Chromium)
  fallback only when the static fetch returns too little (JS-rendered sites).
"""

from __future__ import annotations

from app.config import settings


def web_search(query: str, max_results: int = 5) -> list[dict]:
    if not settings.tavily_api_key:
        return []
    try:
        from tavily import TavilyClient

        client = TavilyClient(api_key=settings.tavily_api_key)
        res = client.search(query, max_results=max_results, search_depth="basic")
        return [
            {"title": r.get("title"), "url": r.get("url"), "content": (r.get("content") or "")[:1500]}
            for r in res.get("results", [])
        ]
    except Exception:  # noqa: BLE001 - research is best-effort
        return []


def _extract(html_or_doc) -> str:
    import trafilatura

    return trafilatura.extract(html_or_doc, include_comments=False, include_tables=False) or ""


def fetch_page(url: str, *, min_chars: int = 300, cap: int = 6000) -> dict:
    """Return {text, method}. trafilatura first; Playwright fallback if too thin."""
    import trafilatura

    # 1) static fetch
    try:
        downloaded = trafilatura.fetch_url(url)
        if downloaded:
            text = _extract(downloaded)
            if len(text) >= min_chars:
                return {"text": text[:cap], "method": "static"}
    except Exception:  # noqa: BLE001
        pass

    # 2) headless-browser fallback (JS-rendered / anti-bot)
    try:
        from playwright.sync_api import sync_playwright

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(url, timeout=15000, wait_until="domcontentloaded")
            html = page.content()
            browser.close()
        text = _extract(html)
        return {"text": text[:cap], "method": "playwright"}
    except Exception:  # noqa: BLE001
        return {"text": "", "method": "failed"}
