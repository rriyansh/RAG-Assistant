"""
Provider factory. Checks data/keys.json first, falls back to .env.
This lets the frontend set a key without a server restart.
"""
from src.llm.provider import LLMProvider
from src.utils.config import get_settings
from src.utils.key_store import get_key


def _resolve(provider: str) -> dict:
    """Merge runtime key store over .env defaults."""
    settings = get_settings()
    runtime = get_key(provider)

    api_key = runtime.get("api_key") or getattr(
        settings, f"{provider}_api_key", ""
    )
    model = runtime.get("model") or ""
    base_url = runtime.get("base_url") or ""

    return {"api_key": api_key, "model": model, "base_url": base_url}


def create_llm() -> LLMProvider:
    settings = get_settings()
    provider = settings.llm_provider.lower().strip()
    cfg = _resolve(provider)

    if provider == "openai":
        return LLMProvider(
            base_url=cfg["base_url"] or None,
            api_key=cfg["api_key"],
            model=cfg["model"] or "gpt-4o-mini",
        )

    if provider == "groq":
        return LLMProvider(
            base_url="https://api.groq.com/openai/v1",
            api_key=cfg["api_key"],
            model=cfg["model"] or "llama-3.3-70b-versatile",
        )

    if provider == "gemini":
        return LLMProvider(
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            api_key=cfg["api_key"],
            model=cfg["model"] or "gemini-2.0-flash",
        )

    if provider == "openrouter":
        return LLMProvider(
            base_url="https://openrouter.ai/api/v1",
            api_key=cfg["api_key"],
            model=cfg["model"] or "meta-llama/llama-3.3-70b-instruct:free",
        )

    if provider == "ollama":
        return LLMProvider(
            base_url=cfg["base_url"] or settings.ollama_base_url,
            api_key="ollama",
            model=cfg["model"] or settings.ollama_model,
        )

    if provider == "custom":
        return LLMProvider(
            base_url=cfg["base_url"] or settings.custom_llm_base_url,
            api_key=cfg["api_key"],
            model=cfg["model"] or settings.custom_llm_model,
        )

    raise ValueError(
        f"Unknown LLM_PROVIDER '{provider}'. "
        f"Use one of: openai, groq, gemini, openrouter, ollama, custom."
    )


def test_provider(provider: str, api_key: str, model: str = "", base_url: str = "") -> dict:
    """
    Try a tiny call against the given provider WITHOUT saving the key.
    Used by the Settings modal to validate before saving.
    """
    p = provider.lower().strip()

    if p == "openai":
        probe = LLMProvider(base_url=base_url or None, api_key=api_key, model=model or "gpt-4o-mini")
    elif p == "groq":
        probe = LLMProvider(base_url="https://api.groq.com/openai/v1", api_key=api_key, model=model or "llama-3.3-70b-versatile")
    elif p == "gemini":
        probe = LLMProvider(base_url="https://generativelanguage.googleapis.com/v1beta/openai/", api_key=api_key, model=model or "gemini-2.0-flash")
    elif p == "openrouter":
        probe = LLMProvider(base_url="https://openrouter.ai/api/v1", api_key=api_key, model=model or "meta-llama/llama-3.3-70b-instruct:free")
    elif p == "ollama":
        probe = LLMProvider(base_url=base_url or "http://localhost:11434/v1", api_key="ollama", model=model or "llama3.2")
    elif p == "custom":
        probe = LLMProvider(base_url=base_url, api_key=api_key, model=model)
    else:
        return {"ok": False, "error": f"Unknown provider '{provider}'"}

    try:
        reply = probe.generate(
            [{"role": "user", "content": "Reply with the single word: ok"}],
            temperature=0,
        )
        return {"ok": True, "reply": reply.strip()[:80]}
    except Exception as exc:
        return {"ok": False, "error": str(exc)[:300]}
