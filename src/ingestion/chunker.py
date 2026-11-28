"""
Splits long text into smaller pieces ("chunks") so we can
search them individually. Each chunk remembers where it came from.
"""
import tiktoken
from dataclasses import dataclass
from src.ingestion.pdf_loader import Page
from src.ingestion.cleaner import clean_text

def _encoder():
    settings = __import__("src.utils.config", fromlist=["get_settings"]).get_settings()
    return tiktoken.get_encoding("cl100k_base" if settings.embedding_provider == "openai" else "o200k_base")


@dataclass
class Chunk:
    chunk_id: str
    doc_name: str
    page_number: int
    source_type: str        # "pdf" or "web"
    text: str


def chunk_page(page: Page, size: int, overlap: int) -> list[Chunk]:
    text = clean_text(page.text)
    if not text:
        return []

    encoder = _encoder()
    tokens = encoder.encode(text)
    chunks: list[Chunk] = []
    start = 0
    index = 0
    step = max(1, size - overlap)

    while start < len(tokens):
        end = min(start + size, len(tokens))
        piece = encoder.decode(tokens[start:end]).strip()
        if piece:
            chunks.append(
                Chunk(
                    chunk_id=f"{page.doc_name}::p{page.page_number}::c{index}",
                    doc_name=page.doc_name,
                    page_number=page.page_number,
                    source_type=page.source_type,
                    text=piece,
                )
            )
            index += 1
        if end == len(tokens):
            break
        start += step

    return chunks


def chunk_pages(pages: list[Page], size: int, overlap: int) -> list[Chunk]:
    all_chunks: list[Chunk] = []
    for page in pages:
        all_chunks.extend(chunk_page(page, size, overlap))
    return all_chunks
