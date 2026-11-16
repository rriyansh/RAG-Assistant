"""
One function that runs the whole generation step:
    chunks -> prompt -> LLM -> answer text
"""
from src.llm.factory import create_llm
from src.generation.prompt_builder import build_prompt
from src.retrieval.retriever import RetrievedChunk


def generate_answer(
    question: str,
    chunks: list[RetrievedChunk],
    temperature: float = 0.2,
) -> str:
    llm = create_llm()
    messages = build_prompt(question, chunks)
    return llm.generate(messages, temperature=temperature)
