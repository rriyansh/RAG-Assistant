"""
Reads every PDF in data/pdfs/ and returns one Page object per page.
Keeps the file name and page number so the LLM can cite them later.
"""
from dataclasses import dataclass
from pathlib import Path
from pypdf import PdfReader
from src.utils.logger import setup_logger
import subprocess
import tempfile

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
        if not text.strip():
            with tempfile.TemporaryDirectory() as directory:
                prefix = Path(directory) / "page"
                try:
                    subprocess.run(["pdftoppm", "-f", str(i), "-singlefile", "-png", str(path), str(prefix)], check=True, capture_output=True, timeout=30)
                    result = subprocess.run(["tesseract", f"{prefix}.png", "stdout"], check=True, capture_output=True, text=True, timeout=30)
                    text = result.stdout
                except (OSError, subprocess.SubprocessError):
                    logger.warning("OCR unavailable for %s page %d", path.name, i)
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
