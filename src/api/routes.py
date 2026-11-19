from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException

from src.agent.connectors import ConnectorError, connector_manager
from src.agent.loop import ToolNotSupportedError, run_agent
from src.agent.registry import ToolRegistry
from src.agent import register_internal_plugins
from src.agent.connectors import ConnectorManager
from src.utils.workspace import workspace_path, session_id
from fastapi import Depends
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
)
from src.generation.generator import generate_answer
from src.llm.factory import (
    PROVIDER_BASE_URLS,
    PROVIDER_DEFAULT_MODELS,
    create_llm,
    get_builtin_nvidia_key,
)
from src.retrieval.hybrid_retriever import hybrid_retrieve

router = APIRouter()
KEYS_PATH = Path("data/keys.json")
CONFIG_PATH = Path("data/config.json")


async def active_connectors() -> ConnectorManager:
    if not session_id.get():
        return connector_manager
    reg = ToolRegistry(workspace_path(Path("data/plugins.json")))
    register_internal_plugins(reg)
    manager = ConnectorManager(reg, workspace_path(Path("data/connectors.json")))
    await manager.startup()
    return manager


def _read_json(path: Path) -> dict[str, Any]:
    path = workspace_path(path)
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path = workspace_path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    os.chmod(tmp, 0o600)
    tmp.replace(path)
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
    if k.startswith(("sk-proj-", "sk-svcacct-")):
        return "openai"
    return "custom"


def _run_legacy(question: str, assistant_name: str) -> AskResponse:
    chunks, used_web = hybrid_retrieve(question)
    return AskResponse(
        answer=generate_answer(question, chunks, assistant_name=assistant_name),
        sources=[{**vars(chunk), "page": chunk.page_number} for chunk in chunks],
        source_type="hybrid" if used_web else "pdf",
    )


@router.get("/health")
async def health(manager: ConnectorManager = Depends(active_connectors)) -> dict[str, Any]:
    return {
        "status": "ok",
        "tools": len(manager.registry.list_public()),
        "free_nvidia_ready": bool(get_builtin_nvidia_key()),
    }


@router.post("/ask", response_model=AskResponse)
async def ask(req: AskRequest, manager: ConnectorManager = Depends(active_connectors)) -> AskResponse:
    if (
        os.getenv("AGENT_ENABLED", "true").lower() == "false"
        or not manager.registry.list_for_llm()
    ):
        return await asyncio.to_thread(_run_legacy, req.question, req.assistant_name)
    try:
        res = await run_agent(
            req.question, req.assistant_name, manager.registry, consent=req.consent
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ToolNotSupportedError:
        return await asyncio.to_thread(_run_legacy, req.question, req.assistant_name)
    return AskResponse(
        answer=res.get("answer", ""),
        sources=res.get("sources", []),
        source_type="agent",
        tool_calls=[ToolCallSchema(**tc) for tc in res.get("tool_calls", [])],
        pending_consent=res.get("pending_consent", []),
    )


@router.get("/connectors", response_model=ConnectorsListResponse)
async def get_connectors(manager: ConnectorManager = Depends(active_connectors)) -> ConnectorsListResponse:
    return ConnectorsListResponse(
        connectors=[
            ConnectorInfoSchema(**c) for c in manager.list_connectors()
        ]
    )


@router.post("/connectors/connect", response_model=ConnectorInfoSchema)
async def post_connect(req: ConnectorConnectRequest, manager: ConnectorManager = Depends(active_connectors)) -> ConnectorInfoSchema:
    try:
        return ConnectorInfoSchema(
            **await asyncio.to_thread(
                manager.connect, req.id, req.credentials
            )
        )
    except ConnectorError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/connectors/custom", response_model=ConnectorInfoSchema)
async def post_custom(req: CustomConnectorCreateRequest, manager: ConnectorManager = Depends(active_connectors)) -> ConnectorInfoSchema:
    try:
        return ConnectorInfoSchema(
            **await asyncio.to_thread(
                manager.add_custom_connector,
                req.id,
                req.name,
                req.description,
                req.endpoint_url,
                req.method,
                req.api_key,
            )
        )
    except ConnectorError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/connectors/toggle", response_model=ConnectorInfoSchema)
async def post_toggle(req: ConnectorToggleRequest, manager: ConnectorManager = Depends(active_connectors)) -> ConnectorInfoSchema:
    try:
        return ConnectorInfoSchema(
            **manager.set_enabled(req.id, req.enabled)
        )
    except ConnectorError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.delete("/connectors/{connector_id}")
async def del_connector(connector_id: str, manager: ConnectorManager = Depends(active_connectors)) -> dict[str, str]:
    manager.disconnect(connector_id)
    return {"id": connector_id, "status": "disconnected"}


@router.get("/plugins", response_model=PluginsListResponse)
async def get_plugins(manager: ConnectorManager = Depends(active_connectors)) -> PluginsListResponse:
    return PluginsListResponse(
        plugins=[PluginInfoSchema(**p) for p in manager.registry.list_public()]
    )


@router.post("/plugins/enable")
async def enable_plugin(req: PluginEnableRequest, manager: ConnectorManager = Depends(active_connectors)) -> dict[str, Any]:
    manager.registry.set_enabled(req.name, req.enabled)
    return {"name": req.name, "enabled": req.enabled}


@router.get("/keys")
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
    return {"hosted_ready": bool(get_builtin_nvidia_key()), "keys": masked, "active_provider": cfg.get("provider", "nvidia")}


@router.post("/keys/detect")
async def detect_key(req: KeyDetectRequest) -> dict[str, str]:
    return {"provider": _detect_provider(req.api_key)}


@router.post("/keys/test")
async def test_key(req: KeyTestRequest) -> dict[str, Any]:
    provider_id = req.provider.lower()
    base_url = PROVIDER_BASE_URLS.get(provider_id) or req.base_url
    if not base_url:
        return {"valid": False, "error": "Set the custom endpoint URL in Model settings."}
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


@router.post("/keys/set")
async def set_key(req: KeySetRequest) -> dict[str, Any]:
    data = _read_json(KEYS_PATH)
    data[req.provider.lower()] = {
        "api_key": req.api_key,
        "base_url": req.base_url,
        "model": req.model,
    }
    _write_json(KEYS_PATH, data)
    return {"status": "ok"}


@router.delete("/keys/{provider}")
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
        "hosted": cfg.get("hosted", False),
        "provider": cfg.get("provider", "nvidia"),
        "model": cfg.get("model", "meta/llama-3.3-70b-instruct"),
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
