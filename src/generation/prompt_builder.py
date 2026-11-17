from src.retrieval.retriever import RetrievedChunk

SYSTEM_TEMPLATE = (
    "You are {assistant_name}, a careful research assistant. Answer using ONLY "
    "the content inside <context> tags. If the answer is not there, say so "
    "plainly. Never invent facts.\n\n"
    "Citation format (exact):\n"
    "  PDF source: [document.pdf, page N]\n"
    "  Web source: [Title | https://full-url]\n\n"
    "Style rules:\n"
    "- Every factual sentence ends with a citation.\n"
    "- Be concise. No preamble. No filler.\n"
    "- 2-6 sentences unless the user asks for detail.\n"
    "- Bullet lists are fine when the user asks for items.\n"
    "- If the user asks your name, answer with your name only."
)


def _label(chunk: RetrievedChunk) -> str:
    if chunk.source_type == "pdf":
        return f"{chunk.doc_name} (page {chunk.page_number})"
    url = chunk.chunk_id.split("::")[-1]
    return f"{chunk.doc_name} | {url}"


def build_prompt(
    question: str,
    chunks: list[RetrievedChunk],
    assistant_name: str = "RAG Assistant",
) -> list[dict]:
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
        {"role": "system", "content": SYSTEM_TEMPLATE.format(assistant_name=assistant_name)},
        {"role": "user", "content": user_message},
    ]
