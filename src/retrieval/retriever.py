"""Retriever module for vector search."""

import logging
from typing import List, Dict, Any, Optional
from src.embeddings.embedder import Embedder
from src.embeddings.vector_store import VectorStore

logger = logging.getLogger(__name__)


class Retriever:
    """Retrieves relevant chunks from vector store."""

    def __init__(
        self,
        embedder: Embedder | None = None,
        vector_store: VectorStore | None = None,
        top_k: int = 8
    ):
        self.embedder = embedder or Embedder()
        self.vector_store = vector_store or VectorStore()
        self.top_k = top_k

    def retrieve(self, query: str, filter_dict: Optional[Dict] = None) -> List[Dict[str, Any]]:
        """Retrieve relevant chunks for a query.

        Args:
            query: User query string.
            filter_dict: Optional metadata filter.

        Returns:
            List of retrieved chunks with metadata and scores.
        """
        query_embedding = self.embedder.embed_query(query)
        if not query_embedding:
            logger.warning("Empty query embedding")
            return []

        results = self.vector_store.search(
            query_embedding=query_embedding,
            top_k=self.top_k,
            filter_dict=filter_dict
        )

        logger.info(f"Retrieved {len(results)} chunks for query: {query[:50]}...")
        return results

    def retrieve_with_scores(self, query: str) -> List[Dict[str, Any]]:
        """Retrieve with similarity scores converted to relevance scores."""
        results = self.retrieve(query)
        for r in results:
            # Convert cosine distance to similarity score (1 - distance)
            r["score"] = 1.0 - r["distance"]
        # Sort by score descending
        results.sort(key=lambda x: x["score"], reverse=True)
        return results