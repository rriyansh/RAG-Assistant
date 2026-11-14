"""FastAPI application for SecureDoc AI."""

import logging
from contextlib import asynccontextmanager
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from src.ingestion.pdf_loader import load_pdfs_from_directory
from src.ingestion.cleaner import clean_pages
from src.ingestion.chunker import chunk_pages
from src.embeddings.embedder import Embedder, EmbedderSettings
from src.embeddings.vector_store import VectorStore, VectorStoreSettings
from src.retrieval.retriever import Retriever
from src.retrieval.reranker import Reranker
from src.agent.router import Router, RouterSettings
from src.generation.prompt_builder import build_rag_prompt
from src.generation.llm_client import LLMClient, LLMSettings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global components (initialized at startup)
embedder: Optional[Embedder] = None
vector_store: Optional[VectorStore] = None
retriever: Optional[Retriever] = None
reranker: Optional[Reranker] = None
router: Optional[Router] = None
llm_client: Optional[LLMClient] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize components on startup."""
    global embedder, vector_store, retriever, reranker, router, llm_client

    logger.info("Initializing components...")
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

    logger.info("All components initialized")
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="SecureDoc AI",
    description="RAG-based document QA system",
    version="1.0.0",
    lifespan=lifespan
)


class QueryRequest(BaseModel):
    query: str
    top_k: int = 8
    use_reranker: bool = True
    use_web_search: bool = True


class QueryResponse(BaseModel):
    answer: str
    sources: List[dict]
    web_search_used: bool
    web_results: List[dict] = []


class IngestRequest(BaseModel):
    pdf_dir: str = "./data/pdfs"
    chunk_size: int = 400
    chunk_overlap: int = 50


class IngestResponse(BaseModel):
    chunks_processed: int
    status: str


class HealthResponse(BaseModel):
    status: str
    vector_store_stats: dict


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    stats = vector_store.get_collection_stats() if vector_store else {}
    return HealthResponse(status="healthy", vector_store_stats=stats)


@app.post("/ingest", response_model=IngestResponse)
async def ingest_documents(request: IngestRequest):
    """Ingest PDF documents into the vector store."""
    if not embedder or not vector_store:
        raise HTTPException(status_code=500, detail="Components not initialized")

    from pathlib import Path
    pdf_dir = Path(request.pdf_dir)

    if not pdf_dir.exists():
        raise HTTPException(status_code=404, detail=f"Directory not found: {pdf_dir}")

    # Load and process PDFs
    pages = load_pdfs_from_directory(pdf_dir)
    if not pages:
        return IngestResponse(chunks_processed=0, status="No PDFs found")

    pages = clean_pages(pages)
    chunks = chunk_pages(pages, request.chunk_size, request.chunk_overlap)

    # Generate embeddings
    texts = [c["text"] for c in chunks]
    embeddings = embedder.embed_texts(texts)

    # Store in vector DB
    vector_store.add_chunks(chunks, embeddings)

    return IngestResponse(chunks_processed=len(chunks), status="success")


@app.post("/query", response_model=QueryResponse)
async def query_documents(request: QueryRequest):
    """Query the RAG system."""
    if not all([retriever, reranker, router, llm_client]):
        raise HTTPException(status_code=500, detail="Components not initialized")

    # Retrieve from vector store
    vector_results = retriever.retrieve(request.query)

    # Rerank if requested
    if request.use_reranker and vector_results:
        vector_results = reranker.rerank(request.query, vector_results, top_k=request.top_k)

    # Route through agent (decide on web search)
    route_result = router.route(request.query, vector_results)

    # Build prompt
    prompt = build_rag_prompt(
        request.query,
        route_result["vector_results"],
        router.web_search.format_results(route_result["web_results"])
    )

    # Generate answer
    answer = llm_client.generate(prompt)

    # Format sources
    sources = []
    for chunk in route_result["vector_results"]:
        meta = chunk.get("metadata", {})
        sources.append({
            "source": meta.get("source", "unknown"),
            "page": meta.get("page_number", "?"),
            "score": chunk.get("rerank_score", chunk.get("score", 0)),
            "text_preview": chunk.get("text", "")[:200]
        })

    return QueryResponse(
        answer=answer,
        sources=sources,
        web_search_used=route_result["web_search_performed"],
        web_results=route_result["web_results"]
    )


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "SecureDoc AI API", "docs": "/docs"}