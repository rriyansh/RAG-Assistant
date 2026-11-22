

# src/llm/provider.py
from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass, field
from typing import Any
from urllib.parse import urlsplit

from openai import APIConnectionError, APIStatusError, OpenAI

logger = logging.getLogger(__name__)


@dataclass
class ToolCallItem:
    id: str
    name: str
    arguments: dict[str, Any]
    raw_arguments: str = "{}"


@dataclass
class ChatResponse:
    content: str
    tool_calls: list[ToolCallItem] = field(default_factory=list)

    def as_message(self) -> dict[str, Any]:
        msg: dict[str, Any] = {
            "role": "assistant",
            "content": self.content if self.content else None,
        }
        if self.tool_calls:
            msg["tool_calls"] = [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.name,
                        "arguments": tc.raw_arguments,
                    },
                }
                for tc in self.tool_calls
            ]
        return msg

    def __getitem__(self, key: str) -> Any:
        if key == "content":
            return self.content
        if key == "tool_calls":
            return [
                {"id": tc.id, "name": tc.name, "arguments": tc.arguments}
                for tc in self.tool_calls
            ]
        raise KeyError(key)

    def get(self, key: str, default: Any = None) -> Any:
        try:
            return self[key]
        except KeyError:
            return default


def custom_endpoint(value: str) -> str:
    endpoint = value.strip().rstrip("/")
    parts = urlsplit(endpoint)
    local = parts.hostname in {"localhost", "127.0.0.1", "::1"}
    if (not parts.hostname or parts.username or parts.password or parts.query or parts.fragment
            or not (parts.scheme == "https" or (local and parts.scheme == "http"))):
        raise ValueError("Enter an HTTPS API base URL, or use HTTP on localhost.")
    return endpoint.removesuffix("/chat/completions")


class ProviderResponseError(RuntimeError):
    """Provider failure with a message safe to display to the caller."""


