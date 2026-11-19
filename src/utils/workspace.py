from contextvars import ContextVar
from pathlib import Path

session_id: ContextVar[str] = ContextVar("session_id", default="")


def workspace_path(path: Path) -> Path:
    session = session_id.get()
    if session:
        return path.parent / "sessions" / session / path.name
    return path
