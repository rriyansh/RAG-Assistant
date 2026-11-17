"""
Two improvements over the previous version:
    1. Query rewriting — a single LLM call rewrites the user's
       question into 2 shorter search queries. More chunks match.
    2. Deduplication — the same chunk can't appear twice.
"""
from src.retrieval.retriever import retrieve, RetrievedChunk
from src.retrieval.web_search import web_search
from src.ingestion.web_loader import fetch_page_text
from src.utils.config import get_settings
from src.utils.logger import setup_logger

logger = setup_logger(__name__)

FRESHNESS_WORDS = {
    "latest", "today", "current", "now", "recent", "live",
    "news", "2025", "2026", "breaking", "update",
}


def _query_needs_web(q: str) -> bool:
    return bool(set(q.lower().split()) & FRESHNESS_WORDS)


def _rewrite_query(question: str) -> list[str]:
    """
    Return 1-3 search variants. If LLM rewrite fails (or no key
    is configured yet), just return the original question.
    """
    try:
        from src.llm.factory import create_llm
        llm = create_llm()
        prompt = [
            {
                "role": "system",
                "content": (
                    "Rewrite the user's question into up to three short "
                    "keyword search queries (2-6 words each). Return "
                    "them one per line, no numbering, no prose."
                ),
            },
            {"role": "user", "content": question},
        ]
        raw = llm.generate(prompt, temperature=0.1)
        lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]
        variants = [question] + [ln for ln in lines if len(ln) < 120][:3]
        return variants[:3]
    except Exception as exc:
        logger.debug("Query rewrite skipped: %s", exc)
        return [question]


def hybrid_retrieve(question: str) -> tuple[list[RetrievedChunk], bool]:
    settings = get_settings()
    queries = _rewrite_query(question)

    # 1. Local search across all query variants
    local: dict[str, RetrievedChunk] = {}
    for q in queries:
        for c in retrieve(q):
            existing = local.get(c.chunk_id)
            if existing is None or c.score > existing.score:
                local[c.chunk_id] = c
    local_chunks = sorted(local.values(), key=lambda c: c.score, reverse=True)

    # 2. Web fallback decision
    best_score = local_chunks[0].score if local_chunks else 0.0
    needs_web = (
        settings.web_search_enabled
        and (
            _query_needs_web(question)
            or best_score < settings.web_fallback_threshold
            or not local_chunks
        )
    )

    if not needs_web:
        return local_chunks[: settings.top_k], False

    # 3. Live web search on the ORIGINAL question (not the rewrite)
    logger.info("Live web search triggered: %s", question)
    web_hits = web_search(question, settings.web_search_max_results)
    if not web_hits:
        return local_chunks[: settings.top_k], False

    web_chunks: list[RetrievedChunk] = []
    seen_urls: set[str] = set()
    for i, hit in enumerate(web_hits):
        if hit.url in seen_urls:
            continue
        seen_urls.add(hit.url)
        body = fetch_page_text(hit.url) or hit.snippet
        if not body:
            continue
        web_chunks.append(
            RetrievedChunk(
                chunk_id=f"web::{i}::{hit.url}",
                doc_name=hit.title or hit.url,
                page_number=1,
                source_type="web",
                text=body[:2000],
                score=0.5,
            )
        )

    # 4. Merge, dedupe by chunk_id, sort
    merged: dict[str, RetrievedChunk] = {c.chunk_id: c for c in local_chunks}
    for c in web_chunks:
        merged.setdefault(c.chunk_id, c)
    ordered = sorted(merged.values(), key=lambda c: c.score, reverse=True)
    return ordered[: settings.top_k], True
