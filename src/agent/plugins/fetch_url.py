# src/agent/plugins/fetch_url.py
from __future__ import annotations

import logging
import urllib.parse

import requests
from bs4 import BeautifulSoup

from src.agent.registry import ToolRegistry, ToolSpec
import src.retrieval.web_search as ws_mod

logger = logging.getLogger(__name__)


def _fallback_fetch_page_text(url: str, timeout: int = 10) -> str:
    resp = requests.get(
        url,
        timeout=timeout,
        headers={"User-Agent": "Mozilla/5.0 (compatible; RAGAssistant/1.0)"},
    )
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    for tag in soup(["script", "style", "noscript", "header", "footer", "nav"]):
        tag.decompose()
    lines = [line.strip() for line in soup.get_text(separator="\n").splitlines() if line.strip()]
    return "\n".join(lines)[:4000]


def _handle_fetch_url(url: str) -> str:
    parsed = urllib.parse.urlparse(url.strip())
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise ValueError("URL must be a valid http or https address.")

    fetcher = getattr(ws_mod, "fetch_page_text", None) or getattr(
        ws_mod, "_fetch_page_text", None
    )
    if callable(fetcher):
        text = fetcher(url.strip())
        return str(text or "")[:4000]

    return _fallback_fetch_page_text(url.strip())


def register(reg: ToolRegistry) -> None:
    if reg.get("fetch_url") is not None:
        return
    reg.register(
        ToolSpec(
            name="fetch_url",
            description="Fetch and extract the readable plain text body of a specific HTTP/HTTPS web page URL.",
            input_schema={
                "type": "object",
                "properties": {
                    "url": {
                        "type": "string",
                        "description": "Full http:// or https:// URL to fetch.",
                    }
                },
                "required": ["url"],
                "additionalProperties": False,
            },
            handler=_handle_fetch_url,
            requires_consent=False,
            source="internal",
        )
    )
