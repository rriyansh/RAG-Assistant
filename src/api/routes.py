from __future__ import annotations

import asyncio
import json
import os
import tempfile
import logging
import time
import threading
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from src.agent.connectors import ConnectorError, connector_manager
from src.agent.loop import ToolNotSupportedError, run_agent
from src.agent.registry import registry
from src.api.schemas import (
    AskRequest,
    AskResponse,
    ConfigParamsUpdateRequest,
    ConfigUpdateRequest,
    ConnectorConnectRequest,
    ConnectorInfoSchema,
    ConnectorsListResponse,
    ConnectorToggleRequest,
    CustomConnectorCreateRequest,
    KeyDetectRequest,
    KeySetRequest,
    KeyTestRequest,
    PluginEnableRequest,
    PluginInfoSchema,
    PluginsListResponse,
    PromptEnhanceRequest,
    ThinkingGenerateRequest,
    ToolCallSchema,
    GitHubCommitRequest,
)
from src.api.rate_limit import rate_limit
from src.generation.generator import generate_answer
from src.llm.factory import (
    PROVIDER_BASE_URLS,
    PROVIDER_DEFAULT_MODELS,
    create_llm,
    get_builtin_nvidia_key,
)
from src.retrieval.hybrid_retriever import hybrid_retrieve
from src.utils.ttl_cache import TTLCache

router = APIRouter()
logger = logging.getLogger(__name__)
_response_cache: TTLCache[AskResponse] = TTLCache(ttl_seconds=120)
_json_write_lock = threading.Lock()
_idempotency_results: TTLCache[dict[str, Any]] = TTLCache(ttl_seconds=86400)

def _idempotency_key(request: Request) -> str | None:
    return request.headers.get("Idempotency-Key")
KEYS_PATH = Path("data/keys.json")
CONFIG_PATH = Path("data/config.json")


def _read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    with _json_write_lock:
        path.parent.mkdir(parents=True, exist_ok=True)
        descriptor, temporary_name = tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.", suffix=".tmp")
        try:
            os.fchmod(descriptor, 0o600)
            with os.fdopen(descriptor, "w", encoding="utf-8") as temporary_file:
                json.dump(payload, temporary_file, indent=2)
                temporary_file.flush()
                os.fsync(temporary_file.fileno())
            os.replace(temporary_name, path)
        except BaseException:
            try:
                os.close(descriptor)
            except OSError:
                pass
            Path(temporary_name).unlink(missing_ok=True)
            raise
        os.chmod(path, 0o600)


def _detect_provider(api_key: str) -> str:
    k = api_key.strip()
    if k.startswith("nvapi-"):
        return "nvidia"
    if k.startswith("xai-"):
        return "grok"
    if k.startswith("gsk_"):
        return "groq"
    if k.startswith("AIza"):
        return "gemini"
    if k.startswith("sk-or-"):
        return "openrouter"
    if k.startswith("sk-ant-"):
        return "anthropic"
    if k.startswith("sk-ds-") or k.startswith("ds-"):
        return "deepseek"
    if k.startswith("sk-qwen-") or k.startswith("qwen-"):
        return "qwen"
    if k.startswith("sk-"):
        return "openai"
    return "custom"


def _run_legacy(question: str, assistant_name: str) -> AskResponse:
    ret = hybrid_retrieve(question)
    chunks = (
        ret.get("results", ret.get("chunks", []))
        if isinstance(ret, dict)
        else (list(ret) if isinstance(ret, list) else [])
    )
    gen = generate_answer(question, chunks, assistant_name=assistant_name)
    ans = gen.get("answer", "") if isinstance(gen, dict) else str(gen)
    return AskResponse(
        answer=ans,
        sources=chunks if isinstance(chunks, list) else [],
        source_type="hybrid",
    )


@router.get("/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "tools": len(registry.list_public()),
        "free_nvidia_ready": bool(get_builtin_nvidia_key()),
    }


