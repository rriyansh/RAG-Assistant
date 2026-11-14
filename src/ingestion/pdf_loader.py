"""PDF text extraction module."""

import logging
from pathlib import Path
from typing import List, Dict, Any
import pypdf

logger = logging.getLogger(__name__)


def extract_text_from_pdf(pdf_path: Path) -> List[Dict[str, Any]]:
    """Extract text from a PDF file with page numbers.

    Args:
        pdf_path: Path to the PDF file.

    Returns:
        List of dictionaries containing page_number and text.
    """
    pages = []
    try:
        with open(pdf_path, "rb") as f:
            reader = pypdf.PdfReader(f)
            for page_num, page in enumerate(reader.pages, start=1):
                text = page.extract_text()
                if text and text.strip():
                    pages.append({
                        "page_number": page_num,
                        "text": text.strip(),
                        "source": pdf_path.name
                    })
        logger.info(f"Extracted {len(pages)} pages from {pdf_path.name}")
    except Exception as e:
        logger.error(f"Failed to extract text from {pdf_path}: {e}")
        raise
    return pages


def load_pdfs_from_directory(pdf_dir: Path) -> List[Dict[str, Any]]:
    """Load all PDFs from a directory.

    Args:
        pdf_dir: Directory containing PDF files.

    Returns:
        List of page dictionaries from all PDFs.
    """
    all_pages = []
    pdf_files = list(pdf_dir.glob("*.pdf"))
    logger.info(f"Found {len(pdf_files)} PDF files in {pdf_dir}")

    for pdf_file in pdf_files:
        pages = extract_text_from_pdf(pdf_file)
        all_pages.extend(pages)

    return all_pages