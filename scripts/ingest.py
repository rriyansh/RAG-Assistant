"""
Run this once after adding new PDFs or URLs.
It reads everything, splits into chunks, embeds them,
and saves them in the local vector database.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.utils.config import get_settings
from src.ingestion.pdf_loader import load_all_pdfs
from src.ingestion.web_loader import load_urls_from_file
from src.ingestion.chunker import chunk_pages
from src.embeddings.embedder import embed_texts
from src.embeddings.vector_store import upsert_chunks, reset_collection
from src.utils.logger import setup_logger

BATCH_SIZE = 32


def main() -> None:
    logger = setup_logger("ingest")
    settings = get_settings()

    # ---- 1. Read PDFs ----
    logger.info("Step 1/4: Loading PDFs from data/pdfs/")
    pdf_pages = load_all_pdfs(Path("data/pdfs"))
    logger.info("  -> %d PDF pages loaded", len(pdf_pages))

    # ---- 2. Read web pages from data/urls.txt ----
    logger.info("Step 2/4: Loading web pages from data/urls.txt")
    web_pages = load_urls_from_file("data/urls.txt")
    logger.info("  -> %d web pages loaded", len(web_pages))

    all_pages = pdf_pages + web_pages
    if not all_pages:
        logger.error("Nothing to ingest. Add PDFs or URLs first.")
        return

    # ---- 3. Split into chunks ----
    logger.info("Step 3/4: Splitting into chunks")
    chunks = chunk_pages(
        all_pages,
        settings.chunk_size,
        settings.chunk_overlap,
    )
    logger.info("  -> %d chunks created", len(chunks))

    # ---- 4. Embed + store ----
    logger.info("Step 4/4: Embedding and saving to Chroma")
    reset_collection()
    total_batches = (len(chunks) + BATCH_SIZE - 1) // BATCH_SIZE

    for batch_index in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[batch_index : batch_index + BATCH_SIZE]
        vectors = embed_texts([c.text for c in batch])
        upsert_chunks(batch, vectors)
        logger.info(
            "  Batch %d/%d done",
            batch_index // BATCH_SIZE + 1,
            total_batches,
        )

    logger.info("Ingestion complete.")


if __name__ == "__main__":
    main()
