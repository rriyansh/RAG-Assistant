"""Prompt building module for RAG."""

import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = """You are a helpful AI assistant that answers questions based on provided context.
Your task is to answer the user's question using only the information from the context provided.
If the context doesn't contain enough information to answer the question, say so clearly.
Always cite your sources using the format [Source: filename, page X] at the end of each sentence.
Be concise but thorough in your answers."""


def build_rag_prompt(
    query: str,
    chunks: List[Dict[str, Any]],
    web_results: str = ""
) -> str:
    """Build the RAG prompt with context and query.

    Args:
        query: User's question.
        chunks: Retrieved document chunks with metadata.
        web_results: Formatted web search results (optional).

    Returns:
        Complete prompt string.
    """
    context_parts = []

    if chunks:
        context_parts.append("=== DOCUMENT CONTEXT ===")
        for i, chunk in enumerate(chunks, 1):
            source = chunk.get("metadata", {}).get("source", "unknown")
            page = chunk.get("metadata", {}).get("page_number", "?")
            text = chunk.get("text", "")
            context_parts.append(f"\n[Chunk {i}] Source: {source}, Page: {page}")
            context_parts.append(text)

    if web_results:
        context_parts.append("\n=== WEB SEARCH CONTEXT ===")
        context_parts.append(web_results)

    context = "\n".join(context_parts) if context_parts else "No context available."

    prompt = f"""{SYSTEM_PROMPT}

{context}

=== USER QUESTION ===
{query}

=== ANSWER ===
"""
    return prompt


def build_citation_prompt(query: str, chunks: List[Dict[str, Any]]) -> str:
    """Build a prompt that emphasizes citation format."""
    context_parts = ["=== DOCUMENT CONTEXT ==="]
    for i, chunk in enumerate(chunks, 1):
        source = chunk.get("metadata", {}).get("source", "unknown")
        page = chunk.get("metadata", {}).get("page_number", "?")
        text = chunk.get("text", "")
        context_parts.append(f"\n[Doc {i}] {source} (p.{page}): {text}")

    context = "\n".join(context_parts)

    return f"""{SYSTEM_PROMPT}

{context}

=== USER QUESTION ===
{query}

=== ANSWER (with citations like [Doc 1], [Doc 2]) ===
"""