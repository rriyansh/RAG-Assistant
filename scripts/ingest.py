"""Ingestion script to build the vector index from PDFs."""

import argparse
import logging
import sys
from pathlib import Path

from src.ingestion.pdf_loader import load_pdfs_from_directory
from src.ingestion.cleaner import clean_pages
from src.ingestion.chunker import chunk_pages
from src.embeddings.embedder import Embedder, EmbedderSettings
from src.embeddings.vector_store import VectorStore, VectorStoreSettings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser(description="Ingest PDFs into vector store")
    parser.add_argument(
        "--pdf-dir",
        type=str,
        default="./data/pdfs",
        help="Directory containing PDF files"
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=400,
        help="Target token size per chunk"
    )
    parser.add_argument(
        "--chunk-overlap",
        type=int,
        default=50,
        help="Overlap tokens between chunks"
    )
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Clear existing collection before ingesting"
    )
    args = parser.parse_args()

    pdf_dir = Path(args.pdf_dir)
    if not pdf_dir.exists():
        logger.error(f"PDF directory not found: {pdf_dir}")
        sys.exit(1)

    # Initialize components
    embedder_settings = EmbedderSettings()
    vector_store_settings = VectorStoreSettings()

    embedder = Embedder(embedder_settings)
    vector_store = VectorStore(vector_store_settings)

    if args.clear:
        logger.info("Clearing existing collection...")
        vector_store.clear_collection()

    # Load and process PDFs
    logger.info(f"Loading PDFs from {pdf_dir}")
    pages = load_pdfs_from_directory(pdf_dir)

    if not pages:
        logger.warning("No PDF pages found")
        return

    logger.info(f"Loaded {len(pages)} pages")

    # Clean text
    pages = clean_pages(pages)
    logger.info(f"Cleaned to {len(pages)} pages")

    # Chunk
    chunks = chunk_pages(pages, args.chunk_size, args.chunk_overlap)
    logger.info(f"Created {len(chunks)} chunks")

    # Generate embeddings
    logger.info("Generating embeddings...")
    texts = [c["text"] for c in chunks]
    embeddings = embedder.embed_texts(texts)

    if not embeddings:
        logger.error("Failed to generate embeddings")
        sys.exit(1)

    # Store in vector DB
    logger.info("Storing in vector database...")
    vector_store.add_chunks(chunks, embeddings)

    stats = vector_store.get_collection_stats()
    logger.info(f"Ingestion complete! Total chunks in store: {stats['total_chunks']}")


if __name__ == "__main__":
    main()