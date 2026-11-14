"""Agent router for deciding search strategy."""

import logging
import re
from typing import Dict, Any, List, Optional
from pydantic_settings import BaseSettings
from src.generation.llm_client import LLMClient
from src.retrieval.web_search import WebSearch

logger = logging.getLogger(__name__)


class RouterSettings(BaseSettings):
    """Settings for the router."""
    openai_api_key: str
    llm_model: str = "gpt-4o-mini"
    tavily_api_key: str = ""

    class Config:
        env_file = ".env"


class Router:
    """Routes queries to vector search, web search, or both."""

    # Keywords that suggest web search is needed
    WEB_SEARCH_KEYWORDS = [
        "latest", "recent", "current", "news", "today", "now",
        "2024", "2025", "2026", "this year", "this month",
        "price", "stock", "weather", "live", "real-time"
    ]

    def __init__(self, settings: RouterSettings | None = None):
        self.settings = settings or RouterSettings()
        self.llm = LLMClient(LLMSettings(
            openai_api_key=self.settings.openai_api_key,
            llm_model=self.settings.llm_model
        ))
        self.web_search = WebSearch(WebSearchSettings(tavily_api_key=self.settings.tavily_api_key))

    def should_search_web(self, query: str, vector_results: List[Dict[str, Any]]) -> bool:
        """Decide if web search is needed.

        Args:
            query: User query.
            vector_results: Results from vector search.

        Returns:
            True if web search should be performed.
        """
        # Check for explicit web search keywords
        query_lower = query.lower()
        if any(kw in query_lower for kw in self.WEB_SEARCH_KEYWORDS):
            logger.info("Web search triggered by keyword")
            return True

        # Check if vector results are low quality (low scores)
        if vector_results:
            avg_score = sum(r.get("score", 0) for r in vector_results) / len(vector_results)
            if avg_score < 0.3:
                logger.info(f"Web search triggered by low vector scores (avg: {avg_score:.2f})")
                return True
        else:
            logger.info("Web search triggered by no vector results")
            return True

        # Use LLM to decide for ambiguous cases
        return self._llm_decide(query, vector_results)

    def _llm_decide(self, query: str, vector_results: List[Dict[str, Any]]) -> bool:
        """Use LLM to decide if web search is needed."""
        if not self.web_search.enabled:
            return False

        prompt = f"""Given the user query and the quality of retrieved document chunks,
decide if a web search would help provide a better answer.

Query: {query}

Number of retrieved chunks: {len(vector_results)}
Average relevance score: {sum(r.get('score', 0) for r in vector_results) / max(len(vector_results), 1):.2f}

Reply with only "YES" or "NO"."""

        try:
            response = self.llm.generate(prompt, temperature=0)
            decision = response.strip().upper()
            logger.info(f"LLM router decision: {decision}")
            return decision == "YES"
        except Exception as e:
            logger.error(f"LLM router failed: {e}")
            return False

    def route(
        self,
        query: str,
        vector_results: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Route query and return combined results.

        Args:
            query: User query.
            vector_results: Results from vector search.

        Returns:
            Dict with vector_results, web_results, and search_performed flag.
        """
        do_web_search = self.should_search_web(query, vector_results)
        web_results = []

        if do_web_search:
            web_results = self.web_search.search(query, max_results=5)

        return {
            "vector_results": vector_results,
            "web_results": web_results,
            "web_search_performed": do_web_search
        }