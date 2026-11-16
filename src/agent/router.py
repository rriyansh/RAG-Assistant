"""
A tiny decision layer between retrieval and generation.
Right now it just decides whether the answer should mention that
a web search was used. Later you can add more logic here
(e.g. ask a cheap LLM to classify the question first).
"""
from src.retrieval.retriever import RetrievedChunk


def should_mention_web(chunks: list[RetrievedChunk]) -> bool:
    return any(c.source_type == "web" for c in chunks)
