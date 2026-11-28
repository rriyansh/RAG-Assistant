from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from src.llm.provider import LLMProvider
from src.utils.config import get_settings

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
    "ollama": "http://localhost:11434/v1",
}

PROVIDER_DEFAULT_MODELS: dict[str, str] = {
    "nvidia": "meta/llama-3.1-70b-instruct",
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
    cfg = _read_json(CONFIG_PATH)
    keys = _read_json(KEYS_PATH)

    provider = str(cfg.get("provider") or os.getenv("LLM_PROVIDER") or "nvidia").lower()
    saved_entry = keys.get(provider, {})
    user_key = ""
    if isinstance(saved_entry, dict):
        user_key = str(saved_entry.get("api_key") or "").strip()
    elif isinstance(saved_entry, str):
        user_key = saved_entry.strip()

    if not user_key:
        user_key = os.getenv(f"{provider.upper()}_API_KEY", "").strip()

    if not user_key and provider != "ollama":
        builtin_nv = get_builtin_nvidia_key()
        if builtin_nv:
            provider = "nvidia"
            user_key = builtin_nv

    base_url = (
        str(cfg.get("base_url") or "").strip()
        or (saved_entry.get("base_url") if isinstance(saved_entry, dict) else "")
        or PROVIDER_BASE_URLS.get(provider, "https://integrate.api.nvidia.com/v1")
    )
    model = (
        str(cfg.get("model") or "").strip()
        or (saved_entry.get("model") if isinstance(saved_entry, dict) else "")
        or PROVIDER_DEFAULT_MODELS.get(provider, "meta/llama-3.1-70b-instruct")
    )

    temperature = float(cfg.get("temperature", 0.3))
    max_tokens = int(cfg.get("max_tokens", get_settings().max_tokens))
    top_p = float(cfg.get("top_p", 0.9))

    return LLMProvider(
        api_key=user_key or "ollama",
        base_url=base_url,
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
        top_p=top_p,
    )
