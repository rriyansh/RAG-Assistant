# src/agent/mcp/manager.py
from __future__ import annotations

import asyncio
import json
import logging
import os
import urllib.parse
from contextlib import AsyncExitStack
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from mcp.client.streamable_http import streamablehttp_client

from src.agent.registry import ToolRegistry, ToolSpec, registry as global_registry

logger = logging.getLogger(__name__)

MCP_CONFIG_PATH = Path("data/mcp_servers.json")
ALLOWED_STDIO_COMMANDS: tuple[str, ...] = ("npx", "uvx", "python", "node")


class MCPValidationError(ValueError):
    """Raised when an MCP server configuration violates security or naming policies."""


def validate_stdio_command(command: str) -> str:
    cleaned = command.strip()
    if os.path.basename(cleaned) != cleaned or cleaned not in ALLOWED_STDIO_COMMANDS:
        raise MCPValidationError(
            f"Command '{command}' is not allowed. Permitted commands: {list(ALLOWED_STDIO_COMMANDS)}"
        )
    return cleaned


def validate_http_url(url: str) -> str:
    cleaned = url.strip()
    parsed = urllib.parse.urlparse(cleaned)
    if parsed.scheme == "https" and parsed.netloc:
        return cleaned
    if parsed.scheme == "http" and parsed.hostname in ("localhost", "127.0.0.1"):
        return cleaned
    raise MCPValidationError(
        "HTTP MCP URLs must use https:// unless connecting to localhost or 127.0.0.1."
    )


def _format_mcp_result(result: Any) -> str:
    content_list = getattr(result, "content", None)
    if not content_list:
        return json.dumps(result, default=str)
    parts: list[str] = []
    for block in content_list:
        text = getattr(block, "text", None)
        if text is not None:
            parts.append(str(text))
        elif hasattr(block, "model_dump"):
            parts.append(json.dumps(block.model_dump(), default=str))
        else:
            parts.append(str(block))
    return "\n".join(parts)


@dataclass
class ActiveMCPSession:
    server_id: str
    transport: Literal["stdio", "http"]
    url_or_command: str
    prefix: str
    status: str = "connecting"
    tool_names: list[str] = field(default_factory=list)
    session: ClientSession | None = None
    stop_event: asyncio.Event = field(default_factory=asyncio.Event)
    ready_event: asyncio.Event = field(default_factory=asyncio.Event)
    task: asyncio.Task[None] | None = None
    error: str | None = None


