
"""
Extracts citations from the LLM's answer and builds a clean
list of sources for the API response.
"""
import re
from dataclasses import dataclass
from src.retrieval.retriever import RetrievedChunk


@dataclass
class Citation:
    doc_name: str
    page_number: int
    source_type: str
    url: str = ""


# Matches "[doc.pdf, page 3]" and "[Some Title | https://...]"
_PDF_CITATION = re.compile(r"\[([^\[\]]+?),\s*page\s*(\d+)\]", re.IGNORECASE)
_WEB_CITATION = re.compile(r"\[([^\[\]]+?)\s*\|\s*(https?://[^\]]+)\]")


def extract_citations(answer: str) -> list[Citation]:
    found: list[Citation] = []

    for match in _PDF_CITATION.finditer(answer):
        found.append(
            Citation(
                doc_name=match.group(1).strip(),
                page_number=int(match.group(2)),
                source_type="pdf",
            )
        )

    for match in _WEB_CITATION.finditer(answer):
        found.append(
            Citation(
                doc_name=match.group(1).strip(),
                page_number=1,
                source_type="web",
                url=match.group(2).strip(),
            )
        )

    return found


def collect_sources(chunks: list[RetrievedChunk]) -> list[dict]:
    """Build the `sources` array the frontend shows under the answer."""
    return [
        {
            "doc_name": c.doc_name,
            "page_number": c.page_number,
            "source_type": c.source_type,
            "score": round(c.score, 4),
        }
        for c in chunks
    ]
