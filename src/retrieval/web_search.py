"""Free live web search with a Wikipedia fallback."""
from dataclasses import dataclass

import requests
from bs4 import BeautifulSoup

from src.utils.config import get_settings
from src.utils.logger import setup_logger

logger = setup_logger(__name__)


@dataclass
class WebResult:
    title: str
    url: str
    snippet: str


def _format_results(raw: list[dict], url_key: str) -> list[WebResult]:
    results: list[WebResult] = []
    for item in raw:
        url = str(item.get(url_key) or "")
        if not url or "grokipedia.com" in url:
            continue
        results.append(
            WebResult(
                title=item.get("title", ""),
                url=url,
                snippet=item.get("body", item.get("snippet", "")),
            )
        )
    return results


def _search_metasearch(query: str, max_results: int) -> list[WebResult]:
    try:
        from ddgs import DDGS
    except ImportError:
        logger.error("ddgs is not installed. Run uv pip install -r requirements.txt")
        return []

    try:
        raw = list(DDGS().text(query, max_results=max_results, backend="auto"))
    except Exception as exc:
        logger.warning("Free web metasearch failed: %s", exc)
        return []
    return _format_results(raw, "href")


def _search_wikipedia(query: str, max_results: int) -> list[WebResult]:
    try:
        response = requests.get(
            "https://en.wikipedia.org/w/api.php",
            params={
                "action": "query",
                "list": "search",
                "srsearch": query,
                "srlimit": max_results,
                "format": "json",
            },
            headers={
                "User-Agent": "RAG-Assistant/1.0 (https://github.com/rriyansh/RAG-Assistant)"
            },
            timeout=10,
        )
        response.raise_for_status()
        items = response.json().get("query", {}).get("search", [])
    except (requests.RequestException, ValueError) as exc:
        logger.warning("Free Wikipedia search fallback failed: %s", exc)
        return []

    return [
        WebResult(
            title=item.get("title", ""),
            url=f"https://en.wikipedia.org/?curid={item['pageid']}",
            snippet=BeautifulSoup(item.get("snippet", ""), "html.parser").get_text(" ", strip=True),
        )
        for item in items
        if item.get("pageid")
    ]


def web_search(query: str, max_results: int | None = None) -> list[WebResult]:
    settings = get_settings()
    if not settings.web_search_enabled:
        return []

    limit = max_results or settings.web_search_max_results
    results = _search_metasearch(query, limit)
    if results:
        return results

    logger.info("Free metasearch returned no results; using Wikipedia search.")
    return _search_wikipedia(query, limit)
