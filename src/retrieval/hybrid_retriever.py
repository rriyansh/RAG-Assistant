"""
Combines three sources into one ranked list:
  1. Local PDFs (vector search)
  2. Saved web pages (vector search)
  3. Live web search (DuckDuckGo/Tavily) — only when needed

This is the "brain" that decides where to look.
"""
from src.retrieval.retriever import retrieve, RetrievedChunk
from src.retrieval.web_search import web_search
from src.ingestion.web_loader import fetch_page_text
from src.utils.config import get_settings
from src.utils.logger import setup_logger

logger = setup_logger(__name__)

# Words that strongly suggest the user wants fresh web info.
FRESHNESS_WORDS = {
    "latest", "today", "current", "now", "recent", "live",
    "news", "2025", "2026", "breaking", "update",
}


def _query_needs_web(question: str) -> bool:
    """Return True if the question is likely asking for live info."""
    words = set(question.lower().split())
    return bool(words & FRESHNESS_WORDS)


def hybrid_retrieve(question: str) -> tuple[list[RetrievedChunk], bool]:
    """
    Returns (chunks, used_web).

    used_web=True tells the answer generator that some chunks
    came from a live web search, so it can cite them properly.
    """
    settings = get_settings()

    # 1. Always look in the local vector store first
    local_chunks = retrieve(question)

    # 2. Decide whether we also need the live web
    best_local_score = max((c.score for c in local_chunks), default=0.0)

    needs_web = (
        settings.web_search_enabled
        and (
            _query_needs_web(question)
            or best_local_score < settings.web_fallback_threshold
            or not local_chunks
        )
    )

    if not needs_web:
        return local_chunks, False

    # 3. Fetch live web results
    logger.info("Triggering live web search for: %s", question)
    web_hits = web_search(question, settings.web_search_max_results)
    if not web_hits:
        return local_chunks, False

    # 4. Turn each result's page into a chunk (so the LLM can read it)
    web_chunks: list[RetrievedChunk] = []
    for i, hit in enumerate(web_hits):
        body = fetch_page_text(hit.url) or hit.snippet
        if not body:
            continue
        web_chunks.append(
            RetrievedChunk(
                chunk_id=f"web::{i}::{hit.url}",
                doc_name=hit.title or hit.url,
                page_number=1,
                source_type="web",
                text=body[:2000],          # keep it short for the prompt
                score=0.5,                 # neutral score for live web
            )
        )

    # 5. Merge and sort by score. Live web chunks always sit
    #    alongside local chunks so the LLM can compare.
    merged = local_chunks + web_chunks
    merged.sort(key=lambda c: c.score, reverse=True)
    return merged[: settings.top_k], True
