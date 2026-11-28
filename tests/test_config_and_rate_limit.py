from collections import deque
import pytest
from fastapi import HTTPException
from src.api.rate_limit import InMemoryRateLimiter
from src.utils.config import Settings

def test_invalid_chunk_overlap_fails_fast():
    with pytest.raises(ValueError):
        Settings(chunk_size=100, chunk_overlap=100)

def test_rate_limiter_returns_retry_after():
    limiter = InMemoryRateLimiter(limit=1, window_seconds=60)
    limiter._events["client"] = deque([limiter._clock()])
    with pytest.raises(HTTPException) as exc:
        limiter.check("client")
    assert exc.value.status_code == 429
    assert "Retry-After" in exc.value.headers
