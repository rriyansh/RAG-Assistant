"""CLI query interface for SecureDoc AI."""

import argparse
import logging
import sys
import requests
import json

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser(description="Query SecureDoc AI")
    parser.add_argument("query", type=str, help="Question to ask")
    parser.add_argument(
        "--api-url",
        type=str,
        default="http://localhost:8000",
        help="API base URL"
    )
    parser.add_argument(
        "--top-k",
        type=int,
        default=8,
        help="Number of results to retrieve"
    )
    parser.add_argument(
        "--no-reranker",
        action="store_true",
        help="Disable reranker"
    )
    parser.add_argument(
        "--no-web-search",
        action="store_true",
        help="Disable web search"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output as JSON"
    )
    args = parser.parse_args()

    try:
        response = requests.post(
            f"{args.api_url}/query",
            json={
                "query": args.query,
                "top_k": args.top_k,
                "use_reranker": not args.no_reranker,
                "use_web_search": not args.no_web_search
            },
            timeout=60
        )
        response.raise_for_status()
        result = response.json()

        if args.json:
            print(json.dumps(result, indent=2))
        else:
            print("\n" + "=" * 60)
            print("ANSWER:")
            print("=" * 60)
            print(result.get("answer", "No answer"))

            if result.get("sources"):
                print("\n" + "-" * 60)
                print("SOURCES:")
                print("-" * 60)
                for i, src in enumerate(result["sources"], 1):
                    print(f"\n{i}. {src['source']} (page {src['page']}) - Score: {src['score']:.3f}")
                    print(f"   {src['text_preview']}")

            if result.get("web_search_used") and result.get("web_results"):
                print("\n" + "-" * 60)
                print("WEB SEARCH RESULTS:")
                print("-" * 60)
                for i, wr in enumerate(result["web_results"], 1):
                    print(f"\n{i}. {wr['title']}")
                    print(f"   URL: {wr['url']}")
                    print(f"   {wr['content'][:200]}...")

    except requests.exceptions.ConnectionError:
        logger.error(f"Cannot connect to API at {args.api_url}")
        logger.error("Make sure the API server is running: uvicorn src.api.main:app --reload")
        sys.exit(1)
    except requests.exceptions.Timeout:
        logger.error("Request timed out")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Query failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()