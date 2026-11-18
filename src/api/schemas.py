from typing import Any, Literal
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, field_validator

PROVIDER_SLUG_RE = r"^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$"


class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=16_000)
    assistant_name: str = Field(default="RAG Assistant", max_length=120)

    @field_validator("question")
    @classmethod
    def validate_question(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("question cannot be empty or whitespace")
        return trimmed

    @field_validator("assistant_name")
    @classmethod
    def normalize_assistant_name(cls, value: str) -> str:
        trimmed = value.strip()
        return trimmed or "RAG Assistant"


class SourceItem(BaseModel):
    doc_name: str
    page_number: int = Field(default=1, ge=0)
    source_type: str
    score: float


class AskResponse(BaseModel):
    answer: str
    sources: list[SourceItem] = Field(default_factory=list)
    used_web_search: bool = False
    llm_provider: str


class HealthResponse(BaseModel):
    status: str = "ok"


class _KeyCredentialBase(BaseModel):
    provider: str = Field(..., min_length=1, max_length=64, pattern=PROVIDER_SLUG_RE)
    api_key: str = Field(default="", max_length=512)
    model: str = Field(default="", max_length=256)
    base_url: str = Field(default="", max_length=512)

    @field_validator("provider", "api_key", "model", "base_url", mode="before")
    @classmethod
    def strip_strings(cls, value: Any) -> Any:
        return value.strip() if isinstance(value, str) else value

    @field_validator("base_url")
    @classmethod
    def validate_base_url(cls, value: str) -> str:
        if not value:
            return ""
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("base_url must be a valid http:// or https:// URL")
        return value


class KeySetRequest(_KeyCredentialBase):
    pass


class KeyTestRequest(_KeyCredentialBase):
    pass


class KeyTestResponse(BaseModel):
    ok: bool
    reply: str = ""
    error: str = ""


class KeyInfo(BaseModel):
    model_config = ConfigDict(extra="allow")

    configured: bool = False
    masked_key: str = ""
    model: str = ""
    base_url: str = ""


class KeyListResponse(BaseModel):
    keys: dict[str, KeyInfo] = Field(default_factory=dict)
    active_provider: str = ""


class KeyDetectRequest(BaseModel):
    api_key: str = Field(default="", max_length=512)

    @field_validator("api_key", mode="before")
    @classmethod
    def strip_api_key(cls, value: Any) -> Any:
        return value.strip() if isinstance(value, str) else value


class KeyDetectResponse(BaseModel):
    provider: str
    hint: str = ""


class ThinkingResponse(BaseModel):
    messages: list[str]
    generated_by: Literal["template", "llm"] | str


class EnhanceRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=16_000)

    @field_validator("prompt")
    @classmethod
    def validate_prompt(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("prompt cannot be empty or whitespace")
        return trimmed


class EnhanceResponse(BaseModel):
    original: str
    enhanced: str


class ParamsResponse(BaseModel):
    llm_provider: str
    embedding_provider: str
    embedding_model: str
    chunk_size: int = Field(..., ge=1)
    chunk_overlap: int = Field(..., ge=0)
    top_k: int = Field(..., ge=1)
    web_search_provider: str
    web_search_enabled: bool
    web_fallback_threshold: float
