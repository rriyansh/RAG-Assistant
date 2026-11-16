from pydantic import BaseModel, Field


class AskRequest(BaseModel):
    question: str = Field(..., min_length=1)


class SourceItem(BaseModel):
    doc_name: str
    page_number: int
    source_type: str          # "pdf" or "web"
    score: float


class AskResponse(BaseModel):
    answer: str
    sources: list[SourceItem]
    used_web_search: bool = False
    llm_provider: str


class HealthResponse(BaseModel):
    status: str = "ok"
