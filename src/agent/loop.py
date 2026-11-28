# src/agent/loop.py
from __future__ import annotations

import asyncio
import hashlib
import inspect
import json
import logging
import time
from typing import Any

from src.llm.style import RESPONSE_STYLE
from src.agent.registry import ToolRegistry, ToolValidationError, validate_against_schema
from src.llm.factory import create_llm
from src.llm.provider import ProviderResponseError

logger = logging.getLogger(__name__)

MAX_TOOL_OUTPUT_CHARS = 4000


class ToolNotSupportedError(RuntimeError):
    """Raised when the configured LLM provider/model does not support tool calling."""


def _is_tools_unsupported_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    indicators = (
        "does not support tools",
        "tool use is not supported",
        "tools is not supported",
        "tool_choice",
        "functions are not supported",
        "unrecognized request argument supplied: tools",
        "unknown field \"tools\"",
    )
    return any(token in msg for token in indicators)


def _summarize_result(raw_text: str, max_len: int = 220) -> str:
    cleaned = " ".join(raw_text.split())
    if len(cleaned) <= max_len:
        return cleaned
    return cleaned[: max_len - 3] + "..."


def _extract_sources_from_tool(
    tool_name: str, result_obj: Any, sources: list[dict[str, Any]]
) -> None:
    if tool_name == "search_pdfs" and isinstance(result_obj, list):
        for item in result_obj:
            if isinstance(item, dict):
                sources.append(
                    {
                        "source_type": "pdf",
                        "doc_name": item.get("doc_name", "document.pdf"),
                        "page": item.get("page", 1),
                        "text": str(item.get("text", ""))[:300],
                        "score": item.get("score", 0.0),
                    }
                )
    elif tool_name == "web_search" and isinstance(result_obj, list):
        for item in result_obj:
            if isinstance(item, dict):
                sources.append(
                    {
                        "source_type": "web",
                        "doc_name": item.get("title", "Web Result"),
                        "url": item.get("url", ""),
                        "text": str(item.get("snippet", ""))[:300],
                        "score": 1.0,
                    }
                )
    elif tool_name == "fetch_url" and isinstance(result_obj, str) and result_obj:
        sources.append(
            {
                "source_type": "web",
                "doc_name": "Fetched Web Page",
                "text": result_obj[:300],
                "score": 1.0,
            }
        )


