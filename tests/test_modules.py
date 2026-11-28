from src.api.schemas import AskRequest, AskResponse
from src.ingestion.chunker import chunk_text
from src.ingestion.cleaner import clean_text
from src.retrieval.reranker import Reranker

def test_real_api_models():
    request = AskRequest(question="test")
    response = AskResponse(answer="ok")
    assert request.question == "test"
    assert response.answer == "ok"

def test_real_ingestion_modules():
    assert chunk_text("Short text.", chunk_size=100, chunk_overlap=10) == ["Short text."]
    assert clean_text("  Hello   world  ") == "Hello world"

def test_real_reranker_module():
    reranker = Reranker()
    reranker._use_cross_encoder = False
    result = reranker.rerank("apple", [{"text":"apple fruit","score":0.1}], top_k=1)
    assert result[0]["text"] == "apple fruit"
