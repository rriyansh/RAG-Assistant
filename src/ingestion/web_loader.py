"""
Fetches web pages and turns them into clean text.

Two ways a web page gets into our system:
  1. You give a fixed list of URLs in data/urls.txt → run ingest.py
  2. The user asks a live question → web_search.py fetches results
     and this loader extracts the page body.

trafilatura is used because it strips menus, ads, footers and keeps
only the main article — exactly what a RAG chunker wants.
"""
import requests
import trafilatura
from dataclasses import dataclass
from src.ingestion.pdf_loader import Page
from src.utils.logger import setup_logger

logger = setup_logger(__name__)

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/122.0 Safari/537.36"
)


def fetch_page_text(url: str, timeout: int = 15) -> str:
    """
    Download a URL and return only the article text.
    Returns "" if the page cannot be read.
    """
    try:
        response = requests.get(
            url,
            headers={"User-Agent": USER_AGENT},
            timeout=timeout,
        )
        response.raise_for_status()
        # trafilatura wants the raw HTML string
        extracted = trafilatura.extract(
            response.text,
            include_comments=False,
            include_tables=True,
            favor_precision=True,
        )
        return extracted or ""
    except Exception as exc:
        logger.warning("Could not fetch %s: %s", url, exc)
        return ""


def load_web_page(url: str) -> list[Page]:
    """
    Turn one URL into a single Page (web pages do not have
    real page numbers, so we use page_number=1).
    """
    text = fetch_page_text(url)
    if not text.strip():
        return []
    return [
        Page(
            doc_name=url,          # we store the full URL as the source name
            page_number=1,
            text=text,
            source_type="web",
        )
    ]


def load_urls_from_file(file_path) -> list[Page]:
    """
    Read data/urls.txt — one URL per line, # for comments.
    """
    from pathlib import Path

    path = Path(file_path)
    if not path.exists():
        return []

    pages: list[Page] = []
    for line in path.read_text().splitlines():
        url = line.strip()
        if not url or url.startswith("#"):
            continue
        pages.extend(load_web_page(url))
        logger.info("Loaded web page: %s", url)
    return pages
