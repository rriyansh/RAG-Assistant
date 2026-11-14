"""Web search module using Tavily API."""

import logging
from typing import List, Dict, Any, Optional
from pydantic_settings import BaseSettings
import httpx

logger = logging.getLogger(__name__)


class WebSearchSettings(BaseSettings):
    """Settings for web search."""
    tavily_api_key: str = ""

    class Config:
        env_file = ".env"


class WebSearch:
    """Web search using Tavily API."""

    def __init__(self, settings: WebSearchSettings | None = None):
        self.settings = settings or WebSearchSettings()
        self.api_key = self.settings.tavily_api_key
        self.base_url = "https://api.tavily.com"
        self.enabled = bool(self.api_key)

    def search(self, query: str, max_results: int = 5) -> List[Dict[str, Any]]:
        """Search the web for relevant information.

        Args:
            query: Search query.
            max_results: Maximum number of results.

        Returns:
            List of search results with title, url, content.
        """
        if not self.enabled:
            logger.warning("Web search disabled (no TAVILY_API_KEY)")
            return []

        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    f"{self.base_url}/search",
                    json={
                        "api_key": self.api_key,
                        "query": query,
                        "max_results": max_results,
                        "search_depth": "basic",
                        "include_answer": True,
                        "include_raw_content": False
                    }
                )
                response.raise_for_status()
                data = response.json()

                results = []
                for item in data.get("results", []):
                    results.append({
                        "title": item.get("title", ""),
                        "url": item.get("url", ""),
                        "content": item.get("content", ""),
                        "score": item.get("score", 0)
                    })

                logger.info(f"Web search returned {len(results)} results for: {query[:50]}...")
                return results

        except Exception as e:
            logger.error(f"Web search failed: {e}")
            return []

    def format_results(self, results: List[Dict[str, Any]]) -> str:
        """Format search results for prompt inclusion."""
        if not results:
            return "No web search results found."

        formatted = ["Web Search Results:"]
        for i, r in enumerate(results, 1):
            formatted.append(f"\n[{i}] {r['title']}")
            formatted.append(f"    URL: {r['url']}")
            formatted.append(f"    Content: {r['content'][:500]}...")
        return "\n".join(formatted)