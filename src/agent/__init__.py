# src/agent/__init__.py
from __future__ import annotations

from src.agent.plugins import fetch_url, search_pdfs, web_search
from src.agent.registry import ToolRegistry, registry


def register_internal_plugins(target_registry: ToolRegistry | None = None) -> None:
    reg = target_registry or registry
    search_pdfs.register(reg)
    web_search.register(reg)
    fetch_url.register(reg)


__all__ = ["registry", "register_internal_plugins"]