class LLMProvider:
    """OpenAI-compatible LLM wrapper supporting both standard generation and tool-calling."""

    def __init__(
        self,
        api_key: str,
        base_url: str,
        model: str,
        temperature: float = 0.3,
        max_tokens: int = 1024,
        top_p: float = 0.9,
        timeout: float = 45.0,
    ) -> None:
        self.routed = False
        self.local_base = ""
        self.api_key = api_key
        self.base_url = base_url
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.top_p = top_p
        self.client = OpenAI(
            api_key=api_key or "ollama",
            base_url=base_url,
            timeout=timeout,
        )

    def _request_completion(self, params: dict[str, Any]) -> Any:
        # Adapt only to an explicit parameter rejection before a completion exists.
        params = dict(params)
        for _ in range(4):
            try:
                return self.client.chat.completions.create(**params)
            except APIStatusError as exc:
                detail = exc.body if isinstance(exc.body, dict) else {}
                detail = detail.get("error", detail)
                if exc.status_code != 400 or not isinstance(detail, dict):
                    raise
                name = detail.get("param")
                message = str(detail.get("message", "")).lower()
                if name == "max_tokens" and name in params and "max_completion_tokens" in message:
                    params["max_completion_tokens"] = params.pop(name)
                elif name in ("temperature", "top_p") and name in params and (
                    "unsupported" in message or "not supported" in message or "only the default" in message
                ):
                    params.pop(name)
                else:
                    raise

    def _completion(self, **kwargs: Any) -> Any:
        # Retry only a retired NVIDIA model and only on NVIDIA's own endpoint.
        if self.routed:
            from litellm import completion
            def send(base, key, model):
                payload = dict(kwargs, model="openai/" + model)
                return completion(**payload, api_base=base, api_key=key, timeout=45, num_retries=0, drop_params=True)
            try:
                return send(self.base_url, self.api_key, kwargs["model"])
            except Exception as exc:
                code = getattr(exc, "status_code", None)
                fallback = os.getenv("RESO_OLLAMA_FALLBACK_MODEL")
                if fallback and self.base_url != self.local_base and code in {408, 410, 429, 500, 502, 503, 504}:
                    try:
                        return send(self.local_base, "ollama", fallback)
                    except Exception:
                        raise ProviderResponseError("The selected provider and local fallback are unavailable.") from None
                if code == 400 and kwargs.get("tools") and "tool" in str(exc).lower():
                    raise ProviderResponseError("The model rejected the tool definitions.") from None
                raise ProviderResponseError(f"Model request failed (HTTP {code or 'unavailable'}). Check model access and provider quota.") from None
        selected = kwargs["model"]
        candidates = [selected]
        if self.base_url.rstrip("/") == "https://integrate.api.nvidia.com/v1":
            fallback = "meta/llama-3.3-70b-instruct"
            if selected == fallback:
                fallback = "nvidia/nemotron-3-super-120b-a12b"
            candidates.append(fallback)
        for candidate in candidates:
            try:
                kwargs["model"] = candidate
                response = self._request_completion(kwargs)
            except APIStatusError as exc:
                status = exc.status_code
                if status == 410 and candidate != candidates[-1]:
                    continue
                messages = {
                    401: "The provider rejected this credential. Check the key and provider.",
                    403: "The provider denied access (HTTP 403). Check the endpoint, account access and model permissions.",
                    404: "The provider could not find this model or endpoint.",
                    410: "The provider retired this model or endpoint. Choose an available model in Settings.",
                    429: "The provider rate or quota limit was reached. Check your quota and retry.",
                }
                message = messages.get(status, f"The provider returned HTTP {status}.")
                if status == 400 and kwargs.get("tools") and "tool" in str(exc).lower():
                    message = "The model rejected the tool_choice or tool definitions."
                raise ProviderResponseError(message) from None
            except APIConnectionError:
                raise ProviderResponseError("Could not reach the model provider. Check connectivity and retry.") from None
            except Exception:
                raise ProviderResponseError("The provider returned an unreadable response.") from None
            if not getattr(response, "choices", None) or not getattr(response.choices[0], "message", None):
                raise ProviderResponseError("The provider returned no completion. Check the model and retry.")
            self.model = candidate
            return response
        raise ProviderResponseError("No available model returned a completion.")

    def generate(
        self,
        prompt: str | list[dict[str, Any]],
        system_prompt: str = "You are a helpful AI assistant.",
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> str:
        messages = prompt if isinstance(prompt, list) else [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ]
        response = self._completion(
            model=self.model,
            messages=messages,  # type: ignore[arg-type]
            temperature=temperature if temperature is not None else self.temperature,
            max_tokens=max_tokens if max_tokens is not None else self.max_tokens,
            top_p=self.top_p,
        )
        content = response.choices[0].message.content
        if not isinstance(content, str) or not content.strip():
            raise ProviderResponseError("The model returned no answer text. Check its output token limit.")
        return content.strip()

    def chat(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        require_tool: bool = False,
    ) -> ChatResponse:
        kwargs: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature if temperature is not None else self.temperature,
            "max_tokens": max_tokens if max_tokens is not None else self.max_tokens,
            "top_p": self.top_p,
        }
        if tools:
            kwargs["tools"] = tools
            kwargs["tool_choice"] = "required" if require_tool else "auto"

        response = self._completion(**kwargs)
        msg = response.choices[0].message
        content = (msg.content or "").strip()

        parsed_calls: list[ToolCallItem] = []
        raw_tool_calls = getattr(msg, "tool_calls", None)
        if raw_tool_calls:
            for tc in raw_tool_calls:
                raw_args = tc.function.arguments or "{}"
                try:
                    loaded = json.loads(raw_args)
                    args_dict = loaded if isinstance(loaded, dict) else {"value": loaded}
                except json.JSONDecodeError:
                    args_dict = {}
                parsed_calls.append(
                    ToolCallItem(
                        id=tc.id or f"call_{tc.function.name}",
                        name=tc.function.name,
                        arguments=args_dict,
                        raw_arguments=raw_args if isinstance(raw_args, str) else json.dumps(args_dict),
                    )
                )

        return ChatResponse(content=content, tool_calls=parsed_calls)
