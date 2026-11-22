import csv
import io
import zipfile
from pathlib import PurePath

from docx import Document
from fastapi import HTTPException
from openpyxl import load_workbook
from pypdf import PdfReader

LIMIT = 2_000_000


def extract(name: str, content: bytes) -> str:
    suffix = PurePath(name).suffix.lower()
    if suffix in {".docx", ".xlsx"}:
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            entries = archive.infolist()
            if len(entries) > 2048 or sum(item.file_size for item in entries) > 12_000_000:
                raise ValueError("Office file expands beyond import limits")
    stream = io.BytesIO(content)
    if suffix == ".pdf":
        pdf = PdfReader(stream)
        if pdf.is_encrypted or len(pdf.pages) > 250:
            raise ValueError("Choose an unencrypted PDF with at most 250 pages")
        lines = (page.extract_text() or "" for page in pdf.pages)
    elif suffix == ".docx":
        doc = Document(stream)
        lines = [p.text for p in doc.paragraphs]
        lines.extend(" | ".join(c.text for c in row.cells) for table in doc.tables for row in table.rows)
    elif suffix == ".xlsx":
        book = load_workbook(stream, read_only=True, data_only=True)
        try:
            lines = []
            length = 0
            for sheet in book:
                if (sheet.max_column or 0) > 256 or (sheet.max_row or 0) > 20000:
                    raise ValueError("Sheet exceeds import limits")
                lines.append(sheet.title)
                for row in sheet.values:
                    line = " | ".join(str(cell) if cell is not None else "" for cell in row)
                    length += len(line) + 1
                    if length > LIMIT:
                        raise ValueError("Extracted text exceeds import limits")
                    lines.append(line)
        finally:
            book.close()
    elif suffix in {".md", ".txt", ".csv"}:
        text = content.decode("utf-8-sig")
        lines = (" | ".join(row) for row in csv.reader(io.StringIO(text))) if suffix == ".csv" else [text]
    else:
        raise HTTPException(415, "Unsupported document format")
    result = io.StringIO()
    for line in lines:
        if result.tell() + len(line) + 1 > LIMIT:
            raise ValueError("Extracted text exceeds import limits")
        result.write(line + "\n")
    text = result.getvalue().strip()
    if not text:
        raise ValueError("Document contains no extractable text")
    return text
