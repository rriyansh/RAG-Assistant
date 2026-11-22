# src/api/main.py
from __future__ import annotations

from dotenv import load_dotenv

import logging
import re
from fastapi import Request
from fastapi.responses import JSONResponse
from src.utils.workspace import session_id, api_mode
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.agent import register_internal_plugins
from src.agent.connectors import connector_manager
from src.api.routes import router
from src.api.studio import router as studio_router

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def bind_workspace(request: Request, call_next):
    session = request.headers.get("x-reso-session", "")
    if session and not re.fullmatch(r"[a-f0-9]{32}", session):
        return JSONResponse({"detail": "Invalid workspace session"}, status_code=400)
    mode_token = api_mode.set("chat" if request.headers.get("x-reso-mode") == "chat" else "agent")
    token = session_id.set(session)
    try:
        return await call_next(request)
    finally:
        session_id.reset(token)
        api_mode.reset(mode_token)


app.include_router(router)

app.include_router(studio_router)
