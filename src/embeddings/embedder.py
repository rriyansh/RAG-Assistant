"""OpenAI embeddings module."""

import logging
from typing import List
import openai
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)


class EmbedderSettings(BaseSettings):
    """Settings for the embedder."""
    openai_api_key: str
    embedding_model: str = "text-embedding-3-small"

    class Config:
        env_file = ".env"


class Embedder:
    """Wrapper for OpenAI embeddings API."""

    def __init__(self, settings: EmbedderSettings | None = None):
        self.settings = settings or EmbedderSettings()
        self.client = openai.OpenAI(api_key=self.settings.openai_api_key)
        self.model = self.settings.embedding_model

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a list of texts.

        Args:
            texts: List of text strings to embed.

        Returns:
            List of embedding vectors.
        """
        if not texts:
            return []

        # Filter empty texts
        valid_texts = [t for t in texts if t and t.strip()]
        if not valid_texts:
            return []

        try:
            response = self.client.embeddings.create(
                model=self.model,
                input=valid_texts
            )
            embeddings = [item.embedding for item in response.data]
            logger.info(f"Generated {len(embeddings)} embeddings")
            return embeddings
        except Exception as e:
            logger.error(f"Failed to generate embeddings: {e}")
            raise

    def embed_query(self, query: str) -> List[float]:
        """Generate embedding for a single query.

        Args:
            query: Query text.

        Returns:
            Embedding vector.
        """
        embeddings = self.embed_texts([query])
        return embeddings[0] if embeddings else []