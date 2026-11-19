"""
Provider factory. Runtime settings and saved API keys take precedence over .env.
"""
import json
from pathlib import Path
from typing import Any

from src.llm.provider import LLMProvider
from src.utils.config import get_settings
from src.utils.key_store import get_key, list_keys

CONFIG_PATH = Path("data/config.json")

DEFAULT_MODELS = {
    "groq": "llama-3.3-70b-versatile",
    "gemini": "gemini-2.0-flash",
    "openrouter": "openrouter/free",
    "openai": "gpt-4o-mini",
    "ollama": "llama3.2",
}

DEFAULT_BASE_URLS = {
    "groq": "https://api.groq.com/openai/v1",
    "gemini": "https://generativelanguage.googleapis.com/v1beta/openai/",
    "openrouter": "https://openrouter.ai/api/v1",
    "openai": "https://api.openai.com/v1",
    "ollama": "http://localhost:11434/v1",
}


def _read_runtime_config() -> dict[str, Any]:
    if not CONFIG_PATH.exists():
        return {}
    try:
        config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError("Unable to read data/config.json.") from exc
    if not isinstance(config, dict):
        raise ValueError("data/config.json must contain a JSON object.")
    return config


def _resolve(provider: str) -> dict[str, str]:
    """Merge a saved provider key over its environment fallback."""
    settings = get_settings()
    runtime = get_key(provider)
    if not isinstance(runtime, dict):
        runtime = {}

    env_key_name = "custom_llm_api_key" if provider == "custom" else f"{provider}_api_key"
    env_base_url_name = (
        "custom_llm_base_url" if provider == "custom" else f"{provider}_base_url"
    )
    env_model_name = (
        "custom_llm_model" if provider == "custom" else f"{provider}_model"
    )

    return {
        "api_key": runtime.get("api_key") or getattr(settings, env_key_name, ""),
        "model": runtime.get("model") or getattr(settings, env_model_name, ""),
        "base_url": runtime.get("base_url") or getattr(settings, env_base_url_name, ""),
    }


def get_llm_config() -> dict[str, Any]:
    """Return the effective non-secret LLM configuration."""
    settings = get_settings()
    runtime = _read_runtime_config()
    requested_provider = str(runtime.get("provider") or settings.llm_provider).lower().strip()
    provider = requested_provider
    provider_config = _resolve(provider)

    if not runtime.get("provider") and provider != "ollama" and not provider_config["api_key"]:
        for candidate in list_keys():
            if candidate == "ollama":
                continue
            candidate_config = _resolve(candidate)
            if candidate_config["api_key"]:
                provider = candidate
                provider_config = candidate_config
                break

    model = (
        runtime.get("model")
        or provider_config["model"]
        or DEFAULT_MODELS.get(provider)
        or ""
    )
    base_url = (
        runtime.get("base_url")
        or provider_config["base_url"]
        or DEFAULT_BASE_URLS.get(provider)
        or ""
    )

    return {
        "provider": provider,
        "model": model,
        "base_url": base_url,
        "temperature": float(runtime.get("temperature", 0.3)),
        "max_tokens": int(runtime.get("max_tokens", 1024)),
        "top_p": float(runtime.get("top_p", 0.9)),
    }


def create_llm() -> LLMProvider:
    config = get_llm_config()
    provider = config["provider"]
    provider_config = _resolve(provider)
    api_key = provider_config["api_key"]

    if provider != "ollama" and not api_key:
        raise ValueError(
            f"No API key is configured for {provider}. Add a provider key in Settings."
        )
    if provider == "custom" and not config["base_url"]:
        raise ValueError("A base URL is required for the custom provider.")

    return LLMProvider(
        base_url=config["base_url"],
        api_key=api_key or "ollama",
        model=config["model"],
        temperature=config["temperature"],
        max_tokens=config["max_tokens"],
        top_p=config["top_p"],
    )


def test_provider(
    provider: str, api_key: str, model: str = "", base_url: str = ""
) -> dict[str, Any]:
    """Try a tiny call against a provider without saving its key."""
    name = provider.lower().strip()
    resolved_base_url = base_url or DEFAULT_BASE_URLS.get(name, "")
    resolved_model = model or DEFAULT_MODELS.get(name, "")
    if name == "custom" and (not resolved_base_url or not resolved_model):
        return {"ok": False, "error": "Custom providers require a model and base URL."}
    if name not in DEFAULT_BASE_URLS and name != "custom":
        return {"ok": False, "error": f"Unknown provider '{provider}'."}

    try:
        probe = LLMProvider(
            base_url=resolved_base_url,
            api_key=api_key,
            model=resolved_model,
            max_tokens=8,
            timeout=15.0,
        )
        reply = probe.generate(
            "Reply with the single word: ok",
            temperature=0,
        )
        return {"ok": True, "reply": reply.strip()[:80], "model": resolved_model}
    except Exception as exc:
        return {"ok": False, "error": str(exc)[:300], "model": resolved_model}
