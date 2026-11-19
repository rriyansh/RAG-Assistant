# src/agent/plugins/web_search.py
from __future__ import annotations

import logging
from typing import Any

from src.agent.registry import ToolRegistry, ToolSpec
from src.retrieval.web_search import web_search as run_web_search

logger = logging.getLogger(__name__)


def _handle_web_search(query: str) -> list[dict[str, str]]:
    if not query or not query.strip():
        return []

    raw_results = run_web_search(query.strip())
    items: list[Any] = list(raw_results) if isinstance(raw_results, (list, tuple)) else []

    formatted: list[dict[str, str]] = []
    for item in items:
        if isinstance(item, dict):
            title = str(item.get("title") or item.get("doc_name") or "Web Result")
            url = str(item.get("url") or item.get("source") or item.get("href") or "")
            snippet = str(item.get("snippet") or item.get("text") or item.get("body") or "")
        else:
            title = str(getattr(item, "title", "Web Result"))
            url = str(getattr(item, "url", getattr(item, "source", "")))
            snippet = str(getattr(item, "snippet", getattr(item, "text", "")))

        formatted.append(
            {
                "title": title,
                "url": url,
                "snippet": snippet,
            }
        )
    return formatted


def register(reg: ToolRegistry) -> None:
    if reg.get("web_search") is not None:
        return
    reg.register(
        ToolSpec(
            name="web_search",
            description="Search the live web using DuckDuckGo/Tavily for up-to-date facts, news, or external references.",
            input_schema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query string.",
                    }
                },
                "required": ["query"],
                "additionalProperties": False,
            },
            handler=_handle_web_search,
            requires_consent=False,
            source="internal",
        )
    )
