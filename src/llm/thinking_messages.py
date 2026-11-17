
"""
1000 procedurally generated "thinking" messages.

These appear while the LLM is working, so the user sees motion
instead of a blank spinner. Generated from a cross-product of
50 verbs and 20 scopes = exactly 1000 combinations.

Zero cost, deterministic, no LLM needed. If the user wants fresh
messages from an actual LLM, /thinking/generate calls the LLM
once and caches the result for the session.
"""
import random
from functools import lru_cache

# ---- 50 verbs ----
VERBS = [
    "Reading", "Scanning", "Analyzing", "Reviewing", "Parsing",
    "Indexing", "Searching", "Checking", "Examining", "Comparing",
    "Studying", "Inspecting", "Filtering", "Ranking", "Sorting",
    "Digesting", "Weighing", "Validating", "Cross-referencing",
    "Correlating", "Mapping", "Tracing", "Following", "Exploring",
    "Navigating", "Skimming", "Absorbing", "Ingesting", "Extracting",
    "Pulling", "Fetching", "Gathering", "Collecting", "Assembling",
    "Grouping", "Clustering", "Organizing", "Structuring",
    "Reconstructing", "Decoding", "Interpreting", "Translating",
    "Understanding", "Comprehending", "Learning from",
    "Re-reading", "Re-checking", "Double-checking", "Verifying",
    "Synthesizing",
]

# ---- 20 scopes ----
SCOPES = [
    "your documents", "the PDFs", "the source files", "the context",
    "matching passages", "citations", "relevant chunks", "key facts",
    "prior answers", "the vector store", "the web results",
    "live sources", "academic notes", "technical sections",
    "policy text", "meeting notes", "research material",
    "reference sections", "the evidence", "the corpus",
]

# ---- optional suffixes for variety when repeated ----
SUFFIXES = [
    "", "", "", "",                      # most have no suffix
    " hold on…",
    " one moment…",
    " almost there…",
    " finding the best match…",
]


def _build_pool() -> list[str]:
    """
    50 verbs × 20 scopes × 1 suffix = 1000 messages.
    Then suffix variants are added by the caller if needed.
    """
    pool: list[str] = []
    for verb in VERBS:
        for scope in SCOPES:
            pool.append(f"{verb} {scope}…")
    return pool


_POOL: list[str] = _build_pool()
assert len(_POOL) == 1000, f"Expected 1000, got {len(_POOL)}"


@lru_cache(maxsize=1)
def _rng() -> random.Random:
    """Seeded RNG so each call-site gets a reproducible shuffle."""
    return random.Random(2026)


def random_messages(count: int = 20) -> list[str]:
    """
    Return `count` unique messages from the pool, freshly shuffled.
    If `count` > 1000, suffixes kick in so we never run dry.
    """
    rng = _rng()
    if count <= 1000:
        return rng.sample(_POOL, count)

    out: list[str] = list(_POOL)
    rng.shuffle(out)
    while len(out) < count:
        base = rng.choice(_POOL)
        suffix = rng.choice(SUFFIXES)
        out.append(base.replace("…", suffix or "…"))
    return out[:count]


# ============================================================
# Optional: ask an LLM to generate fresh messages (used by
# POST /thinking/generate). Cached per-process so we only pay
# for it once.
# ============================================================
_LLM_CACHE: list[str] = []


def generate_with_llm(llm, count: int = 20) -> list[str]:
    """
    Call the LLM once to produce `count` fresh thinking messages.
    Cached in-memory for the life of the process.
    """
    global _LLM_CACHE
    if _LLM_CACHE:
        return _LLM_CACHE

    prompt = [
        {
            "role": "system",
            "content": (
                "You write short, calm status messages shown to users "
                "while an AI is thinking. Each message is 3-6 words, "
                "ends with an ellipsis, and describes a research action "
                "(reading, searching, checking, comparing). "
                "Reply with a JSON array of strings only — no prose."
            ),
        },
        {
            "role": "user",
            "content": f"Generate exactly {count} unique status messages.",
        },
    ]

    try:
        import json
        raw = llm.generate(prompt, temperature=0.9)
        # Strip potential markdown fences.
        raw = raw.strip().strip("`")
        if raw.startswith("json"):
            raw = raw[4:].strip()
        parsed = json.loads(raw)
        if isinstance(parsed, list) and all(isinstance(x, str) for x in parsed):
            _LLM_CACHE = [str(x) for x in parsed][:count]
            return _LLM_CACHE
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning("LLM message generation failed: %s", exc)

    # Fallback to procedural if the LLM didn't cooperate.
    return random_messages(count)
