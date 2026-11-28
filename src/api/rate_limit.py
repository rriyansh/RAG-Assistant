from __future__ import annotations

import asyncio
import math
import time
from collections import defaultdict, deque
from collections.abc import Callable

from fastapi import HTTPException, Request

from src.utils.config import get_settings

_requests: dict[tuple[str, str], deque[float]] = defaultdict(deque)
_lock = asyncio.Lock()


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
