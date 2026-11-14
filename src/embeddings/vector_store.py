"""ChromaDB vector store module."""

import logging
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings as ChromaSettings
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)


class VectorStoreSettings(BaseSettings):
    """Settings for the vector store."""
    chroma_persist_dir: str = "./data/chroma"
    chroma_collection: str = "pdf_chunks"

    class Config:
        env_file = ".env"


class VectorStore:
    """ChromaDB vector store for document chunks."""

    def __init__(self, settings: VectorStoreSettings | None = None):
        self.settings = settings or VectorStoreSettings()
        self.client = chromadb.PersistentClient(
            path=self.settings.chroma_persist_dir,
            settings=ChromaSettings(anonymized_telemetry=False)
        )
        self.collection = self.client.get_or_create_collection(
            name=self.settings.chroma_collection,
            metadata={"hnsw:space": "cosine"}
        )
        logger.info(f"Initialized ChromaDB collection: {self.settings.chroma_collection}")

    def add_chunks(self, chunks: List[Dict[str, Any]], embeddings: List[List[float]]) -> None:
        """Add chunks with embeddings to the vector store.

        Args:
            chunks: List of chunk dicts with metadata.
            embeddings: List of embedding vectors.
        """
        if not chunks or not embeddings:
            logger.warning("No chunks or embeddings to add")
            return

        if len(chunks) != len(embeddings):
            raise ValueError("Chunks and embeddings length mismatch")

        ids = [str(chunk["chunk_id"]) for chunk in chunks]
        documents = [chunk["text"] for chunk in chunks]
        metadatas = [
            {
                "source": chunk["source"],
                "page_number": chunk["page_number"],
                "chunk_index": chunk["chunk_index"],
                "total_chunks_in_page": chunk["total_chunks_in_page"]
            }
            for chunk in chunks
        ]

        self.collection.add(
            ids=ids,
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas
        )
        logger.info(f"Added {len(chunks)} chunks to vector store")

    def search(
        self,
        query_embedding: List[float],
        top_k: int = 8,
        filter_dict: Optional[Dict] = None
    ) -> List[Dict[str, Any]]:
        """Search for similar chunks.

        Args:
            query_embedding: Query embedding vector.
            top_k: Number of results to return.
            filter_dict: Optional metadata filter.

        Returns:
            List of result dicts with text, metadata, and distance.
        """
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=filter_dict,
            include=["documents", "metadatas", "distances"]
        )

        if not results["documents"] or not results["documents"][0]:
            return []

        formatted = []
        for i in range(len(results["documents"][0])):
            formatted.append({
                "text": results["documents"][0][i],
                "metadata": results["metadatas"][0][i],
                "distance": results["distances"][0][i]
            })
        return formatted

    def get_collection_stats(self) -> Dict[str, Any]:
        """Get collection statistics."""
        count = self.collection.count()
        return {"total_chunks": count, "collection_name": self.settings.chroma_collection}

    def clear_collection(self) -> None:
        """Clear all documents from the collection."""
        self.client.delete_collection(name=self.settings.chroma_collection)
        self.collection = self.client.get_or_create_collection(
            name=self.settings.chroma_collection,
            metadata={"hnsw:space": "cosine"}
        )
        logger.info("Cleared collection")