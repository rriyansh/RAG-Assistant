# ---- Key detection ----
class KeyDetectRequest(BaseModel):
    api_key: str = ""


class KeyDetectResponse(BaseModel):
    provider: str
    hint: str = ""


# ---- Prompt enhancement ----
class EnhanceRequest(BaseModel):
    prompt: str = Field(..., min_length=1)


class EnhanceResponse(BaseModel):
    original: str
    enhanced: str


# ---- Config params ----
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
