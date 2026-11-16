"""
Turns text into vectors so we can search it later.
Supports two providers:
    - openai  (paid, best quality)
    - ollama  (FREE, local, private)
"""
from openai import OpenAI
from src.utils.config import get_settings

# Lazy singletons — we create the client only once.
_embed_client: OpenAI | None = None
_embed_model: str = ""


def _init():
    global _embed_client, _embed_model
    if _embed_client is not None:
        return
    settings = get_settings()

    if settings.embedding_provider == "openai":
        _embed_client = OpenAI(api_key=settings.openai_api_key)
        _embed_model = settings.embedding_model_openai
    elif settings.embedding_provider == "ollama":
        _embed_client = OpenAI(
            base_url=settings.ollama_base_url,
            api_key="ollama",
        )
        _embed_model = settings.embedding_model_ollama
    else:
        raise ValueError(
            f"Unknown EMBEDDING_PROVIDER '{settings.embedding_provider}'. "
            f"Use 'openai' or 'ollama'."
        )


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Convert a list of strings into a list of vectors."""
    _init()
    assert _embed_client is not None
    response = _embed_client.embeddings.create(model=_embed_model, input=texts)
    return [item.embedding for item in response.data]


def embed_query(text: str) -> list[float]:
    """Convert a single search query into a vector."""
    return embed_texts([text])[0]