@router.post("/ask", response_model=AskResponse, dependencies=[Depends(rate_limit("ask"))])
async def ask(req: AskRequest) -> AskResponse:
    started = time.perf_counter()
    cache_key = f"{req.assistant_name}:{req.question}"
    if not req.consent:
        cached = _response_cache.get(cache_key)
        if cached is not None:
            return cached
    if (
        os.getenv("AGENT_ENABLED", "true").lower() == "false"
        or not registry.list_for_llm()
    ):
        response = await asyncio.to_thread(_run_legacy, req.question, req.assistant_name)
        logger.info("llm_call tokens=%d latency_ms=%d estimated_cost=%.6f", len(response.answer.split()), int((time.perf_counter()-started)*1000), 0.0)
        _response_cache.set(cache_key, response)
        return response
    try:
        res = await run_agent(
            req.question, req.assistant_name, registry, consent=req.consent
        )
    except ToolNotSupportedError:
        return await asyncio.to_thread(_run_legacy, req.question, req.assistant_name)
    response = AskResponse(
        answer=res.get("answer", ""),
        sources=res.get("sources", []),
        source_type="agent",
        tool_calls=[ToolCallSchema(**tc) for tc in res.get("tool_calls", [])],
        pending_consent=res.get("pending_consent", []),
    )
    logger.info("llm_call tokens=%d latency_ms=%d estimated_cost=%.6f", len(response.answer.split()), int((time.perf_counter()-started)*1000), 0.0)
    if not req.consent and not response.pending_consent:
        _response_cache.set(cache_key, response)
    return response


@router.post("/ask/stream", dependencies=[Depends(rate_limit("ask"))])
async def stream_answer(req: AskRequest, request: Request) -> StreamingResponse:
    async def events():
        try:
            retrieved = await asyncio.to_thread(hybrid_retrieve, req.question)
            chunks = retrieved.get("results", retrieved.get("chunks", [])) if isinstance(retrieved, dict) else list(retrieved or [])
            from src.generation.prompt_builder import build_rag_prompt

            prompt = build_rag_prompt(req.question, chunks)
            llm = create_llm()
            iterator = llm.stream_generate(
                prompt,
                system_prompt=f"You are {req.assistant_name}, an accurate grounded assistant.",
            )
            sentinel = object()
            def next_token():
                return next(iterator, sentinel)
            while True:
                if await request.is_disconnected():
                    close = getattr(iterator, "close", None)
                    if close:
                        close()
                    return
                token = await asyncio.to_thread(next_token)
                if token is sentinel:
                    break
                yield json.dumps({"type": "token", "content": token}) + "\n"
            yield json.dumps({"type": "done", "citations": chunks, "source_type": "hybrid"}, default=str) + "\n"
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            yield json.dumps({"type": "error", "message": str(exc)}) + "\n"

    return StreamingResponse(events(), media_type="application/x-ndjson")


@router.get("/models")
async def models() -> dict[str, Any]:
    def discover() -> list[str]:
        import requests

        cfg = _read_json(CONFIG_PATH)
        provider = str(cfg.get("provider", "nvidia"))
        base_url = str(cfg.get("base_url") or PROVIDER_BASE_URLS.get(provider, "")).rstrip("/")
        keys = _read_json(KEYS_PATH)
        entry = keys.get(provider, {})
        api_key = entry.get("api_key", "") if isinstance(entry, dict) else ""
        response = requests.get(f"{base_url}/models", headers={"Authorization": f"Bearer {api_key}"}, timeout=10)
        response.raise_for_status()
        return [str(item["id"]) for item in response.json().get("data", []) if item.get("id")]

    try:
        return {"models": await asyncio.to_thread(discover)}
    except Exception:
        cfg = _read_json(CONFIG_PATH)
        provider = str(cfg.get("provider", "nvidia"))
        return {"models": [PROVIDER_DEFAULT_MODELS.get(provider, "gpt-4o-mini")]}


