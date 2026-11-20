from contextvars import ContextVar
from pathlib import Path

session_id: ContextVar[str] = ContextVar("session_id", default="")


api_mode: ContextVar[str] = ContextVar("api_mode", default="agent")


def workspace_path(path: Path) -> Path:
    if api_mode.get() == "chat" and path.name in ("keys.json", "config.json"):
        path = path.with_name("chat_" + path.name)
    session = session_id.get()
    if session:
        return path.parent / "sessions" / session / path.name
    return path
