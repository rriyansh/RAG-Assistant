"""
Detects which provider an API key belongs to, purely from its shape.
No network call, no cost. Used by the frontend so users can paste
a key without telling the system which provider it is.
"""
import re

# Order matters — specific prefixes must be checked before generic ones.
# For example "sk-or-v1-..." (OpenRouter) and "sk-ant-..." (Anthropic)
# would both match a naive "sk-..." OpenAI pattern if OpenAI were first.
_PATTERNS = [
    ("openrouter", re.compile(r"^sk-or-v1-[A-Za-z0-9]{40,}$")),
    ("anthropic",  re.compile(r"^sk-ant-(?:api\d+-)?[A-Za-z0-9_\-]{40,}$")),
    ("groq",       re.compile(r"^gsk_[A-Za-z0-9]{40,}$")),
    ("gemini",     re.compile(r"^AIza[0-9A-Za-z_\-]{35}$")),
    ("huggingface",re.compile(r"^hf_[A-Za-z0-9]{30,}$")),
    ("openai",     re.compile(r"^sk-(?:proj-)?[A-Za-z0-9_\-]{40,}$")),
]

_HINTS = {
    "openai":      "Looks like an OpenAI key",
    "groq":        "Looks like a Groq key",
    "gemini":      "Looks like a Google Gemini key",
    "openrouter":  "Looks like an OpenRouter key",
    "anthropic":   "Looks like an Anthropic Claude key (not yet supported as an LLM provider)",
    "huggingface": "Looks like a Hugging Face token",
}


def detect_provider(api_key: str) -> tuple[str, str]:
    """
    Return (provider, hint). If nothing matches, return ("unknown", "").
    Trims whitespace first because copy-paste often includes it.
    """
    key = (api_key or "").strip()
    if not key:
        return "unknown", ""

    for name, pattern in _PATTERNS:
        if pattern.match(key):
            return name, _HINTS.get(name, "")

    return "unknown", ""