async def run_agent(
    question: str,
    assistant_name: str,
    registry: ToolRegistry,
    max_turns: int = 12,
    consent: list[str] | None = None,
    on_activity=None,
    history: list[dict[str, str]] | None = None,
    allowed_tools: set[str] | None = None,
    preferences: str = "",
) -> dict[str, Any]:
    approved_set = set(consent or [])
    llm = create_llm()
    tools_payload = registry.list_for_llm()

    if allowed_tools is not None:
        tools_payload = [tool for tool in tools_payload if tool["function"]["name"] in allowed_tools]
        if not tools_payload:
            raise ToolNotSupportedError("No enabled connector tools available.")

    system_prompt = (
        f"You are {assistant_name}, an accurate and helpful AI assistant. "
        "You have access to tools for searching local PDFs, searching the web, fetching URLs, "
        "and interacting with connected MCP tools. Use tools whenever factual grounding or "
        "external actions are needed. Cite your sources clearly in your final answer."
    )

    messages: list[dict[str, Any]] = [
        {"role": "system", "content": system_prompt + RESPONSE_STYLE + preferences},
        *(history or []),
        {"role": "user", "content": question},
    ]

    recorded_tool_calls: list[dict[str, Any]] = []
    sources: list[dict[str, Any]] = []

    for _turn in range(max_turns):
        if on_activity:
            on_activity("Requesting the next model response")
        try:
            chat_resp = await asyncio.to_thread(
                llm.chat,
                messages,
                tools_payload if tools_payload else None,
                **({"require_tool": True} if allowed_tools and _turn == 0 else {}),
            )
        except Exception as exc:
            if tools_payload and _is_tools_unsupported_error(exc):
                logger.warning(
                    "LLM provider does not support tools= (%s). Signaling fallback to direct pipeline.",
                    exc,
                )
                raise ToolNotSupportedError(str(exc)) from exc
            if isinstance(exc, ProviderResponseError):
                raise
            logger.warning("Provider request failed (%s)", type(exc).__name__)
            return {
                "answer": "The provider could not complete this request. Check the active key, model, and available quota.",
                "tool_calls": recorded_tool_calls,
                "sources": sources,
                "pending_consent": [],
                "status": "error",
            }

        if not chat_resp.tool_calls:
            return {
                "answer": chat_resp.content or "No response generated.",
                "tool_calls": recorded_tool_calls,
                "sources": sources,
                "pending_consent": [],
                "status": "ok",
            }

        unapproved_tools: list[str] = []
        pending_consent_details: list[dict[str, Any]] = []

        remaining = approved_set.copy()
        for tc in chat_resp.tool_calls:
            spec = registry.get(tc.name) if allowed_tools is None or tc.name in allowed_tools else None
            if not spec or not spec.enabled or not spec.requires_consent:
                continue
            server_id = str(getattr(spec, "server_id", "") or "")
            approval = hashlib.sha256(json.dumps([server_id, tc.name, tc.arguments],
                sort_keys=True, separators=(",", ":")).encode()).hexdigest()
            if tc.name in remaining:
                remaining.remove(tc.name)
            elif approval in remaining:
                remaining.remove(approval)
            else:
                if tc.name not in unapproved_tools:
                    unapproved_tools.append(tc.name)
                pending_consent_details.append({"name": tc.name, "args": tc.arguments})
                recorded_tool_calls.append(
                    {
                        "approval": approval,
                        "id": tc.id,
                        "name": tc.name,
                        "args": tc.arguments,
                        "result_summary": "Awaiting user consent before execution.",
                        "status": "pending",
                        "duration_ms": 0,
                        "error": None,
                    }
                )

        if unapproved_tools:
            first_pending = pending_consent_details[0]
            return {
                "answer": (
                    f"Permission required: **{assistant_name}** wants to execute "
                    f"`{first_pending['name']}` with arguments `{json.dumps(first_pending['args'])}`."
                ),
                "tool_calls": recorded_tool_calls,
                "sources": sources,
                "pending_consent": unapproved_tools,
                "status": "awaiting_consent",
            }

        approved_set = remaining
        messages.append(chat_resp.as_message())

        for tc in chat_resp.tool_calls:
            if on_activity:
                on_activity(f"Running {tc.name}")
            start_ts = time.perf_counter()
            spec = registry.get(tc.name) if allowed_tools is None or tc.name in allowed_tools else None
            error_msg: str | None = None
            serialized_output = ""
            raw_result: Any = None

            if spec is None or not spec.enabled:
                error_msg = f"Tool '{tc.name}' is not available or is disabled."
                serialized_output = json.dumps({"error": error_msg})
            else:
                try:
                    validate_against_schema(tc.arguments, spec.input_schema)
                    if inspect.iscoroutinefunction(spec.handler):
                        raw_result = await spec.handler(**tc.arguments)
                    else:
                        maybe_coro = await asyncio.to_thread(spec.handler, **tc.arguments)
                        if inspect.isawaitable(maybe_coro):
                            raw_result = await maybe_coro
                        else:
                            raw_result = maybe_coro

                    _extract_sources_from_tool(tc.name, raw_result, sources)

                    if tc.name == "github_review_change":
                        serialized_output = json.dumps({k: raw_result[k] for k in ("repo", "branch", "path", "message")})
                    elif isinstance(raw_result, str):
                        serialized_output = raw_result
                    else:
                        serialized_output = json.dumps(raw_result, ensure_ascii=False, default=str)
                except ToolValidationError as val_err:
                    error_msg = f"Validation error: {val_err}"
                    serialized_output = json.dumps({"error": error_msg})
                except Exception as exec_err:
                    logger.warning("Tool %s failed (%s)", tc.name, type(exec_err).__name__)
                    error_msg = "The service request failed. Check connector access and try again."
                    serialized_output = json.dumps({"error": error_msg})

            if on_activity:
                on_activity(f"{tc.name} failed" if error_msg else f"Completed {tc.name}")
            duration_ms = int((time.perf_counter() - start_ts) * 1000)
            capped_output = serialized_output[:MAX_TOOL_OUTPUT_CHARS]

            recorded_tool_calls.append(
                {
                    "id": tc.id,
                    "name": tc.name,
                    "args": tc.arguments,
                    "result_summary": error_msg if error_msg else _summarize_result(capped_output),
                    "status": "error" if error_msg else "ok",
                    "duration_ms": duration_ms,
                    "review": raw_result if tc.name == "github_review_change" and not error_msg else None,
                    "error": error_msg,
                }
            )

            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": capped_output,
                }
            )

    partial_summary = ", ".join(tc["name"] for tc in recorded_tool_calls) or "none"
    return {
        "answer": (
            f"Reached the maximum limit of {max_turns} reasoning turns before finalizing a complete answer. "
            f"Completed tool calls during this run: {partial_summary}."
        ),
        "tool_calls": recorded_tool_calls,
        "sources": sources,
        "pending_consent": [],
        "status": "max_turns_exceeded",
    }
