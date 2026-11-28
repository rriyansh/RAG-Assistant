# src/api/schemas.py
from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field


class ToolCallSchema(BaseModel):
    id: str = ""
    name: str
    args: dict[str, Any] = Field(default_factory=dict)
    result_summary: str = ""
    status: Literal["pending", "ok", "error"] = "ok"
    duration_ms: int = 0
    error: str | None = None


class AskRequest(BaseModel):
    question: str = Field(..., min_length=1)
    assistant_name: str = Field(default="Assistant")
    consent: list[str] = Field(default_factory=list)


class AskResponse(BaseModel):
    answer: str
    sources: list[dict[str, Any]] = Field(default_factory=list)
    source_type: str = "hybrid"
    tool_calls: list[ToolCallSchema] = Field(default_factory=list)
    pending_consent: list[str] = Field(default_factory=list)


class PluginInfoSchema(BaseModel):
    name: str
    description: str
    requires_consent: bool
    source: Literal["internal", "connector", "mcp"]
    enabled: bool = True
    server_id: str | None = None


class PluginsListResponse(BaseModel):
    plugins: list[PluginInfoSchema]


class PluginEnableRequest(BaseModel):
    name: str
    enabled: bool


class PluginEnableResponse(BaseModel):
    name: str
    enabled: bool
    status: str = "ok"


class ConnectorFieldSchema(BaseModel):
    key: str
    label: str
    type: str
    placeholder: str
    required: bool = True
    helper_text: str = ""


class ConnectorInfoSchema(BaseModel):
    id: str
    name: str
    category: str
    description: str
    auth_type: str
    built_in: bool = False
    connected: bool = False
    enabled: bool = False
    status: str = "disconnected"
    account_label: str = ""
    tool_count: int = 0
    tools: list[str] = Field(default_factory=list)
    fields: list[ConnectorFieldSchema] = Field(default_factory=list)


class ConnectorsListResponse(BaseModel):
    connectors: list[ConnectorInfoSchema]


class ConnectorConnectRequest(BaseModel):
    id: str = Field(..., min_length=1)
    credentials: dict[str, Any] = Field(default_factory=dict)


class CustomConnectorCreateRequest(BaseModel):
    id: str = Field(..., min_length=1, pattern=r"^[a-zA-Z0-9_-]+$")
    name: str = Field(..., min_length=1)
    description: str = Field(default="Custom REST Webhook Connector")
    endpoint_url: str = Field(..., min_length=1)
    method: Literal["GET", "POST"] = "POST"
    api_key: str = ""


class ConnectorToggleRequest(BaseModel):
    id: str
    enabled: bool


class KeyDetectRequest(BaseModel):
    api_key: str


class KeyTestRequest(BaseModel):
    provider: str
    api_key: str
    base_url: str | None = None
    model: str | None = None


class KeySetRequest(BaseModel):
    provider: str
    api_key: str
    base_url: str | None = None
    model: str | None = None


class ThinkingGenerateRequest(BaseModel):
    question: str
    assistant_name: str = "Assistant"


class PromptEnhanceRequest(BaseModel):
    prompt: str


class ConfigUpdateRequest(BaseModel):
    provider: str | None = None
    model: str | None = None
    base_url: str | None = None
    temperature: float | None = None
    max_tokens: int | None = None
    top_p: float | None = None


class ConfigParamsUpdateRequest(BaseModel):
    temperature: float | None = None
    max_tokens: int | None = None
    top_p: float | None = None

class GitHubCommitRequest(BaseModel):
    args: dict[str, Any]
