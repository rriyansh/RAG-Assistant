from pydantic import BaseModel, Field


class AskRequest(BaseModel):
    question: str = Field(..., min_length=1)
    assistant_name: str = "RAG Assistant"


class SourceItem(BaseModel):
    doc_name: str
    page_number: int
    source_type: str
    score: float


class AskResponse(BaseModel):
    answer: str
    sources: list[SourceItem]
    used_web_search: bool = False
    llm_provider: str


class HealthResponse(BaseModel):
    status: str = "ok"


class KeySetRequest(BaseModel):
    provider: str
    api_key: str = ""
    model: str = ""
    base_url: str = ""


class KeyTestRequest(BaseModel):
    provider: str
    api_key: str = ""
    model: str = ""
    base_url: str = ""


class KeyTestResponse(BaseModel):
    ok: bool
    reply: str = ""
    error: str = ""


class KeyListResponse(BaseModel):
    keys: dict[str, dict]
    active_provider: str


class KeyDetectRequest(BaseModel):
    api_key: str = ""


class KeyDetectResponse(BaseModel):
    provider: str
    hint: str = ""


class ThinkingResponse(BaseModel):
    messages: list[str]
    generated_by: str


class EnhanceRequest(BaseModel):
    prompt: str = Field(..., min_length=1)


class EnhanceResponse(BaseModel):
    original: str
    enhanced: str


class ParamsResponse(BaseModel):
    llm_provider: str
    embedding_provider: str
    embedding_model: str
    chunk_size: int
    chunk_overlap: int
    top_k: int
    web_search_provider: str
    web_search_enabled: bool
    web_fallback_threshold: float
