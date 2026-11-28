"""
Stores chunks + their vectors in Chroma (a local database).
Also keeps metadata: which document, which page, and whether
the chunk came from a PDF or a web page.
"""
import chromadb
from chromadb.config import Settings as ChromaSettings
from src.utils.config import get_settings
from src.ingestion.chunker import Chunk
from src.utils.logger import setup_logger

logger = setup_logger(__name__)


def _client():
    settings = get_settings()
    return chromadb.PersistentClient(
        path=settings.chroma_persist_dir,
        settings=ChromaSettings(anonymized_telemetry=False),
    )


def get_collection():
    settings = get_settings()
    return _client().get_or_create_collection(
        name=settings.chroma_collection,
        metadata={"hnsw:space": "cosine"},
    )


def reset_collection() -> None:
    """Wipe the collection. Used by ingest.py before a fresh run."""
    settings = get_settings()
    client = _client()
    try:
        client.delete_collection(settings.chroma_collection)
    except Exception:
        pass
    client.get_or_create_collection(
        name=settings.chroma_collection,
        metadata={"hnsw:space": "cosine"},
    )
    from src.embeddings.embedder import invalidate_embedding_cache
    from src.retrieval.hybrid_retriever import invalidate_retrieval_cache
    invalidate_embedding_cache()
    invalidate_retrieval_cache()


def upsert_chunks(chunks: list[Chunk], embeddings: list[list[float]]) -> None:
    if not chunks:
        return
    collection = get_collection()
    collection.upsert(
        ids=[c.chunk_id for c in chunks],
        embeddings=embeddings,
        documents=[c.text for c in chunks],
        metadatas=[
            {
                "doc_name": c.doc_name,
                "page_number": c.page_number,
                "source_type": c.source_type,
            }
            for c in chunks
        ],
    )
    logger.info("Upserted %d chunks", len(chunks))
    from src.retrieval.hybrid_retriever import invalidate_retrieval_cache
    invalidate_retrieval_cache()
