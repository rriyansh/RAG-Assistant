"""
One class that talks to any OpenAI-compatible API.

Why one class? Because OpenAI, Groq, Gemini, OpenRouter, Ollama,
and almost every modern LLM server all expose the SAME
"chat completions" API shape. Only three things change:

    1. base_url  — where the API lives
    2. api_key   — how we authenticate
    3. model     — which model name to call

So we use one client for everything.
"""
from openai import OpenAI


class LLMProvider:
    def __init__(self, base_url: str | None, api_key: str, model: str):
        # If base_url is None, the OpenAI SDK uses its default (api.openai.com).
        self.client = OpenAI(base_url=base_url, api_key=api_key or "not-needed")
        self.model = model

    def generate(self, messages: list[dict], temperature: float = 0.2) -> str:
        """
        Send a list of chat messages to the LLM and return the answer text.

        messages looks like:
            [{"role": "system", "content": "..."},
             {"role": "user",   "content": "..."}]
        """
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
        )
        return response.choices[0].message.content or ""

    def embed(self, texts: list[str]) -> list[list[float]]:
        """
        Convert text into vectors. Only works if the provider
        actually offers an embeddings endpoint (OpenAI and Ollama do).
        """
        response = self.client.embeddings.create(
            model=self.model,
            input=texts,
        )
        return [item.embedding for item in response.data]
