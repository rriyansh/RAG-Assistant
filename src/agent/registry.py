# src/agent/registry.py
from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Literal

logger = logging.getLogger(__name__)

PLUGINS_STATE_PATH = Path("data/plugins.json")
MAX_ARGS_BYTES = 10 * 1024  # 10 KB cap on tool arguments JSON


class ToolValidationError(ValueError):
    """Raised when tool arguments fail JSON schema or size validation."""


def _write_secure_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.with_suffix(".tmp")
    tmp_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    os.chmod(tmp_path, 0o600)
    tmp_path.replace(path)
    os.chmod(path, 0o600)


def _read_secure_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        os.chmod(path, 0o600)
        raw = json.loads(path.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else {}
    except Exception as exc:
        logger.warning("Could not read %s: %s", path, exc)
        return {}


def validate_against_schema(args: Any, schema: dict[str, Any]) -> None:
    """Strict lightweight JSON Schema validator for tool call arguments."""
    raw_bytes = len(json.dumps(args).encode("utf-8"))
    if raw_bytes > MAX_ARGS_BYTES:
        raise ToolValidationError(
            f"Tool arguments size ({raw_bytes} bytes) exceeds 10 KB maximum."
        )

    if not isinstance(args, dict):
        raise ToolValidationError("Tool arguments must be a JSON object.")

    if not schema:
        return

    schema_type = schema.get("type", "object")
    if schema_type == "object":
        required = schema.get("required", [])
        if isinstance(required, list):
            for req_key in required:
                if req_key not in args:
                    raise ToolValidationError(f"Missing required argument: '{req_key}'")

        properties = schema.get("properties", {})
        additional_props = schema.get("additionalProperties", True)

        for key, value in args.items():
            if isinstance(properties, dict) and key not in properties:
                if additional_props is False:
                    raise ToolValidationError(f"Unexpected argument: '{key}'")
                continue
            prop_schema = properties.get(key, {}) if isinstance(properties, dict) else {}
            if isinstance(prop_schema, dict):
                _validate_field_type(key, value, prop_schema)


def _validate_field_type(name: str, value: Any, prop_schema: dict[str, Any]) -> None:
    expected = prop_schema.get("type")
    if not expected:
        return

    expected_types = [expected] if isinstance(expected, str) else list(expected)
    matched = False
    for exp in expected_types:
        if exp == "string" and isinstance(value, str):
            matched = True
        elif exp == "integer" and isinstance(value, int) and not isinstance(value, bool):
            matched = True
        elif exp == "number" and isinstance(value, (int, float)) and not isinstance(value, bool):
            matched = True
        elif exp == "boolean" and isinstance(value, bool):
            matched = True
        elif exp == "array" and isinstance(value, list):
            matched = True
        elif exp == "object" and isinstance(value, dict):
            matched = True
        elif exp == "null" and value is None:
            matched = True

    if not matched:
        raise ToolValidationError(
            f"Argument '{name}' expected type '{expected}', got '{type(value).__name__}'."
        )


@dataclass
class ToolSpec:
    name: str
    description: str
    input_schema: dict[str, Any]
    handler: Callable[..., Any]
    requires_consent: bool = False
    source: Literal["internal", "connector", "mcp"] = "internal"
    server_id: str | None = None
    enabled: bool = True


class ToolRegistry:
    def __init__(self, state_path: Path = PLUGINS_STATE_PATH) -> None:
        self._tools: dict[str, ToolSpec] = {}
        self._state_path = state_path
        self._enabled_overrides: dict[str, bool] = self._load_state()

    def _load_state(self) -> dict[str, bool]:
        data = _read_secure_json(self._state_path)
        raw = data.get("enabled", {})
        if isinstance(raw, dict):
            return {str(k): bool(v) for k, v in raw.items()}
        return {}

    def _save_state(self) -> None:
        _write_secure_json(self._state_path, {"enabled": self._enabled_overrides})

    def register(self, spec: ToolSpec) -> None:
        if not spec.name or not spec.name.strip():
            raise ValueError("Tool name cannot be empty.")
        if spec.name in self._tools:
            raise ValueError(f"Tool name collision: '{spec.name}' is already registered.")
        if spec.name in self._enabled_overrides:
            spec.enabled = self._enabled_overrides[spec.name]
        self._tools[spec.name] = spec
        logger.info("Registered tool '%s' (source=%s, enabled=%s)", spec.name, spec.source, spec.enabled)

    def unregister(self, name: str) -> None:
        self._tools.pop(name, None)

    def unregister_by_server(self, server_id: str) -> int:
        to_remove = [
            name for name, spec in self._tools.items() if spec.server_id == server_id
        ]
        for name in to_remove:
            del self._tools[name]
        return len(to_remove)

    def get(self, name: str) -> ToolSpec | None:
        return self._tools.get(name)

    def set_enabled(self, name: str, enabled: bool) -> bool:
        spec = self._tools.get(name)
        if spec is None:
            return False
        spec.enabled = bool(enabled)
        self._enabled_overrides[name] = bool(enabled)
        self._save_state()
        return True

    def list_for_llm(self) -> list[dict[str, Any]]:
        tools: list[dict[str, Any]] = []
        for spec in self._tools.values():
            if not spec.enabled:
                continue
            schema = spec.input_schema or {"type": "object", "properties": {}}
            tools.append(
                {
                    "type": "function",
                    "function": {
                        "name": spec.name,
                        "description": spec.description,
                        "parameters": schema,
                    },
                }
            )
        return tools

    def list_public(self) -> list[dict[str, Any]]:
        result: list[dict[str, Any]] = []
        for spec in self._tools.values():
            item: dict[str, Any] = {
                "name": spec.name,
                "description": spec.description,
                "requires_consent": spec.requires_consent,
                "source": spec.source,
                "enabled": spec.enabled,
            }
            if spec.server_id is not None:
                item["server_id"] = spec.server_id
            result.append(item)
        return result


registry = ToolRegistry()
