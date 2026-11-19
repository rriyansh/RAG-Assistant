# src/api/routes.py
from __future__ import annotations

import asyncio
import json
import logging
import os
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException

from src.agent.loop import ToolNotSupportedError, run_agent
from src.agent.mcp import MCPValidationError, mcp_manager
from src.agent.registry import registry
from src.api.schemas import (
    AskRequest,
    AskResponse,
    ConfigParamsUpdateRequest,
    ConfigUpdateRequest,
    KeyDetectRequest,
    KeySetRequest,
    KeyTestRequest,
    MCPServerCreateRequest,
    MCPServerSchema,
    MCPServersListResponse,
    PluginEnableRequest,
    PluginEnableResponse,
    PluginInfoSchema,
    PluginsListResponse,
    PromptEnhanceRequest,
    ThinkingGenerateRequest,
    ToolCallSchema,
)
from src.generation.generator import generate_answer
from src.llm.factory import create_llm
from src.retrieval.hybrid_retriever import hybrid_retrieve

logger = logging.getLogger(__name__)
router = APIRouter()

KEYS_PATH = Path("data/keys.json")
CONFIG_PATH = Path("data/config.json")

DEFAULT_THINKING_MESSAGES = [
    "Scanning knowledge base and local documents...",
    "Cross-referencing passages for accuracy...",
    "Synthesizing relevant context...",
    "Formulating a grounded response...",
]


def _read_json_file(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _write_json_file(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    os.chmod(tmp, 0o600)
    tmp.replace(path)
    os.chmod(path, 0o600)


def _detect_provider_from_key(api_key: str) -> str:
    key = api_key.strip()
    if key.startswith("gsk_"):
        return "groq"
    if key.startswith("AIza"):
        return "gemini"
    if key.startswith("sk-or-"):
        return "openrouter"
    if key.startswith("sk-"):
        return "openai"
    return "custom"


def _mask_key(key: str) -> str:
    if len(key) <= 8:
        return "****"
    return f"{key[:4]}...{key[-4:]}"


def _run_legacy_pipeline(question: str, assistant_name: str) -> AskResponse:
    retrieval_out = hybrid_retrieve(question)
    if isinstance(retrieval_out, dict):
        chunks = retrieval_out.get("results", retrieval_out.get("chunks", []))
        source_type = str(retrieval_out.get("source_type", "hybrid"))
    elif isinstance(retrieval_out, tuple) and len(retrieval_out) == 2:
        chunks, source_type = retrieval_out[0], str(retrieval_out[1])
    else:
        chunks = list(retrieval_out) if isinstance(retrieval_out, list) else []
        source_type = "hybrid"

    gen_out = generate_answer(question, chunks, assistant_name=assistant_name)
    if isinstance(gen_out, dict):
        answer = str(gen_out.get("answer", ""))
        sources = list(gen_out.get("sources", chunks))
    else:
        answer = str(gen_out)
        sources = [
            c
            if isinstance(c, dict)
            else {
                "doc_name": getattr(c, "doc_name", "doc"),
                "text": getattr(c, "text", str(c)),
            }
            for c in chunks
        ]

    return AskResponse(
        answer=answer,
        sources=sources,
        source_type=source_type,
        tool_calls=[],
        pending_consent=[],
    )


@router.get("/health")
async def health_check() -> dict[str, Any]:
    return {
        "status": "ok",
        "agent_enabled": os.getenv("AGENT_ENABLED", "true").lower() != "false",
        "registered_tools": len(registry.list_public()),
    }


@router.post("/ask", response_model=AskResponse)
async def ask_endpoint(req: AskRequest) -> AskResponse:
    agent_enabled = os.getenv("AGENT_ENABLED", "true").strip().lower() not in (
        "false",
        "0",
        "no",
        "off",
    )
    active_tools = registry.list_for_llm()

    if not agent_enabled or len(active_tools) == 0:
        return await asyncio.to_thread(
            _run_legacy_pipeline, req.question, req.assistant_name
        )

    try:
        result = await run_agent(
            question=req.question,
            assistant_name=req.assistant_name,
            registry=registry,
            max_turns=12,
            consent=req.consent,
        )
    except ToolNotSupportedError:
        logger.warning("Falling back to legacy direct RAG pipeline for /ask.")
        return await asyncio.to_thread(
            _run_legacy_pipeline, req.question, req.assistant_name
        )

    tool_calls = [ToolCallSchema(**tc) for tc in result.get("tool_calls", [])]
    sources = result.get("sources", [])
    source_types = {s.get("source_type") for s in sources if isinstance(s, dict)}
    if source_types == {"pdf"}:
        source_type = "pdf"
    elif source_types == {"web"}:
        source_type = "web"
    elif source_types:
        source_type = "hybrid"
    else:
        source_type = "agent"

    return AskResponse(
        answer=result.get("answer", ""),
        sources=sources,
        source_type=source_type,
        tool_calls=tool_calls,
        pending_consent=result.get("pending_consent", []),
    )


@router.get("/plugins", response_model=PluginsListResponse)
async def list_plugins() -> PluginsListResponse:
    items = [PluginInfoSchema(**item) for item in registry.list_public()]
    return PluginsListResponse(plugins=items)


@router.post("/plugins/enable", response_model=PluginEnableResponse)
async def enable_plugin(req: PluginEnableRequest) -> PluginEnableResponse:
    updated = registry.set_enabled(req.name, req.enabled)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Plugin '{req.name}' not found.")
    return PluginEnableResponse(name=req.name, enabled=req.enabled, status="ok")


@router.get("/mcp/servers", response_model=MCPServersListResponse)
async def list_mcp_servers() -> MCPServersListResponse:
    servers = [MCPServerSchema(**srv) for srv in mcp_manager.get_servers()]
    return MCPServersListResponse(servers=servers)


@router.post("/mcp/servers", response_model=MCPServerSchema)
async def add_mcp_server(req: MCPServerCreateRequest) -> MCPServerSchema:
    prefix = (req.prefix or f"mcp_{req.id}_").strip()
    try:
        if req.transport == "stdio":
            if not req.command:
                raise MCPValidationError("Field 'command' is required for stdio transport.")
            info = await mcp_manager.add_stdio_server(
                server_id=req.id,
                command=req.command,
                args=req.args or [],
                prefix=prefix,
            )
        else:
            if not req.url:
                raise MCPValidationError("Field 'url' is required for http transport.")
            info = await mcp_manager.add_http_server(
                server_id=req.id,
                url=req.url,
                prefix=prefix,
            )
        return MCPServerSchema(**info)
    except MCPValidationError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err)) from val_err
    except ValueError as collision_err:
        raise HTTPException(status_code=400, detail=str(collision_err)) from collision_err
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to connect MCP server: {exc}") from exc


