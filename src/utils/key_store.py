"""
Runtime API-key storage.

Priority order when an LLM is created:
    1. Keys set via the frontend (stored in data/keys.json)
    2. Keys from .env (fallback)

Why a separate file?
    .env is for the deployer. data/keys.json is for the end user.
    Non-technical users can paste a key in the Settings modal
    without ever touching .env or restarting the server.

Security:
    - The file is chmod'ed to 0600 (owner read/write only).
    - The GET endpoint never returns the full key, only a masked hint.
    - Set ALLOW_REMOTE_KEY_CONFIG=false in production if the API is
      exposed to the internet, so only .env keys can be used.
"""
import json
import os
from pathlib import Path
from threading import Lock

from src.utils.logger import setup_logger

logger = setup_logger(__name__)

KEYS_FILE = Path("data/keys.json")
_lock = Lock()

# Providers the frontend is allowed to configure.
KNOWN_PROVIDERS = {
    "openai", "groq", "gemini", "openrouter",
    "ollama", "custom",
}


# ------------------------------------------------------------
# Internal helpers
# ------------------------------------------------------------
def _ensure_file() -> None:
    KEYS_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not KEYS_FILE.exists():
        KEYS_FILE.write_text("{}")
        try:
            os.chmod(KEYS_FILE, 0o600)
        except OSError:
            # Windows does not support POSIX permissions; ignore.
            pass


def _read_all() -> dict:
    _ensure_file()
    try:
        return json.loads(KEYS_FILE.read_text())
    except Exception:
        logger.warning("keys.json is corrupt; starting empty")
        return {}


def _write_all(data: dict) -> None:
    _ensure_file()
    with _lock:
        KEYS_FILE.write_text(json.dumps(data, indent=2))
        try:
            os.chmod(KEYS_FILE, 0o600)
        except OSError:
            pass


def _mask(value: str) -> str:
    """Show only the first 4 and last 4 characters of a key."""
    if not value:
        return ""
    if len(value) <= 8:
        return "•" * len(value)
    return f"{value[:4]}…{value[-4:]}"


# ------------------------------------------------------------
# Public API
# ------------------------------------------------------------
def set_key(provider: str, api_key: str, model: str = "", base_url: str = "") -> None:
    """
    Save a key for one provider. Optionally save the model name
    and a custom base_url (needed for `custom` and `ollama`).
    """
    provider = provider.lower().strip()
    if provider not in KNOWN_PROVIDERS:
        raise ValueError(f"Unknown provider '{provider}'")

    data = _read_all()
    data[provider] = {
        "api_key": api_key.strip(),
        "model": model.strip(),
        "base_url": base_url.strip(),
    }
    _write_all(data)
    logger.info("Saved key for provider=%s", provider)


def get_key(provider: str) -> dict:
    """
    Return {api_key, model, base_url} for the given provider.
    Empty dict if not configured.
    """
    return _read_all().get(provider.lower().strip(), {})


def list_keys() -> dict[str, dict]:
    """
    Return every configured provider with masked keys — safe
    to send to the frontend.
    """
    raw = _read_all()
    return {
        provider: {
            "configured": bool(info.get("api_key") or provider == "ollama"),
            "masked_key": _mask(info.get("api_key", "")),
            "model": info.get("model", ""),
            "base_url": info.get("base_url", ""),
        }
        for provider, info in raw.items()
    }


def clear_key(provider: str) -> None:
    data = _read_all()
    data.pop(provider.lower().strip(), None)
    _write_all(data)
    logger.info("Cleared key for provider=%s", provider)
