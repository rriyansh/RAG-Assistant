from fastapi import APIRouter, HTTPException

from src.api.schemas import (
    AskRequest,
    AskResponse,
    SourceItem,
    HealthResponse,
    KeySetRequest,
    KeyTestRequest,
    KeyTestResponse,
    KeyListResponse,
    KeyDetectRequest,
    KeyDetectResponse,
    ThinkingResponse,
    EnhanceRequest,
    EnhanceResponse,
    ParamsResponse,
)
from src.retrieval.hybrid_retriever import hybrid_retrieve
from src.generation.generator import generate_answer
from src.generation.answer_parser import collect_sources
from src.generation.prompt_enhancer import enhance_prompt
from src.utils.config import get_settings
from src.utils.key_store import set_key, list_keys, clear_key
from src.utils.key_detect import detect_provider
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


@router.get("/config/params", response_model=ParamsResponse)
def config_params() -> ParamsResponse:
    settings = get_settings()
    embed_model = (
        settings.embedding_model_openai
        if settings.embedding_provider == "openai"
        else settings.embedding_model_ollama
    )
    return ParamsResponse(
        llm_provider=settings.llm_provider,
        embedding_provider=settings.embedding_provider,
        embedding_model=embed_model,
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        top_k=settings.top_k,
        web_search_provider=settings.web_search_provider,
        web_search_enabled=settings.web_search_enabled,
        web_fallback_threshold=settings.web_fallback_threshold,
    )


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
# Key management — used by Settings modal
# ============================================================
@router.get("/keys", response_model=KeyListResponse)
def keys_list() -> KeyListResponse:
    settings = get_settings()
    return KeyListResponse(
        keys=list_keys(),
        active_provider=settings.llm_provider,
    )


@router.post("/keys/detect", response_model=KeyDetectResponse)
def keys_detect(req: KeyDetectRequest) -> KeyDetectResponse:
    provider, hint = detect_provider(req.api_key)
    return KeyDetectResponse(provider=provider, hint=hint)


@router.post("/keys/test", response_model=KeyTestResponse)
def keys_test(req: KeyTestRequest) -> KeyTestResponse:
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
# Thinking messages
# ============================================================
@router.get("/thinking/messages", response_model=ThinkingResponse)
def thinking_messages(count: int = 20) -> ThinkingResponse:
    return ThinkingResponse(
        messages=random_messages(min(count, 1000)),
        generated_by="template",
    )


@router.post("/thinking/generate", response_model=ThinkingResponse)
def thinking_generate(count: int = 20) -> ThinkingResponse:
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


# ============================================================
# Prompt enhancement
# ============================================================
@router.post("/prompt/enhance", response_model=EnhanceResponse)
def prompt_enhance(req: EnhanceRequest) -> EnhanceResponse:
    enhanced = enhance_prompt(req.prompt)
    return EnhanceResponse(original=req.prompt, enhanced=enhanced)
