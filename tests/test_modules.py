"""Tests for SecureDoc AI modules."""

import pytest
from pathlib import Path
import tempfile
import os

# Test fixtures
@pytest.fixture
def sample_text():
    return "This is a test document. It contains multiple sentences. " * 10


@pytest.fixture
def sample_chunks():
    return [
        {
            "chunk_id": 0,
            "text": "This is the first chunk of text.",
            "page_number": 1,
            "source": "test.pdf",
            "chunk_index": 0,
            "total_chunks_in_page": 2
        },
        {
            "chunk_id": 1,
            "text": "This is the second chunk of text.",
            "page_number": 1,
            "source": "test.pdf",
            "chunk_index": 1,
            "total_chunks_in_page": 2
        }
    ]


# Ingestion tests
def test_chunk_text_basic():
    from src.ingestion.chunker import chunk_text
    text = "Hello world. " * 50  # ~100 tokens
    chunks = chunk_text(text, chunk_size=50, chunk_overlap=10)
    assert len(chunks) > 1
    assert all(len(c) > 0 for c in chunks)


def test_chunk_text_small():
    from src.ingestion.chunker import chunk_text
    text = "Short text."
    chunks = chunk_text(text, chunk_size=100, chunk_overlap=10)
    assert len(chunks) == 1
    assert chunks[0] == text


def test_chunk_pages():
    from src.ingestion.chunker import chunk_pages
    pages = [
        {"text": "Page one content. " * 20, "page_number": 1, "source": "test.pdf"},
        {"text": "Page two content. " * 20, "page_number": 2, "source": "test.pdf"}
    ]
    chunks = chunk_pages(pages, chunk_size=50, chunk_overlap=10)
    assert len(chunks) > 0
    for c in chunks:
        assert "chunk_id" in c
        assert "text" in c
        assert "page_number" in c
        assert "source" in c


def test_clean_text():
    from src.ingestion.cleaner import clean_text
    dirty = "  Hello   world  \n\n\n  This  is  a  test  \n\n  "
    clean = clean_text(dirty)
    assert clean == "Hello world This is a test"


def test_clean_pages():
    from src.ingestion.cleaner import clean_pages
    pages = [
        {"text": "  Good text  ", "page_number": 1, "source": "test.pdf"},
        {"text": "   ", "page_number": 2, "source": "test.pdf"},  # Empty
        {"text": "More\n\n\ntext", "page_number": 3, "source": "test.pdf"}
    ]
    cleaned = clean_pages(pages)
    assert len(cleaned) == 2  # Empty page removed
    assert cleaned[0]["text"] == "Good text"


# Embedding tests (mocked)
def test_embedder_settings():
    from src.embeddings.embedder import EmbedderSettings
    settings = EmbedderSettings(openai_api_key="test-key", embedding_model="test-model")
    assert settings.openai_api_key == "test-key"
    assert settings.embedding_model == "test-model"


def test_vector_store_settings():
    from src.embeddings.vector_store import VectorStoreSettings
    settings = VectorStoreSettings(chroma_persist_dir="./test", chroma_collection="test")
    assert settings.chroma_persist_dir == "./test"
    assert settings.chroma_collection == "test"


# Retrieval tests
def test_retriever_init():
    from src.retrieval.retriever import Retriever
    from src.embeddings.embedder import Embedder
    from src.embeddings.vector_store import VectorStore

    # Test with mock settings
    class MockEmbedder:
        def embed_query(self, query):
            return [0.1] * 1536

    class MockVectorStore:
        def search(self, query_embedding, top_k=8, filter_dict=None):
            return [
                {"text": "Result 1", "metadata": {"source": "test.pdf"}, "distance": 0.1},
                {"text": "Result 2", "metadata": {"source": "test.pdf"}, "distance": 0.2}
            ]

    retriever = Retriever(embedder=MockEmbedder(), vector_store=MockVectorStore(), top_k=5)
    results = retriever.retrieve("test query")
    assert len(results) == 2
    assert results[0]["text"] == "Result 1"


def test_reranker_heuristic():
    from src.retrieval.reranker import Reranker
    reranker = Reranker()
    # Disable cross-encoder for test
    reranker._use_cross_encoder = False

    chunks = [
        {"text": "apple banana orange", "score": 0.5},
        {"text": "cat dog mouse", "score": 0.7},
        {"text": "apple fruit banana", "score": 0.3}
    ]
    results = reranker.rerank("apple banana", chunks, top_k=2)
    assert len(results) == 2
    # First result should be about apple/banana
    assert "apple" in results[0]["text"].lower()


# Generation tests
def test_prompt_builder():
    from src.generation.prompt_builder import build_rag_prompt
    chunks = [
        {"text": "Context text", "metadata": {"source": "doc.pdf", "page_number": 1}}
    ]
    prompt = build_rag_prompt("Test question", chunks)
    assert "Test question" in prompt
    assert "Context text" in prompt
    assert "doc.pdf" in prompt


def test_build_citation_prompt():
    from src.generation.prompt_builder import build_citation_prompt
    chunks = [
        {"text": "Context text", "metadata": {"source": "doc.pdf", "page_number": 1}}
    ]
    prompt = build_citation_prompt("Test question", chunks)
    assert "[Doc 1]" in prompt


# Agent tests
def test_router_keywords():
    from src.agent.router import Router
    from src.generation.llm_client import LLMClient
    from src.retrieval.web_search import WebSearch

    class MockLLM:
        def generate(self, prompt, temperature=0):
            return "NO"

    class MockWebSearch:
        enabled = False

    class MockSettings:
        openai_api_key = "test"
        llm_model = "test"
        tavily_api_key = ""

    router = Router(MockSettings())
    router.llm = MockLLM()
    router.web_search = MockWebSearch()

    # Test keyword detection
    assert router.should_search_web("latest news about AI", []) is True
    assert router.should_search_web("current stock price", []) is True
    assert router.should_search_web("history of Rome", [{"score": 0.8}]) is False


# API tests (would need test client)
def test_health_response_model():
    from src.api.main import HealthResponse
    resp = HealthResponse(status="healthy", vector_store_stats={"total_chunks": 100})
    assert resp.status == "healthy"
    assert resp.vector_store_stats["total_chunks"] == 100


def test_query_request_model():
    from src.api.main import QueryRequest
    req = QueryRequest(query="test", top_k=5, use_reranker=False, use_web_search=True)
    assert req.query == "test"
    assert req.top_k == 5
    assert req.use_reranker is False
    assert req.use_web_search is True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])