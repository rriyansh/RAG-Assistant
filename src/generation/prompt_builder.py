"""
Turns the retrieved chunks + the user's question into a prompt
the LLM can answer. Citations are clearly labelled:
    - PDF chunks  → [doc.pdf, page 3]
    - Web chunks  → [title | url]
"""
from src.retrieval.retriever import RetrievedChunk

SYSTEM_PROMPT = (
    "You are a careful research assistant. Answer the user's question "
    "using ONLY the provided context. If the context does not contain "
    "the answer, say so explicitly — do not guess. "
    "Cite your sources inline using the exact format shown in the context:\n"
    "  - For PDFs:  [document name, page N]\n"
    "  - For web:   [page title | full URL]\n"
    "End every factual sentence with a citation."
)


def build_prompt(
    question: str,
    chunks: list[RetrievedChunk],
) -> list[dict]:
    """Return an OpenAI-style messages list."""

    if not chunks:
        context_block = "(no relevant context was found)"
    else:
        pieces: list[str] = []
        for index, chunk in enumerate(chunks, start=1):
            if chunk.source_type == "pdf":
                label = f"{chunk.doc_name} (page {chunk.page_number})"
            else:
                label = f"{chunk.doc_name} | {chunk.chunk_id.split('::')[-1]}"

            pieces.append(
                f"[{index}] Source: {label}\n"
                f"{chunk.text}"
            )
        context_block = "\n\n".join(pieces)

    user_message = (
        f"Context:\n{context_block}\n\n"
        f"Question: {question}\n\n"
        "Answer in a helpful, concise way. Cite every fact."
    )

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_message},
    ]
