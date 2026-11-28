from __future__ import annotations
import threading, time
from typing import Generic, TypeVar
T = TypeVar("T")

class TTLCache(Generic[T]):
    def __init__(self, ttl_seconds: float = 300, max_items: int = 512):
        self.ttl_seconds, self.max_items = ttl_seconds, max_items
        self._items: dict[str, tuple[float, T]] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> T | None:
        with self._lock:
            item = self._items.get(key)
            if not item or item[0] <= time.monotonic():
                self._items.pop(key, None)
                return None
            return item[1]

    def set(self, key: str, value: T) -> None:
        with self._lock:
            if len(self._items) >= self.max_items:
                self._items.pop(next(iter(self._items)))
            self._items[key] = (time.monotonic() + self.ttl_seconds, value)

    def clear(self) -> None:
        with self._lock:
            self._items.clear()
