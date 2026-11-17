from fastapi import APIRouter, HTTPException

from src.api.schemas import (
    AskRequest, AskResponse, SourceItem, HealthResponse,
    KeySetRequest, KeyTestRequest, KeyTestResponse,
    KeyListResponse, ThinkingResponse,
)
from src.retrieval.hybrid_retriever import hybrid_retrieve
from src.generation.generator import generate_answer
from src.generation.answer_parser import collect_sources
from src.utils.config import get_settings
from src.utils.key_store import set_key, list_keys, clear_key, get_key
from src.llm.factory import test_provider, create_llm
from src.llm.thinking_messages import random_messages, generate_with_llm
from src.utils.logger import setup_logger

router = APIRouter()
logger = setup_logger(__name__)


# ============================================================
# Health & config
# ============================================================
@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse()


@router.get("/config")
def config_info() -> dict:
    settings = get_settings()
    return {
        "llm_provider": settings.llm_provider,
        "embedding_provider": settings.embedding_provider,
        "web_search_provider": settings.web_search_provider,
        "web_search_enabled": settings.web_search_enabled,
    }


# ============================================================
# Ask — the main endpoint
# ============================================================
@router.post("/ask", response_model=AskResponse)
def ask(req: AskRequest) -> AskResponse:
    settings = get_settings()
    try:
        chunks, used_web = hybrid_retrieve(req.question)
        answer = generate_answer(req.question, chunks)
        sources = [SourceItem(**s) for s in collect_sources(chunks)]
        return AskResponse(
            answer=answer,
            sources=sources,
            used_web_search=used_web,
            llm_provider=settings.llm_provider,
        )
    except Exception as exc:
        logger.exception("ask failed")
        raise HTTPException(status_code=500, detail=str(exc))


# ============================================================
# Key management — what the frontend Settings modal uses
# ============================================================
@router.get("/keys", response_model=KeyListResponse)
def keys_list() -> KeyListResponse:
    settings = get_settings()
    return KeyListResponse(
        keys=list_keys(),
        active_provider=settings.llm_provider,
    )


@router.post("/keys/test", response_model=KeyTestResponse)
def keys_test(req: KeyTestRequest) -> KeyTestResponse:
    """Try the key WITHOUT saving. Fast fail if it's wrong."""
    result = test_provider(
        provider=req.provider,
        api_key=req.api_key,
        model=req.model,
        base_url=req.base_url,
    )
    return KeyTestResponse(
        ok=result.get("ok", False),
        reply=result.get("reply", ""),
        error=result.get("error", ""),
    )


@router.post("/keys/set")
def keys_set(req: KeySetRequest) -> dict:
    """Save a key. Also optionally test it first? No — caller's job."""
    try:
        set_key(
            provider=req.provider,
            api_key=req.api_key,
            model=req.model,
            base_url=req.base_url,
        )
        return {"ok": True}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/keys/{provider}")
def keys_delete(provider: str) -> dict:
    clear_key(provider)
    return {"ok": True}


# ============================================================
# Thinking messages — 1000 procedurally generated + LLM option
# ============================================================
@router.get("/thinking/messages", response_model=ThinkingResponse)
def thinking_messages(count: int = 20) -> ThinkingResponse:
    """
    Return `count` shuffled messages. Default 20.
    The frontend rotates through them while waiting for /ask.
    """
    return ThinkingResponse(
        messages=random_messages(min(count, 1000)),
        generated_by="template",
    )


@router.post("/thinking/generate", response_model=ThinkingResponse)
def thinking_generate(count: int = 20) -> ThinkingResponse:
    """
    Ask the active LLM to write `count` fresh messages. Cached.
    Falls back to templates if the LLM fails.
    """
    try:
        llm = create_llm()
        messages = generate_with_llm(llm, min(count, 50))
        return ThinkingResponse(messages=messages, generated_by="llm")
    except Exception as exc:
        logger.warning("LLM generation failed, using templates: %s", exc)
        return ThinkingResponse(
            messages=random_messages(min(count, 1000)),
            generated_by="template",
        )
