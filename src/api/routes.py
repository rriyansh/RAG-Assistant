from fastapi import APIRouter, HTTPException, Path, Query

from src.api.schemas import (
    AskRequest,
    AskResponse,
    EnhanceRequest,
    EnhanceResponse,
    HealthResponse,
    KeyDetectRequest,
    KeyDetectResponse,
    KeyListResponse,
    KeySetRequest,
    KeyTestRequest,
    KeyTestResponse,
    ParamsResponse,
    SourceItem,
    ThinkingResponse,
)
from src.generation.answer_parser import collect_sources
from src.generation.generator import generate_answer
from src.generation.prompt_enhancer import enhance_prompt
from src.llm.factory import create_llm, test_provider
from src.llm.thinking_messages import generate_with_llm, random_messages
from src.retrieval.hybrid_retriever import hybrid_retrieve
from src.utils.config import get_settings
from src.utils.key_detect import detect_provider
from src.utils.key_store import clear_key, list_keys, set_key
from src.utils.logger import setup_logger

router = APIRouter()
logger = setup_logger(__name__)

PROVIDER_PATTERN = r"^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$"


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse()


@router.get("/config")
def config_info() -> dict:
    s = get_settings()
    return {
        "llm_provider": s.llm_provider,
        "embedding_provider": s.embedding_provider,
        "web_search_provider": s.web_search_provider,
        "web_search_enabled": s.web_search_enabled,
    }


@router.get("/config/params", response_model=ParamsResponse)
def config_params() -> ParamsResponse:
    s = get_settings()
    provider = (s.embedding_provider or "").strip().lower()
    embed_model = (
        s.embedding_model_openai
        if provider == "openai"
        else s.embedding_model_ollama
    )
    return ParamsResponse(
        llm_provider=s.llm_provider,
        embedding_provider=s.embedding_provider,
        embedding_model=embed_model,
        chunk_size=s.chunk_size,
        chunk_overlap=s.chunk_overlap,
        top_k=s.top_k,
        web_search_provider=s.web_search_provider,
        web_search_enabled=s.web_search_enabled,
        web_fallback_threshold=s.web_fallback_threshold,
    )


@router.post("/ask", response_model=AskResponse)
def ask(req: AskRequest) -> AskResponse:
    question = (req.question or "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    s = get_settings()
    try:
        chunks, used_web = hybrid_retrieve(question)
        answer = generate_answer(question, chunks, req.assistant_name)
        sources = [SourceItem(**x) for x in collect_sources(chunks)]
        return AskResponse(
            answer=answer,
            sources=sources,
            used_web_search=bool(used_web),
            llm_provider=s.llm_provider,
        )
    except ValueError as exc:
        logger.warning("ask validation/configuration error: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("ask failed")
        raise HTTPException(
            status_code=500,
            detail=str(exc) or "Failed to generate answer.",
        ) from exc


@router.get("/keys", response_model=KeyListResponse)
def keys_list() -> KeyListResponse:
    s = get_settings()
    try:
        return KeyListResponse(keys=list_keys(), active_provider=s.llm_provider)
    except Exception as exc:
        logger.exception("keys_list failed")
        raise HTTPException(
            status_code=500,
            detail="Failed to read configured API keys.",
        ) from exc


@router.post("/keys/detect", response_model=KeyDetectResponse)
def keys_detect(req: KeyDetectRequest) -> KeyDetectResponse:
    raw_key = (req.api_key or "").strip()
    if not raw_key:
        return KeyDetectResponse(provider="unknown", hint="")
    provider, hint = detect_provider(raw_key)
    return KeyDetectResponse(provider=provider, hint=hint)


@router.post("/keys/test", response_model=KeyTestResponse)
def keys_test(req: KeyTestRequest) -> KeyTestResponse:
    try:
        result = test_provider(
            req.provider.strip(),
            req.api_key.strip(),
            req.model.strip() if req.model else req.model,
            req.base_url.strip() if req.base_url else req.base_url,
        )
        return KeyTestResponse(
            ok=bool(result.get("ok", False)),
            reply=str(result.get("reply", "")),
            error=str(result.get("error", "")),
        )
    except Exception as exc:
        logger.warning("keys_test failed for provider=%s: %s", req.provider, exc)
        return KeyTestResponse(
            ok=False,
            reply="",
            error=str(exc) or "Provider connection test failed.",
        )


@router.post("/keys/set")
def keys_set(req: KeySetRequest) -> dict:
    try:
        set_key(
            req.provider.strip(),
            req.api_key.strip(),
            req.model.strip() if req.model else req.model,
            req.base_url.strip() if req.base_url else req.base_url,
        )
        return {"ok": True}
    except Exception as exc:
        logger.warning("keys_set failed for provider=%s: %s", req.provider, exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/keys/{provider}")
def keys_delete(
    provider: str = Path(..., pattern=PROVIDER_PATTERN, description="Provider identifier"),
) -> dict:
    try:
        clear_key(provider.strip())
        return {"ok": True}
    except Exception as exc:
        logger.exception("keys_delete failed for provider=%s", provider)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to remove key for '{provider}'.",
        ) from exc


@router.get("/thinking/messages", response_model=ThinkingResponse)
def thinking_messages(
    count: int = Query(default=20, ge=1, le=1000, description="Number of status messages"),
) -> ThinkingResponse:
    return ThinkingResponse(
        messages=random_messages(count),
        generated_by="template",
    )


@router.post("/thinking/generate", response_model=ThinkingResponse)
def thinking_generate(
    count: int = Query(default=20, ge=1, le=1000, description="Number of status messages"),
) -> ThinkingResponse:
    try:
        llm = create_llm()
        return ThinkingResponse(
            messages=generate_with_llm(llm, min(count, 50)),
            generated_by="llm",
        )
    except Exception as exc:
        logger.warning("LLM generation failed: %s", exc)
        return ThinkingResponse(
            messages=random_messages(count),
            generated_by="template",
        )


@router.post("/prompt/enhance", response_model=EnhanceResponse)
def prompt_enhance(req: EnhanceRequest) -> EnhanceResponse:
    original = (req.prompt or "").strip()
    if not original:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty.")

    try:
        enhanced = enhance_prompt(original)
        return EnhanceResponse(original=req.prompt, enhanced=enhanced)
    except ValueError as exc:
        logger.warning("prompt_enhance validation error: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("prompt_enhance failed")
        raise HTTPException(
            status_code=500,
            detail=str(exc) or "Failed to enhance prompt.",
        ) from exc
