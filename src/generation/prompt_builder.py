"""
Context is wrapped in XML-style tags so the LLM never confuses
the user's question with the document text — a common cause of
"hallucinated" answers in older RAG systems.
"""
from src.retrieval.retriever import RetrievedChunk

SYSTEM_PROMPT = (
    "You are a careful research assistant. Answer using ONLY the "
    "content inside <context> tags. If the answer is not there, say "
    "so plainly. Never invent facts.\n\n"
    "Citation format (exact):\n"
    "  PDF source: [document.pdf, page N]\n"
    "  Web source: [Title | https://full-url]\n\n"
    "Every factual sentence must end with a citation. Keep answers "
    "concise — 2 to 6 sentences unless the user asks for detail."
)


def _label(chunk: RetrievedChunk) -> str:
    if chunk.source_type == "pdf":
        return f"{chunk.doc_name} (page {chunk.page_number})"
    url = chunk.chunk_id.split("::")[-1]
    return f"{chunk.doc_name} | {url}"


def build_prompt(question: str, chunks: list[RetrievedChunk]) -> list[dict]:
    if not chunks:
        context = "<context>\n(empty — no relevant sources found)\n</context>"
    else:
        pieces = []
        for i, c in enumerate(chunks, start=1):
            pieces.append(
                f"  <chunk id=\"{i}\" source=\"{_label(c)}\">\n"
                f"    {c.text.strip()}\n"
                f"  </chunk>"
            )
        context = "<context>\n" + "\n".join(pieces) + "\n</context>"

    user_message = (
        f"{context}\n\n"
        f"<question>{question}</question>\n\n"
        "Answer now, citing each fact."
    )
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_message},
    ]
