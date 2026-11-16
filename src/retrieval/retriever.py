"""
Given a question, find the most similar chunks already stored
in the vector database (PDFs and saved web pages).
"""
from dataclasses import dataclass
from src.embeddings.embedder import embed_query
from src.embeddings.vector_store import get_collection
from src.utils.config import get_settings


@dataclass
class RetrievedChunk:
    chunk_id: str
    doc_name: str
    page_number: int
    source_type: str
    text: str
    score: float


def retrieve(query: str, top_k: int | None = None) -> list[RetrievedChunk]:
    settings = get_settings()
    k = top_k or settings.top_k
    collection = get_collection()
    query_vector = embed_query(query)

    result = collection.query(query_embeddings=[query_vector], n_results=k)

    ids = result.get("ids", [[]])[0]
    docs = result.get("documents", [[]])[0]
    metas = result.get("metadatas", [[]])[0]
    distances = result.get("distances", [[]])[0]

    out: list[RetrievedChunk] = []
    for cid, doc, meta, dist in zip(ids, docs, metas, distances):
        out.append(
            RetrievedChunk(
                chunk_id=cid,
                doc_name=meta.get("doc_name", "unknown"),
                page_number=int(meta.get("page_number", 0)),
                source_type=meta.get("source_type", "pdf"),
                text=doc,
                # Chroma cosine distance: 0 = identical, 2 = opposite
                # We flip it so 1.0 = perfect match.
                score=float(1.0 - dist),
            )
        )
    return out
