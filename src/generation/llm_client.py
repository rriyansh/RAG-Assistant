"""LLM client module for OpenAI API."""

import logging
from typing import List, Dict, Any, Optional
import openai
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)


class LLMSettings(BaseSettings):
    """Settings for LLM client."""
    openai_api_key: str
    llm_model: str = "gpt-4o-mini"
    temperature: float = 0.1
    max_tokens: int = 1000

    class Config:
        env_file = ".env"


class LLMClient:
    """Wrapper for OpenAI Chat Completion API."""

    def __init__(self, settings: LLMSettings | None = None):
        self.settings = settings or LLMSettings()
        self.client = openai.OpenAI(api_key=self.settings.openai_api_key)
        self.model = self.settings.llm_model
        self.temperature = self.settings.temperature
        self.max_tokens = self.settings.max_tokens

    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ) -> str:
        """Generate a response from the LLM.

        Args:
            prompt: User prompt.
            system_prompt: Optional system prompt override.
            temperature: Optional temperature override.
            max_tokens: Optional max tokens override.

        Returns:
            Generated text response.
        """
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature if temperature is not None else self.temperature,
                max_tokens=max_tokens if max_tokens is not None else self.max_tokens
            )
            content = response.choices[0].message.content
            logger.info(f"Generated response ({len(content)} chars)")
            return content.strip() if content else ""
        except Exception as e:
            logger.error(f"LLM generation failed: {e}")
            raise

    def generate_stream(
        self,
        prompt: str,
        system_prompt: Optional[str] = None
    ):
        """Generate a streaming response from the LLM.

        Args:
            prompt: User prompt.
            system_prompt: Optional system prompt override.

        Yields:
            Response chunks as they arrive.
        """
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        try:
            stream = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                stream=True
            )
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            logger.error(f"LLM streaming failed: {e}")
            raise