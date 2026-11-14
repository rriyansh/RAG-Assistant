"""Text chunking module."""

import logging
from typing import List, Dict, Any
import tiktoken

logger = logging.getLogger(__name__)


def get_tokenizer(model_name: str = "cl100k_base"):
    """Get tiktoken tokenizer for token counting."""
    try:
        return tiktoken.get_encoding(model_name)
    except Exception:
        return tiktoken.get_encoding("cl100k_base")


def chunk_text(
    text: str,
    chunk_size: int = 400,
    chunk_overlap: int = 50,
    tokenizer_name: str = "cl100k_base"
) -> List[str]:
    """Split text into overlapping chunks by token count.

    Args:
        text: Text to chunk.
        chunk_size: Target tokens per chunk.
        chunk_overlap: Overlap tokens between chunks.
        tokenizer_name: Tiktoken encoding name.

    Returns:
        List of text chunks.
    """
    tokenizer = get_tokenizer(tokenizer_name)
    tokens = tokenizer.encode(text)

    if len(tokens) <= chunk_size:
        return [text]

    chunks = []
    start = 0
    while start < len(tokens):
        end = min(start + chunk_size, len(tokens))
        chunk_tokens = tokens[start:end]
        chunk_text = tokenizer.decode(chunk_tokens)
        chunks.append(chunk_text)
        start += chunk_size - chunk_overlap

    return chunks


def chunk_pages(
    pages: List[Dict[str, Any]],
    chunk_size: int = 400,
    chunk_overlap: int = 50
) -> List[Dict[str, Any]]:
    """Chunk a list of page dictionaries.

    Args:
        pages: List of page dicts with 'text', 'page_number', 'source'.
        chunk_size: Target tokens per chunk.
        chunk_overlap: Overlap tokens between chunks.

    Returns:
        List of chunk dicts with metadata.
    """
    all_chunks = []
    chunk_id = 0

    for page in pages:
        chunks = chunk_text(page["text"], chunk_size, chunk_overlap)
        for i, chunk in enumerate(chunks):
            all_chunks.append({
                "chunk_id": chunk_id,
                "text": chunk,
                "page_number": page["page_number"],
                "source": page["source"],
                "chunk_index": i,
                "total_chunks_in_page": len(chunks)
            })
            chunk_id += 1

    logger.info(f"Created {len(all_chunks)} chunks from {len(pages)} pages")
    return all_chunks