@router.get("/connectors", response_model=ConnectorsListResponse, dependencies=[Depends(rate_limit("connectors"))])
async def get_connectors() -> ConnectorsListResponse:
    return ConnectorsListResponse(
        connectors=[
            ConnectorInfoSchema(**c) for c in connector_manager.list_connectors()
        ]
    )


@router.post("/connectors/connect", response_model=ConnectorInfoSchema, dependencies=[Depends(rate_limit("connectors"))])
async def post_connect(req: ConnectorConnectRequest, request: Request) -> ConnectorInfoSchema:
    key = _idempotency_key(request)
    if key and (cached := _idempotency_results.get(f"connect:{key}")):
        return ConnectorInfoSchema(**cached)
    try:
        result = ConnectorInfoSchema(
            **await asyncio.to_thread(
                connector_manager.connect, req.id, req.credentials
            )
        )
        if key:
            _idempotency_results.set(f"connect:{key}", result.model_dump())
        return result
    except ConnectorError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/connectors/custom", response_model=ConnectorInfoSchema, dependencies=[Depends(rate_limit("connectors"))])
async def post_custom(req: CustomConnectorCreateRequest, request: Request) -> ConnectorInfoSchema:
    key = _idempotency_key(request)
    if key and (cached := _idempotency_results.get(f"custom:{key}")):
        return ConnectorInfoSchema(**cached)
    try:
        result = ConnectorInfoSchema(
            **await asyncio.to_thread(
                connector_manager.add_custom_connector,
                req.id,
                req.name,
                req.description,
                req.endpoint_url,
                req.method,
                req.api_key,
            )
        )
        if key:
            _idempotency_results.set(f"custom:{key}", result.model_dump())
        return result
    except ConnectorError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/connectors/toggle", response_model=ConnectorInfoSchema, dependencies=[Depends(rate_limit("connectors"))])
async def post_toggle(req: ConnectorToggleRequest) -> ConnectorInfoSchema:
    try:
        return ConnectorInfoSchema(
            **connector_manager.set_enabled(req.id, req.enabled)
        )
    except ConnectorError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.delete("/connectors/{connector_id}", dependencies=[Depends(rate_limit("connectors"))])
async def del_connector(connector_id: str) -> dict[str, str]:
    connector_manager.disconnect(connector_id)
    return {"id": connector_id, "status": "disconnected"}

@router.post("/github/commit")
async def github_commit(req: GitHubCommitRequest, request: Request) -> dict[str, Any]:
    key = _idempotency_key(request)
    if not key:
        raise HTTPException(status_code=400, detail="Idempotency-Key header is required")
    if cached := _idempotency_results.get(f"github:{key}"):
        return cached
    spec = registry.get("github_commit_file")
    if spec is None or not spec.enabled:
        raise HTTPException(status_code=404, detail="GitHub commit connector is unavailable")
    result = await spec.handler(**req.args) if asyncio.iscoroutinefunction(spec.handler) else await asyncio.to_thread(spec.handler, **req.args)
    payload = result if isinstance(result, dict) else {"result": result}
    _idempotency_results.set(f"github:{key}", payload)
    return payload


@router.get("/plugins", response_model=PluginsListResponse)
async def get_plugins() -> PluginsListResponse:
    return PluginsListResponse(
        plugins=[PluginInfoSchema(**p) for p in registry.list_public()]
    )


@router.post("/plugins/enable")
async def enable_plugin(req: PluginEnableRequest) -> dict[str, Any]:
    registry.set_enabled(req.name, req.enabled)
    return {"name": req.name, "enabled": req.enabled}


@router.get("/keys", dependencies=[Depends(rate_limit("keys"))])
async def get_keys() -> dict[str, Any]:
    raw = _read_json(KEYS_PATH)
    cfg = _read_json(CONFIG_PATH)
    masked = {
        p: {
            "configured": True,
            "masked_key": f"{str(v.get('api_key', ''))[:4]}...{str(v.get('api_key', ''))[-3:]}",
        }
        for p, v in raw.items()
        if isinstance(v, dict) and v.get("api_key")
    }
    if "nvidia" not in masked and get_builtin_nvidia_key():
        masked["nvidia"] = {"configured": True, "masked_key": "Free Built-in Tier"}
    return {"keys": masked, "active_provider": cfg.get("provider", "nvidia")}


