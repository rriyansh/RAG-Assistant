"""Text cleaning module."""

import re
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


def clean_text(text: str) -> str:
    """Clean extracted text by removing artifacts.

    Args:
        text: Raw text from PDF extraction.

    Returns:
        Cleaned text.
    """
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text)
    # Remove page numbers and headers/footers patterns
    text = re.sub(r'\n\s*\d+\s*\n', '\n', text)
    # Remove control characters while preserving Unicode scripts.
    text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', text)
    # Remove multiple newlines
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def clean_pages(pages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Clean a list of page dictionaries.

    Args:
        pages: List of page dicts with 'text' key.

    Returns:
        List of cleaned page dicts.
    """
    cleaned = []
    for page in pages:
        cleaned_text = clean_text(page["text"])
        if cleaned_text:
            cleaned_page = page.copy()
            cleaned_page["text"] = cleaned_text
            cleaned.append(cleaned_page)
    logger.info(f"Cleaned {len(cleaned)} pages (removed {len(pages) - len(cleaned)} empty)")
    return cleaned
