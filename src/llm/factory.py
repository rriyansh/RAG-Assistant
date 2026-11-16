"""
Turns one string ("groq", "gemini", "ollama"...) into a ready LLMProvider.
This is where every provider's settings live.
"""
from src.llm.provider import LLMProvider
from src.utils.config import get_settings


def create_llm() -> LLMProvider:
    settings = get_settings()
    provider = settings.llm_provider.lower().strip()

    # ---- OpenAI (paid, but rock solid) ----
    if provider == "openai":
        return LLMProvider(
            base_url=None,                       # default OpenAI endpoint
            api_key=settings.openai_api_key,
            model="gpt-4o-mini",                 # cheap + good
        )

    # ---- Groq (FREE, fastest inference) ----
    if provider == "groq":
        return LLMProvider(
            base_url="https://api.groq.com/openai/v1",
            api_key=settings.groq_api_key,
            model="llama-3.3-70b-versatile",
        )

    # ---- Google Gemini (FREE tier, generous) ----
    if provider == "gemini":
        return LLMProvider(
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            api_key=settings.gemini_api_key,
            model="gemini-2.0-flash",
        )

    # ---- OpenRouter (25+ FREE models, one key) ----
    if provider == "openrouter":
        return LLMProvider(
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.openrouter_api_key,
            # ":free" suffix = free model. Swap this name any time.
            model="meta-llama/llama-3.3-70b-instruct:free",
        )

    # ---- Ollama (FREE, runs on your laptop, full privacy) ----
    if provider == "ollama":
        return LLMProvider(
            base_url=settings.ollama_base_url,
            api_key="ollama",                    # any string works
            model=settings.ollama_model,
        )

    # ---- Custom (your own server, any OpenAI-compatible endpoint) ----
    if provider == "custom":
        return LLMProvider(
            base_url=settings.custom_llm_base_url,
            api_key=settings.custom_llm_api_key,
            model=settings.custom_llm_model,
        )

    # ---- Unknown name: fail loudly so the user notices ----
    raise ValueError(
        f"Unknown LLM_PROVIDER '{provider}'. "
        f"Use one of: openai, groq, gemini, openrouter, ollama, custom."
    )
