"""FastAPI application for SecureDoc AI."""

import asyncio
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, field_validator, model_validator

from src.agent.router import Router, RouterSettings
from src.embeddings.embedder import Embedder, EmbedderSettings
from src.embeddings.vector_store import VectorStore, VectorStoreSettings
from src.generation.llm_client import LLMClient, LLMSettings
from src.generation.prompt_builder import build_rag_prompt
from src.ingestion.chunker import chunk_pages
from src.ingestion.cleaner import clean_pages
from src.ingestion.pdf_loader import load_pdfs_from_directory
from src.retrieval.reranker import Reranker
from src.retrieval.retriever import Retriever

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Restrict PDF ingestion to a controlled base directory to prevent path traversal
ALLOWED_DATA_DIR = Path(os.getenv("ALLOWED_DATA_DIR", "./data")).resolve()

# Global components (initialized at startup)
embedder: Optional[Embedder] = None
vector_store: Optional[VectorStore] = None
retriever: Optional[Retriever] = None
reranker: Optional[Reranker] = None
router: Optional[Router] = None
llm_client: Optional[LLMClient] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize components on startup and clean up on shutdown."""
    global embedder, vector_store, retriever, reranker, router, llm_client

    logger.info("Initializing SecureDoc AI components...")
    ALLOWED_DATA_DIR.mkdir(parents=True, exist_ok=True)

    embedder_settings = EmbedderSettings()
    vector_store_settings = VectorStoreSettings()
    llm_settings = LLMSettings()
    router_settings = RouterSettings()

    embedder = Embedder(embedder_settings)
    vector_store = VectorStore(vector_store_settings)
    retriever = Retriever(embedder, vector_store)
    reranker = Reranker()
    router = Router(router_settings)
    llm_client = LLMClient(llm_settings)

    app.state.embedder = embedder
    app.state.vector_store = vector_store
    app.state.retriever = retriever
    app.state.reranker = reranker
    app.state.router = router
    app.state.llm_client = llm_client

    logger.info("All components initialized")
    try:
        yield
    finally:
        logger.info("Shutting down SecureDoc AI...")


app = FastAPI(
    title="SecureDoc AI",
    description="RAG-based document QA system",
    version="1.0.0",
    lifespan=lifespan,
)


class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=16_000, description="User question")
    top_k: int = Field(default=8, ge=1, le=50, description="Maximum chunks to pass to generation")
    use_reranker: bool = True
    use_web_search: bool = True

    @field_validator("query")
    @classmethod
    def validate_query_not_blank(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Query cannot be empty or whitespace")
        return trimmed


class QueryResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]]
    web_search_used: bool
    web_results: List[Dict[str, Any]] = Field(default_factory=list)


class IngestRequest(BaseModel):
    pdf_dir: str = Field(default="./data/pdfs", min_length=1)
    chunk_size: int = Field(default=400, ge=64, le=8192)
    chunk_overlap: int = Field(default=50, ge=0, le=4096)

    @model_validator(mode="after")
    def validate_chunk_bounds(self) -> "IngestRequest":
        if self.chunk_overlap >= self.chunk_size:
            raise ValueError("chunk_overlap must be strictly less than chunk_size")
        return self


class IngestResponse(BaseModel):
    chunks_processed: int
    status: str


class HealthResponse(BaseModel):
    status: str
    vector_store_stats: Dict[str, Any]


def _resolve_safe_pdf_dir(raw_dir: str) -> Path:
    """Resolve user-supplied path and ensure it stays within ALLOWED_DATA_DIR."""
    candidate = Path(raw_dir).expanduser().resolve()
    if candidate != ALLOWED_DATA_DIR and not candidate.is_relative_to(ALLOWED_DATA_DIR):
        raise HTTPException(
            status_code=403,
            detail=f"Access denied: pdf_dir must reside within {ALLOWED_DATA_DIR}",
        )
    return candidate


@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Health check endpoint."""
    if not vector_store:
        return HealthResponse(status="initializing", vector_store_stats={})

    try:
        stats = await asyncio.to_thread(vector_store.get_collection_stats)
        return HealthResponse(status="healthy", vector_store_stats=stats or {})
    except Exception as exc:
        logger.exception("Health check failed while inspecting vector store")
        return HealthResponse(
            status="degraded",
            vector_store_stats={"error": str(exc)},
        )


