"""
All settings live here. This file reads .env and exposes
one `get_settings()` function that every other file uses.
"""
from functools import lru_cache
from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- Which LLM answers the question ---
    llm_provider: str = "groq"

    # --- API keys (only one is needed depending on llm_provider) ---
    openai_api_key: str = ""
    groq_api_key: str = ""
    gemini_api_key: str = ""
    openrouter_api_key: str = ""

    # --- Ollama (local, free) ---
    ollama_base_url: str = "http://localhost:11434/v1"
    ollama_model: str = "llama3.2"

    # --- Custom provider ---
    custom_llm_base_url: str = ""
    custom_llm_api_key: str = ""
    custom_llm_model: str = ""

    # --- Embeddings ---
    embedding_provider: str = "ollama"          # "openai" or "ollama"
    embedding_model_openai: str = "text-embedding-3-small"
    embedding_model_ollama: str = "nomic-embed-text"

    # --- Vector store ---
    chroma_persist_dir: str = "./data/chroma"
    chroma_collection: str = "documents"

    # --- Chunking ---
    chunk_size: int = Field(default=400, ge=64, le=4000)
    chunk_overlap: int = Field(default=50, ge=0, le=1000)
    top_k: int = Field(default=8, ge=1, le=50)

    # --- Web search ---
    web_search_enabled: bool = True
    web_search_max_results: int = Field(default=4, ge=1, le=20)
    web_fallback_threshold: float = Field(default=0.40, ge=0.0, le=1.0)

    request_rate_limit: int = Field(default=30, ge=1, le=10000)
    request_rate_window_seconds: int = Field(default=60, ge=1, le=3600)
    eval_min_recall_at_k: float = Field(default=0.50, ge=0.0, le=1.0)
    eval_min_mrr: float = Field(default=0.40, ge=0.0, le=1.0)
    eval_min_faithfulness: float = Field(default=0.50, ge=0.0, le=1.0)

    # --- Logging ---
    log_level: str = "INFO"

    @model_validator(mode="after")
    def validate_runtime(self) -> "Settings":
        if self.chunk_overlap >= self.chunk_size:
            raise ValueError("CHUNK_OVERLAP must be smaller than CHUNK_SIZE")
        providers = {"openai", "groq", "gemini", "openrouter", "ollama", "custom"}
        if self.llm_provider not in providers:
            raise ValueError(f"LLM_PROVIDER must be one of {sorted(providers)}")
        embeddings = {"openai", "ollama"}
        if self.embedding_provider not in embeddings:
            raise ValueError(f"EMBEDDING_PROVIDER must be one of {sorted(embeddings)}")
        if self.llm_provider == "custom" and not (
            self.custom_llm_base_url and self.custom_llm_model
        ):
            raise ValueError("CUSTOM_LLM_BASE_URL and CUSTOM_LLM_MODEL are required")
        return self


def validate_startup_config() -> Settings:
    return get_settings()


@lru_cache
def get_settings() -> Settings:
    return Settings()
