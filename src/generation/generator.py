from src.llm.factory import create_llm
from src.generation.prompt_builder import build_prompt
from src.retrieval.retriever import RetrievedChunk


def generate_answer(
    question: str,
    chunks: list[RetrievedChunk],
    assistant_name: str = "RAG Assistant",
    temperature: float = 0.2,
) -> str:
    llm = create_llm()
    messages = build_prompt(question, chunks, assistant_name)
    return llm.generate(messages, temperature=temperature)