@router.delete("/mcp/servers/{server_id}")
async def delete_mcp_server(server_id: str) -> dict[str, Any]:
    removed = await mcp_manager.remove_server(server_id)
    if not removed:
        raise HTTPException(status_code=404, detail=f"MCP server '{server_id}' not found.")
    return {"id": server_id, "status": "removed"}


@router.get("/keys")
async def get_keys() -> dict[str, Any]:
    raw = _read_json_file(KEYS_PATH)
    masked: dict[str, Any] = {}
    for provider, info in raw.items():
        if isinstance(info, dict) and info.get("api_key"):
            masked[provider] = {
                "configured": True,
                "masked_key": _mask_key(str(info["api_key"])),
                "model": info.get("model"),
                "base_url": info.get("base_url"),
            }
        elif isinstance(info, str) and info:
            masked[provider] = {"configured": True, "masked_key": _mask_key(info)}
    return {"keys": masked}


@router.post("/keys/detect")
async def detect_key(req: KeyDetectRequest) -> dict[str, str]:
    provider = _detect_provider_from_key(req.api_key)
    return {"provider": provider}


@router.post("/keys/test")
async def test_key(req: KeyTestRequest) -> dict[str, Any]:
    default_urls = {
        "groq": "https://api.groq.com/openai/v1",
        "gemini": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "openrouter": "https://openrouter.ai/api/v1",
        "openai": "https://api.openai.com/v1",
        "ollama": "http://localhost:11434/v1",
    }
    default_models = {
        "groq": "llama-3.3-70b-versatile",
        "gemini": "gemini-2.0-flash",
        "openrouter": "meta-llama/llama-3.1-8b-instruct",
        "openai": "gpt-4o-mini",
        "ollama": "llama3",
    }
    base_url = req.base_url or default_urls.get(req.provider, "https://api.openai.com/v1")
    model = req.model or default_models.get(req.provider, "gpt-4o-mini")
    try:
        from src.llm.provider import LLMProvider

        provider = LLMProvider(
            api_key=req.api_key, base_url=base_url, model=model, max_tokens=8, timeout=15.0
        )
        await asyncio.to_thread(provider.generate, "Reply with OK")
        return {"valid": True, "provider": req.provider, "model": model}
    except Exception as exc:
        return {"valid": False, "provider": req.provider, "error": str(exc)}


