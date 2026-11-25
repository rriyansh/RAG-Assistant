from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from src.utils.workspace import workspace_path, session_id
from src.llm.provider import LLMProvider, custom_endpoint

KEYS_PATH = Path("data/keys.json")
CONFIG_PATH = Path("data/config.json")

PROVIDER_BASE_URLS: dict[str, str] = {
    "nvidia": "https://integrate.api.nvidia.com/v1",
    "grok": "https://api.x.ai/v1",
    "deepseek": "https://api.deepseek.com/v1",
    "qwen": "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    "groq": "https://api.groq.com/openai/v1",
    "gemini": "https://generativelanguage.googleapis.com/v1beta/openai/",
    "openrouter": "https://openrouter.ai/api/v1",
    "openai": "https://api.openai.com/v1",
    "anthropic": "https://api.anthropic.com/v1/",
    "mistral": "https://api.mistral.ai/v1",
    "ollama": os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/").removesuffix("/v1") + "/v1",
}

PROVIDER_DEFAULT_MODELS: dict[str, str] = {
    "nvidia": "meta/llama-3.3-70b-instruct",
    "grok": "grok-2-latest",
    "deepseek": "deepseek-chat",
    "qwen": "qwen-plus",
    "groq": "llama-3.3-70b-versatile",
    "gemini": "gemini-2.0-flash",
    "openrouter": "openrouter/free",
    "openai": "gpt-4o-mini",
    "anthropic": "claude-3-5-sonnet-latest",
    "mistral": "mistral-large-latest",
    "ollama": "llama3.2",
}

PROVIDER_KEY_ENV: dict[str, tuple[str, ...]] = {
    "grok": ("XAI_API_KEY", "GROK_API_KEY"),
}


def get_environment_api_key(provider: str) -> str:
    names = PROVIDER_KEY_ENV.get(provider, (f"{provider.upper()}_API_KEY",))
    return next((os.getenv(name, "").strip() for name in names if os.getenv(name, "").strip()), "")


def get_default_provider() -> str:
    configured = os.getenv("LLM_PROVIDER", "").strip().lower()
    if configured:
        return configured
    if get_builtin_nvidia_key():
        return "nvidia"
    for provider in ("openai", "groq", "gemini", "openrouter", "grok", "deepseek", "qwen", "anthropic", "mistral"):
        if get_environment_api_key(provider):
            return provider
    return "nvidia"


def _read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def get_builtin_nvidia_key() -> str:
    return (
        os.getenv("NVIDIA_API_KEY")
        or os.getenv("DEFAULT_NVIDIA_API_KEY")
        or os.getenv("FREE_NVIDIA_API_KEY")
        or ""
    ).strip()


def create_llm() -> LLMProvider:
    cfg = _read_json(workspace_path(CONFIG_PATH))
    keys = _read_json(workspace_path(KEYS_PATH))

    # Workspace settings override the service default; environment variables must
    # still apply to fresh device sessions created by the mobile/web clients.
    provider = str(cfg.get("provider") or get_default_provider()).lower()
    saved_entry = keys.get(provider, {})
    user_key = ""
    if isinstance(saved_entry, dict):
        user_key = str(saved_entry.get("api_key") or "").strip()
    elif isinstance(saved_entry, str):
        user_key = saved_entry.strip()

    hosted = provider == "nvidia" and (cfg.get("hosted") or not user_key)
    if hosted:
        user_key = get_builtin_nvidia_key()
        base_url = PROVIDER_BASE_URLS["nvidia"]
        model = cfg.get("model") or os.getenv("NVIDIA_MODEL") or PROVIDER_DEFAULT_MODELS["nvidia"]
    else:
        base_url = PROVIDER_BASE_URLS.get(provider) or cfg.get("base_url") or (saved_entry.get("base_url") if isinstance(saved_entry, dict) else None)
        model = cfg.get("model") or (saved_entry.get("model") if isinstance(saved_entry, dict) else None) or PROVIDER_DEFAULT_MODELS.get(provider)
        if not user_key and provider in PROVIDER_BASE_URLS:
            user_key = get_environment_api_key(provider)
            base_url = PROVIDER_BASE_URLS[provider]
    if not user_key and provider != "ollama":
        raise ValueError(f"No API key configured for {provider}.")
    if not model or not base_url:
        raise ValueError("Configure the provider model and endpoint in Settings.")

    temperature = float(cfg.get("temperature", 0.3))
    max_tokens = int(cfg.get("max_tokens", 4096))
    top_p = float(cfg.get("top_p", 0.9))

    llm = LLMProvider(
        api_key=user_key or "ollama",
        base_url=custom_endpoint(base_url) if provider == "custom" else base_url,
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
        top_p=top_p,
    )
    if provider in {"nvidia", "deepseek", "ollama"}:
        llm.routed = True
        llm.local_base = PROVIDER_BASE_URLS["ollama"]
    return llm
