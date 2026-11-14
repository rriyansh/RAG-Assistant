"""Reranker module for improving retrieval quality."""

import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


class Reranker:
    """Reranks retrieved chunks using cross-encoder or heuristic scoring."""

    def __init__(self, model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"):
        self.model_name = model_name
        self._model = None
        self._use_cross_encoder = False
        self._try_load_cross_encoder()

    def _try_load_cross_encoder(self) -> None:
        """Try to load cross-encoder model."""
        try:
            from sentence_transformers import CrossEncoder
            self._model = CrossEncoder(self.model_name)
            self._use_cross_encoder = True
            logger.info(f"Loaded cross-encoder: {self.model_name}")
        except Exception as e:
            logger.warning(f"Cross-encoder not available, using heuristic reranking: {e}")
            self._use_cross_encoder = False

    def rerank(
        self,
        query: str,
        chunks: List[Dict[str, Any]],
        top_k: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Rerank chunks by relevance to query.

        Args:
            query: User query.
            chunks: List of retrieved chunks with 'text' and 'score'.
            top_k: Number of top results to return.

        Returns:
            Reranked chunks with updated scores.
        """
        if not chunks:
            return []

        if self._use_cross_encoder and self._model:
            return self._rerank_cross_encoder(query, chunks, top_k)
        else:
            return self._rerank_heuristic(query, chunks, top_k)

    def _rerank_cross_encoder(
        self,
        query: str,
        chunks: List[Dict[str, Any]],
        top_k: Optional[int]
    ) -> List[Dict[str, Any]]:
        """Rerank using cross-encoder model."""
        pairs = [(query, chunk["text"]) for chunk in chunks]
        scores = self._model.predict(pairs)

        for chunk, score in zip(chunks, scores):
            chunk["rerank_score"] = float(score)

        chunks.sort(key=lambda x: x.get("rerank_score", 0), reverse=True)
        return chunks[:top_k] if top_k else chunks

    def _rerank_heuristic(
        self,
        query: str,
        chunks: List[Dict[str, Any]],
        top_k: Optional[int]
    ) -> List[Dict[str, Any]]:
        """Simple heuristic reranking based on keyword overlap."""
        query_terms = set(query.lower().split())

        for chunk in chunks:
            text_terms = set(chunk["text"].lower().split())
            overlap = len(query_terms & text_terms)
            # Combine original score with keyword overlap
            original_score = chunk.get("score", 0)
            chunk["rerank_score"] = original_score * 0.7 + (overlap / max(len(query_terms), 1)) * 0.3

        chunks.sort(key=lambda x: x.get("rerank_score", 0), reverse=True)
        return chunks[:top_k] if top_k else chunks