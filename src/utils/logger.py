import logging
import threading

from src.utils.config import get_settings


_configured = False
_lock = threading.Lock()

def configure_logging() -> None:
    global _configured
    with _lock:
        if not _configured:
            logging.basicConfig(level=getattr(logging, get_settings().log_level.upper(), logging.INFO), format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
            _configured = True

def setup_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
