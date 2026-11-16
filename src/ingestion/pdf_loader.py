"""
Reads every PDF in data/pdfs/ and returns one Page object per page.
Keeps the file name and page number so the LLM can cite them later.
"""
from dataclasses import dataclass
from pathlib import Path
from pypdf import PdfReader
from src.utils.logger import setup_logger

logger = setup_logger(__name__)


@dataclass
class Page:
    doc_name: str
    page_number: int   # 1-indexed
    text: str
    source_type: str = "pdf"   # "pdf" | "web"


def load_pdf(path: Path) -> list[Page]:
    reader = PdfReader(str(path))
    pages: list[Page] = []
    for i, raw_page in enumerate(reader.pages, start=1):
        text = raw_page.extract_text() or ""
        if text.strip():
            pages.append(
                Page(doc_name=path.name, page_number=i, text=text)
            )
    return pages


def load_all_pdfs(pdf_dir: Path) -> list[Page]:
    pages: list[Page] = []
    pdfs = sorted(pdf_dir.glob("*.pdf"))
    if not pdfs:
        logger.warning("No PDFs found in %s", pdf_dir)
        return pages
    for pdf in pdfs:
        try:
            pages.extend(load_pdf(pdf))
            logger.info("Loaded PDF: %s", pdf.name)
        except Exception as exc:
            logger.exception("Failed to load %s: %s", pdf.name, exc)
    return pages
