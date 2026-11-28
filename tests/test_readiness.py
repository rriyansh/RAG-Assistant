from unittest.mock import patch
from fastapi.testclient import TestClient
from src.api.main import app

def test_ready_reports_each_dependency():
    provider = type("Provider", (), {"generate": lambda self, *args, **kwargs: "OK"})()
    collection = type("Collection", (), {"count": lambda self: 1})()
    with patch("src.embeddings.vector_store.get_collection", return_value=collection), patch("src.embeddings.embedder.embed_query", return_value=[0.1]), patch("src.api.routes.create_llm", return_value=provider), TestClient(app) as client:
        response = client.get("/health/ready")
    assert response.status_code == 200
    assert set(response.json()["dependencies"]) == {"chroma", "embedding", "provider"}