@router.post("/keys/detect", dependencies=[Depends(rate_limit("keys"))])
async def detect_key(req: KeyDetectRequest) -> dict[str, str]:
    return {"provider": _detect_provider(req.api_key)}


@router.post("/keys/test", dependencies=[Depends(rate_limit("keys"))])
async def test_key(req: KeyTestRequest) -> dict[str, Any]:
    provider_id = req.provider.lower()
    base_url = req.base_url or PROVIDER_BASE_URLS.get(
        provider_id, "https://api.openai.com/v1"
    )
    model = req.model or PROVIDER_DEFAULT_MODELS.get(provider_id, "gpt-4o-mini")
    try:
        from src.llm.provider import LLMProvider

        p = LLMProvider(
            api_key=req.api_key,
            base_url=base_url,
            model=model,
            max_tokens=8,
            timeout=15.0,
        )
        await asyncio.to_thread(p.generate, "OK")
        return {"valid": True, "provider": provider_id, "model": model}
    except Exception as exc:
        return {"valid": False, "error": str(exc)}


@router.post("/keys/set", dependencies=[Depends(rate_limit("keys"))])
async def set_key(req: KeySetRequest) -> dict[str, Any]:
    data = _read_json(KEYS_PATH)
    data[req.provider.lower()] = {
        "api_key": req.api_key,
        "base_url": req.base_url,
        "model": req.model,
    }
    _write_json(KEYS_PATH, data)
    os.environ[f"{req.provider.upper()}_API_KEY"] = req.api_key
    return {"status": "ok"}


@router.delete("/keys/{provider}", dependencies=[Depends(rate_limit("keys"))])
async def del_key(provider: str) -> dict[str, str]:
    data = _read_json(KEYS_PATH)
    data.pop(provider.lower(), None)
    _write_json(KEYS_PATH, data)
    return {"status": "deleted"}


@router.get("/thinking/messages")
async def thinking_msgs() -> dict[str, list[str]]:
    return {"messages": ["Searching knowledge base...", "Synthesizing context..."]}


@router.post("/thinking/generate")
async def gen_thinking(req: ThinkingGenerateRequest) -> dict[str, list[str]]:
    return {"messages": ["Analyzing query...", "Gathering grounded sources..."]}


@router.post("/prompt/enhance")
async def enhance(req: PromptEnhanceRequest) -> dict[str, str]:
    try:
        llm = create_llm()
        out = await asyncio.to_thread(
            llm.generate, f"Improve this prompt concisely:\n{req.prompt}"
        )
        return {"enhanced_prompt": out or req.prompt}
    except Exception:
        return {"enhanced_prompt": req.prompt}


@router.get("/config")
async def get_cfg() -> dict[str, Any]:
    cfg = _read_json(CONFIG_PATH)
    return {
        "provider": cfg.get("provider", "nvidia"),
        "model": cfg.get("model", "meta/llama-3.1-70b-instruct"),
        "base_url": cfg.get("base_url", ""),
        "temperature": float(cfg.get("temperature", 0.3)),
        "max_tokens": int(cfg.get("max_tokens", 1024)),
        "top_p": float(cfg.get("top_p", 0.9)),
    }


@router.post("/config")
async def set_cfg(req: ConfigUpdateRequest) -> dict[str, Any]:
    cfg = _read_json(CONFIG_PATH)
    cfg.update(req.model_dump(exclude_none=True))
    _write_json(CONFIG_PATH, cfg)
    return {"status": "ok", "config": cfg}


@router.post("/config/params")
async def set_params(req: ConfigParamsUpdateRequest) -> dict[str, Any]:
    cfg = _read_json(CONFIG_PATH)
    cfg.update(req.model_dump(exclude_none=True))
    _write_json(CONFIG_PATH, cfg)
    return {"status": "ok"}
