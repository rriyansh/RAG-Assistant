from pydantic import BaseModel, Field


class AskRequest(BaseModel):
    question: str = Field(..., min_length=1)


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


# ---- Key management ----
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


# ---- Thinking messages ----
class ThinkingResponse(BaseModel):
    messages: list[str]
    generated_by: str        # "template" or "llm"
