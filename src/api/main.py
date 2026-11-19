# src/api/main.py
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.agent import register_internal_plugins
from src.agent.connectors import connector_manager
from src.api.routes import router

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

app.include_router(router)