@app.post("/ingest", response_model=IngestResponse)
async def ingest_documents(request: IngestRequest) -> IngestResponse:
    """Ingest PDF documents into the vector store."""
    if not embedder or not vector_store:
        raise HTTPException(status_code=503, detail="Components not initialized")

    pdf_dir = _resolve_safe_pdf_dir(request.pdf_dir)

    if not pdf_dir.exists() or not pdf_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Directory not found: {pdf_dir}")

    try:
        # Load and process PDFs off the main event loop
        pages = await asyncio.to_thread(load_pdfs_from_directory, pdf_dir)
        if not pages:
            return IngestResponse(chunks_processed=0, status="No PDFs found")

        cleaned_pages = await asyncio.to_thread(clean_pages, pages)
        chunks = await asyncio.to_thread(
            chunk_pages,
            cleaned_pages,
            request.chunk_size,
            request.chunk_overlap,
        )

        if not chunks:
            return IngestResponse(chunks_processed=0, status="No extractable text found")

        # Generate embeddings and persist in vector DB
        texts = [c["text"] for c in chunks]
        embeddings = await asyncio.to_thread(embedder.embed_texts, texts)
        await asyncio.to_thread(vector_store.add_chunks, chunks, embeddings)

        return IngestResponse(chunks_processed=len(chunks), status="success")
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Document ingestion failed for %s", pdf_dir)
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {exc}") from exc


@app.post("/query", response_model=QueryResponse)
async def query_documents(request: QueryRequest) -> QueryResponse:
    """Query the RAG system."""
    if not all([retriever, reranker, router, llm_client]):
        raise HTTPException(status_code=503, detail="Components not initialized")

    assert retriever is not None
    assert reranker is not None
    assert router is not None
    assert llm_client is not None

    try:
        # Retrieve candidate chunks from vector store
        vector_results = await asyncio.to_thread(retriever.retrieve, request.query)

        # Rerank or enforce top_k cutoff
        if vector_results:
            if request.use_reranker:
                vector_results = await asyncio.to_thread(
                    reranker.rerank,
                    request.query,
                    vector_results,
                    top_k=request.top_k,
                )
            else:
                vector_results = vector_results[: request.top_k]

        # Route through agent only when web search is enabled by the caller
        if request.use_web_search:
            route_result = await asyncio.to_thread(
                router.route,
                request.query,
                vector_results,
            )
        else:
            route_result = {
                "vector_results": vector_results,
                "web_results": [],
                "web_search_performed": False,
            }

        final_chunks = route_result.get("vector_results", vector_results)
        web_results = route_result.get("web_results", [])
        web_search_used = bool(route_result.get("web_search_performed", False))

        # Build prompt and generate answer
        formatted_web = (
            router.web_search.format_results(web_results)
            if web_results and hasattr(router, "web_search")
            else ""
        )
        prompt = build_rag_prompt(
            request.query,
            final_chunks,
            formatted_web,
        )
        answer = await asyncio.to_thread(llm_client.generate, prompt)

        # Format sources
        sources: List[Dict[str, Any]] = []
        for chunk in final_chunks:
            meta = chunk.get("metadata", {}) if isinstance(chunk, dict) else {}
            text = chunk.get("text", "") if isinstance(chunk, dict) else ""
            score = (
                chunk.get("rerank_score", chunk.get("score", 0))
                if isinstance(chunk, dict)
                else 0
            )
            sources.append(
                {
                    "source": meta.get("source", "unknown"),
                    "page": meta.get("page_number", "?"),
                    "score": score,
                    "text_preview": text[:200],
                }
            )

        return QueryResponse(
            answer=answer,
            sources=sources,
            web_search_used=web_search_used,
            web_results=web_results,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Query execution failed")
        raise HTTPException(status_code=500, detail=f"Query failed: {exc}") from exc


@app.get("/")
async def root() -> Dict[str, str]:
    """Root endpoint."""
    return {"message": "SecureDoc AI API", "docs": "/docs"}
