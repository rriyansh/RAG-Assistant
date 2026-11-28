from __future__ import annotations

import asyncio
import math
import time
import threading
from collections import defaultdict, deque
from collections.abc import Callable

from fastapi import HTTPException, Request

from src.utils.config import get_settings

_requests: dict[tuple[str, str], deque[float]] = defaultdict(deque)
_lock = asyncio.Lock()

class InMemoryRateLimiter:
    def __init__(self, limit: int, window_seconds: int):
        self.limit = limit
        self.window_seconds = window_seconds
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()
        self._clock = time.monotonic

    def check(self, identity: str) -> None:
        now = self._clock()
        with self._lock:
            bucket = self._events[identity]
            while bucket and now - bucket[0] >= self.window_seconds:
                bucket.popleft()
            if len(bucket) >= self.limit:
                retry = max(1, math.ceil(self.window_seconds - (now - bucket[0])))
                raise HTTPException(429, "Request limit reached. Retry later.", headers={"Retry-After": str(retry)})
            bucket.append(now)


def rate_limit(scope: str) -> Callable[[Request], object]:
    async def check(request: Request) -> None:
        settings = get_settings()
        now = time.monotonic()
        window = settings.request_rate_window_seconds
        identity = request.headers.get("x-reso-session") or (
            request.client.host if request.client else "unknown"
        )
        key = (scope, identity[:128])
        async with _lock:
            bucket = _requests[key]
            while bucket and now - bucket[0] >= window:
                bucket.popleft()
            if len(bucket) >= settings.request_rate_limit:
                retry_after = max(1, math.ceil(window - (now - bucket[0])))
                raise HTTPException(
                    status_code=429,
                    detail="Request limit reached. Retry later.",
                    headers={"Retry-After": str(retry_after)},
                )
            bucket.append(now)

    return check
