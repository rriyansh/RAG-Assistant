

# src/llm/provider.py
from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Any

from openai import OpenAI

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

    def generate(
        self,
        prompt: str,
        system_prompt: str = "You are a helpful AI assistant.",
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> str:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ]
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,  # type: ignore[arg-type]
            temperature=temperature if temperature is not None else self.temperature,
            max_tokens=max_tokens if max_tokens is not None else self.max_tokens,
            top_p=self.top_p,
        )
        content = response.choices[0].message.content
        return content.strip() if content else ""

    def chat(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
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
            kwargs["tool_choice"] = "auto"

        response = self.client.chat.completions.create(**kwargs)
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
