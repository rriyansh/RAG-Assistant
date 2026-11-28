# src/api/main.py
from __future__ import annotations

import logging
import base64
import hashlib
import hmac
import json
import time
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from src.agent import register_internal_plugins
from src.agent.connectors import connector_manager
from src.api.routes import router
from src.utils.config import validate_startup_config
from src.utils.logger import configure_logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    configure_logging()
    validate_startup_config()
    logger.info("Initializing RAG Assistant internal tools and service connectors...")
    register_internal_plugins()
    await connector_manager.startup()
    try:
        yield
    finally:
        logger.info("Shutting down connectors...")
        await connector_manager.shutdown()


app = FastAPI(
    title="RAG Assistant API",
    description="Hybrid RAG & Service Connector Agent Assistant Backend",
    version="2.1.0",
    lifespan=lifespan,
)

def _signed_session() -> str:
    settings = validate_startup_config()
    payload = base64.urlsafe_b64encode(json.dumps({"exp": int(time.time()) + settings.session_ttl_seconds}).encode()).decode().rstrip("=")
    signature = hmac.new(settings.session_signing_secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}.{signature}"

@app.middleware("http")
async def bind_workspace(request: Request, call_next):
    token = request.cookies.get("reso_session", "")
    valid = False
    if "." in token:
        payload, signature = token.rsplit(".", 1)
        settings = validate_startup_config()
        expected = hmac.new(settings.session_signing_secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
        try:
            data = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
            valid = hmac.compare_digest(signature, expected) and int(data["exp"]) > time.time()
        except (ValueError, KeyError, json.JSONDecodeError):
            valid = False
    response = await call_next(request)
    if not valid:
        response.set_cookie("reso_session", _signed_session(), httponly=True, secure=request.url.scheme == "https", samesite="lax", max_age=validate_startup_config().session_ttl_seconds)
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in __import__("os").getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000").split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
