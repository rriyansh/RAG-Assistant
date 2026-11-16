from fastapi import APIRouter, HTTPException

from src.api.schemas import (
    AskRequest, AskResponse, SourceItem, HealthResponse,
)
from src.retrieval.hybrid_retriever import hybrid_retrieve
from src.generation.generator import generate_answer
from src.generation.answer_parser import collect_sources
from src.agent.router import should_mention_web
from src.utils.config import get_settings
from src.utils.logger import setup_logger

router = APIRouter()
logger = setup_logger(__name__)


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse()


@router.get("/config")
def config_info() -> dict:
    """Handy for the frontend: tells you which LLM is answering."""
    settings = get_settings()
    return {
        "llm_provider": settings.llm_provider,
        "embedding_provider": settings.embedding_provider,
        "web_search_provider": settings.web_search_provider,
        "web_search_enabled": settings.web_search_enabled,
    }


@router.post("/ask", response_model=AskResponse)
def ask(req: AskRequest) -> AskResponse:
    try:
        # 1. Find the best chunks from local + web
        chunks, used_web = hybrid_retrieve(req.question)

        # 2. Generate the answer using the configured LLM
        answer = generate_answer(req.question, chunks)

        # 3. Package sources for the frontend
        sources = [SourceItem(**s) for s in collect_sources(chunks)]
        settings = get_settings()

        return AskResponse(
            answer=answer,
            sources=sources,
            used_web_search=used_web or should_mention_web(chunks),
            llm_provider=settings.llm_provider,
        )
    except Exception as exc:
        logger.exception("ask failed")
        raise HTTPException(status_code=500, detail=str(exc))