@router.post("/keys/set")
async def set_key(req: KeySetRequest) -> dict[str, Any]:
    data = _read_json_file(KEYS_PATH)
    data[req.provider] = {
        "api_key": req.api_key,
        "base_url": req.base_url,
        "model": req.model,
    }
    _write_json_file(KEYS_PATH, data)
    os.environ[f"{req.provider.upper()}_API_KEY"] = req.api_key
    return {"status": "ok", "provider": req.provider, "masked_key": _mask_key(req.api_key)}


@router.delete("/keys/{provider}")
async def delete_key(provider: str) -> dict[str, Any]:
    data = _read_json_file(KEYS_PATH)
    data.pop(provider, None)
    _write_json_file(KEYS_PATH, data)
    os.environ.pop(f"{provider.upper()}_API_KEY", None)
    return {"status": "deleted", "provider": provider}


@router.get("/thinking/messages")
async def get_thinking_messages() -> dict[str, list[str]]:
    return {"messages": DEFAULT_THINKING_MESSAGES}


@router.post("/thinking/generate")
async def generate_thinking_messages(req: ThinkingGenerateRequest) -> dict[str, list[str]]:
    try:
        llm = create_llm()
        prompt = (
            f"Generate 4 short status messages (under 8 words each, one per line) "
            f"that {req.assistant_name} can show while researching: {req.question}"
        )
        raw = await asyncio.to_thread(llm.generate, prompt)
        lines = [line.strip("- *1234567890.") for line in raw.splitlines() if line.strip()]
        return {"messages": lines[:4] if lines else DEFAULT_THINKING_MESSAGES}
    except Exception:
        return {"messages": DEFAULT_THINKING_MESSAGES}


@router.post("/prompt/enhance")
async def enhance_prompt(req: PromptEnhanceRequest) -> dict[str, str]:
    try:
        llm = create_llm()
        instruction = (
            "Rewrite the following user question to be clear, specific, and well-structured "
            "for a RAG assistant. Return ONLY the improved prompt text without quotes:\n\n"
            f"{req.prompt}"
        )
        enhanced = await asyncio.to_thread(llm.generate, instruction)
        return {"enhanced_prompt": enhanced.strip() or req.prompt}
    except Exception:
        return {"enhanced_prompt": req.prompt}


@router.get("/config")
async def get_config() -> dict[str, Any]:
    cfg = _read_json_file(CONFIG_PATH)
    return {
        "provider": cfg.get("provider", os.getenv("LLM_PROVIDER", "groq")),
        "model": cfg.get("model", os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")),
        "base_url": cfg.get("base_url", ""),
        "temperature": float(cfg.get("temperature", 0.3)),
        "max_tokens": int(cfg.get("max_tokens", 1024)),
        "top_p": float(cfg.get("top_p", 0.9)),
    }


@router.post("/config")
async def update_config(req: ConfigUpdateRequest) -> dict[str, Any]:
    cfg = _read_json_file(CONFIG_PATH)
    for k, v in req.model_dump(exclude_none=True).items():
        cfg[k] = v
    _write_json_file(CONFIG_PATH, cfg)
    return {"status": "ok", "config": cfg}


@router.post("/config/params")
async def update_config_params(req: ConfigParamsUpdateRequest) -> dict[str, Any]:
    cfg = _read_json_file(CONFIG_PATH)
    for k, v in req.model_dump(exclude_none=True).items():
        cfg[k] = v
    _write_json_file(CONFIG_PATH, cfg)
    return {"status": "ok", "params": cfg}
