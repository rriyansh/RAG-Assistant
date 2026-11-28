"""Evaluate retrieval and generation quality against a checked-in golden set."""
from __future__ import annotations
import argparse, json, re, sys
from pathlib import Path
from typing import Any
import requests

def load_golden_questions(path: Path) -> list[dict[str, Any]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return data.get("questions", []) if isinstance(data, dict) else data

def _terms(value: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", value.lower()))

def answer_overlap(expected: str, actual: str) -> float:
    terms = _terms(expected)
    return len(terms & _terms(actual)) / len(terms) if terms else 0.0

def retrieval_scores(relevant_docs: list[str], citations: list[dict[str, Any]], k: int) -> tuple[float, float]:
    expected = {item.lower() for item in relevant_docs}
    ranked = [str(c.get("source") or c.get("title") or c.get("document") or "").lower() for c in citations[:k]]
    if not expected:
        return 1.0, 1.0
    return len(expected.intersection(ranked)) / len(expected), next((1.0 / i for i, value in enumerate(ranked, 1) if value in expected), 0.0)

def faithfulness(answer: str, citations: list[dict[str, Any]]) -> float:
    evidence = _terms(" ".join(str(c.get("text") or c.get("content") or "") for c in citations))
    terms = _terms(answer)
    if not terms:
        return 0.0
    if not evidence:
        return 1.0 if not citations else 0.0
    return len(terms & evidence) / len(terms)

def call_stream(api_url: str, question: str, timeout: float = 90.0) -> dict[str, Any]:
    parts: list[str] = []
    citations: list[dict[str, Any]] = []
    with requests.post(f"{api_url.rstrip('/')}/ask/stream", json={"question": question}, headers={"Accept": "application/x-ndjson"}, stream=True, timeout=timeout) as response:
        response.raise_for_status()
        for line in response.iter_lines(decode_unicode=True):
            if not line:
                continue
            event = json.loads(line)
            if event.get("type") in {"token", "delta"}:
                parts.append(str(event.get("content") or event.get("text") or ""))
            elif event.get("type") == "answer":
                parts = [str(event.get("answer") or event.get("content") or "")]
            if event.get("citations"):
                citations = list(event["citations"])
            if event.get("type") == "error":
                raise RuntimeError(str(event.get("message") or "stream failed"))
    return {"answer": "".join(parts), "citations": citations}

def run_evaluation(questions: list[dict[str, Any]], api_url: str, top_k: int) -> dict[str, Any]:
    results = []
    for item in questions:
        response = call_stream(api_url, item["question"])
        recall, mrr = retrieval_scores(item.get("relevant_docs", []), response["citations"], top_k)
        scores = {"recall_at_k": recall, "mrr": mrr, "faithfulness": faithfulness(response["answer"], response["citations"]), "answer_overlap": answer_overlap(item["answer"], response["answer"])}
        results.append({**item, "actual": response["answer"], "citations": response["citations"], "scores": scores})
    names = ("recall_at_k", "mrr", "faithfulness", "answer_overlap")
    summary = {name: sum(r["scores"][name] for r in results) / len(results) for name in names} if results else {name: 0.0 for name in names}
    return {"summary": summary, "results": results}

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--golden-file", default="data/eval/golden_questions.json")
    parser.add_argument("--api-url", default="http://localhost:8000")
    parser.add_argument("--output", default="data/eval/results.json")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--top-k", type=int, default=8)
    parser.add_argument("--min-recall", type=float, default=0.5)
    parser.add_argument("--min-mrr", type=float, default=0.4)
    parser.add_argument("--min-faithfulness", type=float, default=0.4)
    args = parser.parse_args()
    questions = load_golden_questions(Path(args.golden_file))
    if args.limit:
        questions = questions[:args.limit]
    if not questions:
        return 1
    try:
        report = run_evaluation(questions, args.api_url, args.top_k)
    except (requests.RequestException, RuntimeError, ValueError, json.JSONDecodeError) as exc:
        report = {"summary": {}, "results": [], "error": str(exc)}
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    summary = report.get("summary", {})
    return 0 if summary.get("recall_at_k", 0) >= args.min_recall and summary.get("mrr", 0) >= args.min_mrr and summary.get("faithfulness", 0) >= args.min_faithfulness else 2

if __name__ == "__main__":
    sys.exit(main())
