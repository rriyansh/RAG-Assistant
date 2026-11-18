"""
Decision layer between retrieval and generation.

Inspects retrieved context chunks to determine attribution flags (such as
whether web search contributed to the context) and grounding signals before
prompt assembly and LLM generation.
"""
from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass

from src.retrieval.retriever import RetrievedChunk


@dataclass(frozen=True, slots=True)
class RetrievalDecision:
    """Structured routing and attribution signals derived from retrieved chunks."""

    used_web: bool
    has_local_docs: bool
    has_context: bool
    web_chunk_count: int
    local_chunk_count: int


def _is_web_chunk(chunk: RetrievedChunk) -> bool:
    source_type = getattr(chunk, "source_type", None)
    return isinstance(source_type, str) and source_type.strip().lower() == "web"


def should_mention_web(chunks: Iterable[RetrievedChunk]) -> bool:
    """Return True if at least one retrieved chunk originated from web search."""
    return any(_is_web_chunk(c) for c in chunks)


def evaluate_retrieval(chunks: Iterable[RetrievedChunk]) -> RetrievalDecision:
    """
    Summarize source composition across retrieved chunks so the generation
    layer can tailor system instructions, citations, and fallback behavior.
    """
    chunk_list = list(chunks)
    web_count = sum(1 for c in chunk_list if _is_web_chunk(c))
    local_count = len(chunk_list) - web_count

    return RetrievalDecision(
        used_web=web_count > 0,
        has_local_docs=local_count > 0,
        has_context=len(chunk_list) > 0,
        web_chunk_count=web_count,
        local_chunk_count=local_count,
    )
