"""
Two free web-search providers:

  DuckDuckGo  — completely free, unlimited, no API key.
  Tavily      — 1,000 free searches per month, higher quality.

You pick one in .env with WEB_SEARCH_PROVIDER=duckduckgo or tavily.
"""
from dataclasses import dataclass
from src.utils.config import get_settings
from src.utils.logger import setup_logger

logger = setup_logger(__name__)


@dataclass
class WebResult:
    title: str
    url: str
    snippet: str


# ------------------------------------------------------------
# DuckDuckGo — free, no key
# ------------------------------------------------------------
def _search_duckduckgo(query: str, max_results: int) -> list[WebResult]:
    try:
        from duckduckgo_search import DDGS
    except ImportError:
        logger.error("duckduckgo-search is not installed. Run pip install duckduckgo-search")
        return []

    try:
        with DDGS() as ddgs:
            raw = list(ddgs.text(query, max_results=max_results))
    except Exception as exc:
        logger.warning("DuckDuckGo failed: %s", exc)
        return []

    return [
        WebResult(
            title=item.get("title", ""),
            url=item.get("href", ""),
            snippet=item.get("body", ""),
        )
        for item in raw
    ]


# ------------------------------------------------------------
# Tavily — free tier (1000/month)
# ------------------------------------------------------------
def _search_tavily(query: str, max_results: int) -> list[WebResult]:
    settings = get_settings()
    if not settings.tavily_api_key:
        logger.warning("TAVILY_API_KEY is empty; falling back to DuckDuckGo")
        return _search_duckduckgo(query, max_results)

    try:
        from tavily import TavilyClient
    except ImportError:
        logger.error("tavily-python is not installed. Run pip install tavily-python")
        return []

    try:
        client = TavilyClient(api_key=settings.tavily_api_key)
        response = client.search(query=query, max_results=max_results)
    except Exception as exc:
        logger.warning("Tavily failed: %s", exc)
        return []

    return [
        WebResult(
            title=item.get("title", ""),
            url=item.get("url", ""),
            snippet=item.get("content", ""),
        )
        for item in response.get("results", [])
    ]


# ------------------------------------------------------------
# Public entry point — picks the right provider
# ------------------------------------------------------------
def web_search(query: str, max_results: int | None = None) -> list[WebResult]:
    settings = get_settings()
    if not settings.web_search_enabled:
        return []

    limit = max_results or settings.web_search_max_results
    provider = settings.web_search_provider.lower()

    if provider == "tavily":
        return _search_tavily(query, limit)
    return _search_duckduckgo(query, limit)
