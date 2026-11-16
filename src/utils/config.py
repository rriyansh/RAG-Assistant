"""
All settings live here. This file reads .env and exposes
one `get_settings()` function that every other file uses.
"""
from functools import lru_cache
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
    chunk_size: int = 400
    chunk_overlap: int = 50
    top_k: int = 8

    # --- Web search ---
    web_search_provider: str = "duckduckgo"     # "duckduckgo" or "tavily"
    tavily_api_key: str = ""
    web_search_enabled: bool = True
    web_search_max_results: int = 4
    web_fallback_threshold: float = 0.40

    # --- Logging ---
    log_level: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()
