"""Evaluation script to score against golden questions."""

import argparse
import json
import logging
import sys
from pathlib import Path
from typing import List, Dict, Any

import requests

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def load_golden_questions(path: Path) -> List[Dict[str, Any]]:
    """Load golden questions from JSON file."""
    if not path.exists():
        logger.warning(f"Golden questions file not found: {path}")
        return []

    with open(path) as f:
        data = json.load(f)

    # Support both list and dict with "questions" key
    if isinstance(data, dict):
        return data.get("questions", [])
    return data


def evaluate_answer(
    query: str,
    expected: str,
    actual: str,
    api_url: str
) -> Dict[str, Any]:
    """Evaluate answer quality using LLM-as-judge via API."""
    eval_prompt = f"""Compare the expected and actual answers for the given question.
Rate the actual answer on a scale of 1-5 for:
1. Accuracy - Does it correctly answer the question?
2. Completeness - Does it cover all important points?
3. Relevance - Is it relevant to the question?

Question: {query}
Expected: {expected}
Actual: {actual}

Return only a JSON object: {{"accuracy": X, "completeness": Y, "relevance": Z, "overall": W}}"""

    try:
        # Use the API's query endpoint with a special evaluation prompt
        response = requests.post(
            f"{api_url}/query",
            json={
                "query": eval_prompt,
                "top_k": 1,
                "use_reranker": False,
                "use_web_search": False
            },
            timeout=30
        )
        if response.status_code == 200:
            result = response.json()
            answer = result.get("answer", "{}")
            # Try to parse JSON from answer
            try:
                return json.loads(answer)
            except json.JSONDecodeError:
                pass
    except Exception as e:
        logger.warning(f"LLM evaluation failed: {e}")

    # Fallback: simple string matching
    expected_lower = expected.lower()
    actual_lower = actual.lower()
    overlap = len(set(expected_lower.split()) & set(actual_lower.split()))
    total_expected = len(set(expected_lower.split()))

    if total_expected == 0:
        score = 0
    else:
        score = min(5, max(1, int(overlap / total_expected * 5)))

    return {
        "accuracy": score,
        "completeness": score,
        "relevance": score,
        "overall": score
    }


def main():
    parser = argparse.ArgumentParser(description="Evaluate RAG system against golden questions")
    parser.add_argument(
        "--golden-file",
        type=str,
        default="./data/eval/golden_questions.json",
        help="Path to golden questions JSON"
    )
    parser.add_argument(
        "--api-url",
        type=str,
        default="http://localhost:8000",
        help="API base URL"
    )
    parser.add_argument(
        "--output",
        type=str,
        default="./data/eval/results.json",
        help="Output file for results"
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Limit number of questions to evaluate (0 = all)"
    )
    args = parser.parse_args()

    golden_path = Path(args.golden_file)
    questions = load_golden_questions(golden_path)

    if not questions:
        logger.error("No questions to evaluate")
        sys.exit(1)

    if args.limit > 0:
        questions = questions[:args.limit]

    logger.info(f"Evaluating {len(questions)} questions...")

    results = []
    total_scores = {"accuracy": 0, "completeness": 0, "relevance": 0, "overall": 0}

    for i, q in enumerate(questions, 1):
        query = q.get("question", "")
        expected = q.get("answer", "")

        if not query or not expected:
            logger.warning(f"Skipping question {i}: missing fields")
            continue

        logger.info(f"[{i}/{len(questions)}] {query[:60]}...")

        try:
            response = requests.post(
                f"{args.api_url}/query",
                json={
                    "query": query,
                    "top_k": 8,
                    "use_reranker": True,
                    "use_web_search": False
                },
                timeout=60
            )
            response.raise_for_status()
            result = response.json()
            actual = result.get("answer", "")

        except Exception as e:
            logger.error(f"Query failed: {e}")
            actual = f"ERROR: {e}"

        scores = evaluate_answer(query, expected, actual, args.api_url)

        for k in total_scores:
            total_scores[k] += scores.get(k, 0)

        results.append({
            "question": query,
            "expected": expected,
            "actual": actual,
            "scores": scores
        })

        logger.info(f"  Scores: {scores}")

    # Calculate averages
    n = len(results)
    if n > 0:
        avg_scores = {k: v / n for k, v in total_scores.items()}
        logger.info(f"\n=== AVERAGE SCORES ({n} questions) ===")
        for k, v in avg_scores.items():
            logger.info(f"  {k.capitalize()}: {v:.2f}/5.0")

    # Save results
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w") as f:
        json.dump({
            "summary": {k: v / n if n > 0 else 0 for k, v in total_scores.items()},
            "results": results
        }, f, indent=2)

    logger.info(f"Results saved to {output_path}")


if __name__ == "__main__":
    main()