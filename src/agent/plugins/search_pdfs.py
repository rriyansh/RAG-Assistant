# src/agent/plugins/search_pdfs.py
from __future__ import annotations

import inspect
import logging
from typing import Any

from src.agent.registry import ToolRegistry, ToolSpec
from src.retrieval.hybrid_retriever import hybrid_retrieve

logger = logging.getLogger(__name__)


def _handle_search_pdfs(query: str) -> list[dict[str, Any]]:
    if not query or not query.strip():
        return []

    sig = inspect.signature(hybrid_retrieve)
    kwargs: dict[str, Any] = {}
    if "allow_web_fallback" in sig.parameters:
        kwargs["allow_web_fallback"] = False
    elif "use_web" in sig.parameters:
        kwargs["use_web"] = False

    raw_results = hybrid_retrieve(query.strip(), **kwargs)

    items: list[Any]
    if isinstance(raw_results, dict):
        items = raw_results.get("results", raw_results.get("chunks", raw_results.get("documents", [])))
    elif isinstance(raw_results, (list, tuple)):
        items = list(raw_results)
    else:
        items = []

    formatted: list[dict[str, Any]] = []
    for item in items:
        if isinstance(item, dict):
            source_type = str(item.get("source_type", item.get("type", "pdf"))).lower()
            if source_type != "pdf":
                continue
            metadata = item.get("metadata", {}) if isinstance(item.get("metadata"), dict) else {}
            doc_name = str(
                item.get("doc_name")
                or item.get("source")
                or metadata.get("doc_name")
                or metadata.get("source")
                or "document.pdf"
            )
            page = int(item.get("page") or metadata.get("page") or 1)
            text = str(item.get("text") or item.get("content") or "")
            score = float(item.get("score") or item.get("similarity") or 0.0)
        else:
            source_type = str(getattr(item, "source_type", "pdf")).lower()
            if source_type != "pdf":
                continue
            doc_name = str(getattr(item, "doc_name", getattr(item, "source", "document.pdf")))
            page = int(getattr(item, "page", 1) or 1)
            text = str(getattr(item, "text", getattr(item, "content", "")))
            score = float(getattr(item, "score", 0.0) or 0.0)

        formatted.append(
            {
                "doc_name": doc_name,
                "page": page,
                "text": text,
                "score": round(score, 4),
            }
        )

    return formatted


def register(reg: ToolRegistry) -> None:
    if reg.get("search_pdfs") is not None:
        return
    reg.register(
        ToolSpec(
            name="search_pdfs",
            description="Search indexed local PDF documents in the vector store for passages relevant to a query.",
            input_schema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query for matching relevant PDF passages.",
                    }
                },
                "required": ["query"],
                "additionalProperties": False,
            },
            handler=_handle_search_pdfs,
            requires_consent=False,
            source="internal",
        )
    )
