import sys
import argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.retrieval.hybrid_retriever import hybrid_retrieve
from src.generation.generator import generate_answer
from src.generation.answer_parser import collect_sources


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("question", type=str)
    args = parser.parse_args()

    chunks, used_web = hybrid_retrieve(args.question)
    if not chunks:
        print("No relevant chunks found.")
        return

    print("\n=== Answer ===")
    print(generate_answer(args.question, chunks))

    print("\n=== Sources ===")
    for src in collect_sources(chunks):
        tag = "WEB" if src["source_type"] == "web" else "PDF"
        print(
            f"- [{tag}] {src['doc_name']} "
            f"(page {src['page_number']}, score {src['score']})"
        )

    if used_web:
        print("\n(live web search was used)")


if __name__ == "__main__":
    main()