class MCPManager:
    def __init__(
        self,
        tool_registry: ToolRegistry = global_registry,
        config_path: Path = MCP_CONFIG_PATH,
    ) -> None:
        self._registry = tool_registry
        self._config_path = config_path
        self._sessions: dict[str, ActiveMCPSession] = {}
        self._configs: dict[str, dict[str, Any]] = {}

    def _load_persisted_configs(self) -> dict[str, dict[str, Any]]:
        if not self._config_path.exists():
            return {}
        try:
            os.chmod(self._config_path, 0o600)
            raw = json.loads(self._config_path.read_text(encoding="utf-8"))
            servers = raw.get("servers", {}) if isinstance(raw, dict) else {}
            return servers if isinstance(servers, dict) else {}
        except Exception as exc:
            logger.warning("Failed to load MCP servers config: %s", exc)
            return {}

    def _save_persisted_configs(self) -> None:
        self._config_path.parent.mkdir(parents=True, exist_ok=True)
        tmp_path = self._config_path.with_suffix(".tmp")
        tmp_path.write_text(
            json.dumps({"servers": self._configs}, indent=2), encoding="utf-8"
        )
        os.chmod(tmp_path, 0o600)
        tmp_path.replace(self._config_path)
        os.chmod(self._config_path, 0o600)

    async def startup(self) -> None:
        self._configs = self._load_persisted_configs()
        for server_id, cfg in list(self._configs.items()):
            transport = cfg.get("transport")
            prefix = cfg.get("prefix") or f"mcp_{server_id}_"
            try:
                if transport == "stdio":
                    await self.add_stdio_server(
                        server_id=server_id,
                        command=str(cfg.get("command", "")),
                        args=list(cfg.get("args", [])),
                        prefix=prefix,
                        persist=False,
                    )
                elif transport == "http":
                    await self.add_http_server(
                        server_id=server_id,
                        url=str(cfg.get("url", "")),
                        prefix=prefix,
                        persist=False,
                    )
            except Exception as exc:
                logger.warning("Failed to reconnect MCP server '%s' on startup: %s", server_id, exc)
                self._sessions[server_id] = ActiveMCPSession(
                    server_id=server_id,
                    transport="stdio" if transport == "stdio" else "http",
                    url_or_command=str(cfg.get("url") or cfg.get("command") or ""),
                    prefix=prefix,
                    status="error",
                    error=str(exc),
                )

    async def shutdown(self) -> None:
        for server_id in list(self._sessions.keys()):
            await self.remove_server(server_id, persist=False)

    def _make_tool_handler(self, server_id: str, remote_tool_name: str):
        async def _handler(**kwargs: Any) -> str:
            entry = self._sessions.get(server_id)
            if entry is None or entry.session is None or entry.status != "connected":
                raise RuntimeError(f"MCP server '{server_id}' is not connected.")
            result = await entry.session.call_tool(remote_tool_name, arguments=kwargs)
            return _format_mcp_result(result)

        return _handler

    async def _session_runner(
        self,
        entry: ActiveMCPSession,
        transport_kind: Literal["stdio", "http"],
        command: str | None = None,
        args: list[str] | None = None,
        url: str | None = None,
    ) -> None:
        stack = AsyncExitStack()
        try:
            if transport_kind == "stdio":
                params = StdioServerParameters(command=command or "", args=args or [])
                read_stream, write_stream = await stack.enter_async_context(stdio_client(params))
            else:
                streams = await stack.enter_async_context(streamablehttp_client(url or ""))
                read_stream, write_stream = streams[0], streams[1]

            session = await stack.enter_async_context(ClientSession(read_stream, write_stream))
            await session.initialize()
            tools_resp = await session.list_tools()

            registered_names: list[str] = []
            for tool in tools_resp.tools:
                full_name = f"{entry.prefix}{tool.name}"
                schema = (
                    tool.inputSchema
                    if isinstance(tool.inputSchema, dict)
                    else {"type": "object", "properties": {}}
                )
                spec = ToolSpec(
                    name=full_name,
                    description=tool.description or f"MCP tool {tool.name} from {entry.server_id}",
                    input_schema=schema,
                    handler=self._make_tool_handler(entry.server_id, tool.name),
                    requires_consent=True,
                    source="mcp",
                    server_id=entry.server_id,
                )
                self._registry.register(spec)
                registered_names.append(full_name)

            entry.session = session
            entry.tool_names = registered_names
            entry.status = "connected"
            entry.ready_event.set()

            await entry.stop_event.wait()
        except Exception as exc:
            for t_name in entry.tool_names:
                self._registry.unregister(t_name)
            entry.tool_names.clear()
            entry.status = "error"
            entry.error = str(exc)
            entry.ready_event.set()
            logger.warning("MCP session '%s' terminated with error: %s", entry.server_id, exc)
        finally:
            try:
                await stack.aclose()
            except Exception as close_exc:
                logger.debug("MCP session '%s' close notice: %s", entry.server_id, close_exc)

    async def add_stdio_server(
        self,
        server_id: str,
        command: str,
        args: list[str] | None = None,
        prefix: str = "mcp_",
        persist: bool = True,
    ) -> dict[str, Any]:
        server_id = server_id.strip()
        if not server_id:
            raise MCPValidationError("Server ID cannot be empty.")
        if not prefix or not prefix.strip():
            raise MCPValidationError("An explicit non-empty tool prefix is required for MCP tools.")
        if server_id in self._sessions:
            raise MCPValidationError(f"MCP server '{server_id}' already exists.")

        validated_cmd = validate_stdio_command(command)
        clean_args = [str(a) for a in (args or [])]
        display_cmd = " ".join([validated_cmd, *clean_args]).strip()

        entry = ActiveMCPSession(
            server_id=server_id,
            transport="stdio",
            url_or_command=display_cmd,
            prefix=prefix,
        )
        self._sessions[server_id] = entry
        entry.task = asyncio.create_task(
            self._session_runner(
                entry,
                transport_kind="stdio",
                command=validated_cmd,
                args=clean_args,
            )
        )

        try:
            await asyncio.wait_for(entry.ready_event.wait(), timeout=20.0)
        except asyncio.TimeoutError as exc:
            await self.remove_server(server_id, persist=False)
            raise RuntimeError(f"Timed out initializing stdio MCP server '{server_id}'.") from exc

        if entry.status == "error":
            err_msg = entry.error or "Failed to connect to stdio MCP server."
            await self.remove_server(server_id, persist=False)
            raise RuntimeError(err_msg)

        if persist:
            self._configs[server_id] = {
                "id": server_id,
                "transport": "stdio",
                "command": validated_cmd,
                "args": clean_args,
                "prefix": prefix,
            }
            self._save_persisted_configs()

        return {
            "id": entry.server_id,
            "transport": entry.transport,
            "status": entry.status,
            "tool_count": len(entry.tool_names),
            "url_or_command": entry.url_or_command,
        }

    async def add_http_server(
        self,
        server_id: str,
        url: str,
        prefix: str = "mcp_",
        persist: bool = True,
    ) -> dict[str, Any]:
        server_id = server_id.strip()
        if not server_id:
            raise MCPValidationError("Server ID cannot be empty.")
        if not prefix or not prefix.strip():
            raise MCPValidationError("An explicit non-empty tool prefix is required for MCP tools.")
        if server_id in self._sessions:
            raise MCPValidationError(f"MCP server '{server_id}' already exists.")

        validated_url = validate_http_url(url)

        entry = ActiveMCPSession(
            server_id=server_id,
            transport="http",
            url_or_command=validated_url,
            prefix=prefix,
        )
        self._sessions[server_id] = entry
        entry.task = asyncio.create_task(
            self._session_runner(
                entry,
                transport_kind="http",
                url=validated_url,
            )
        )

        try:
            await asyncio.wait_for(entry.ready_event.wait(), timeout=20.0)
        except asyncio.TimeoutError as exc:
            await self.remove_server(server_id, persist=False)
            raise RuntimeError(f"Timed out connecting to HTTP MCP server '{server_id}'.") from exc

        if entry.status == "error":
            err_msg = entry.error or "Failed to connect to HTTP MCP server."
            await self.remove_server(server_id, persist=False)
            raise RuntimeError(err_msg)

        if persist:
            self._configs[server_id] = {
                "id": server_id,
                "transport": "http",
                "url": validated_url,
                "prefix": prefix,
            }
            self._save_persisted_configs()

        return {
            "id": entry.server_id,
            "transport": entry.transport,
            "status": entry.status,
            "tool_count": len(entry.tool_names),
            "url_or_command": entry.url_or_command,
        }

    async def remove_server(self, server_id: str, persist: bool = True) -> bool:
        entry = self._sessions.pop(server_id, None)
        self._registry.unregister_by_server(server_id)

        if entry is not None:
            entry.stop_event.set()
            if entry.task is not None and not entry.task.done():
                try:
                    await asyncio.wait_for(entry.task, timeout=5.0)
                except asyncio.TimeoutError:
                    entry.task.cancel()
                except Exception:
                    pass

        removed_cfg = self._configs.pop(server_id, None)
        if persist and removed_cfg is not None:
            self._save_persisted_configs()

        return entry is not None or removed_cfg is not None

    def get_servers(self) -> list[dict[str, Any]]:
        result: list[dict[str, Any]] = []
        for server_id, entry in self._sessions.items():
            result.append(
                {
                    "id": server_id,
                    "transport": entry.transport,
                    "status": entry.status,
                    "tool_count": len(entry.tool_names),
                    "url_or_command": entry.url_or_command,
                }
            )
        return result


mcp_manager = MCPManager(tool_registry=global_registry)
