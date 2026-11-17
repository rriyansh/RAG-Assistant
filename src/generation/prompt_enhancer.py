"""
Turns a short request into a sharper, more actionable prompt.
Uses the active LLM. Falls back to the original text on any error
so the user never gets a broken answer because enhancement failed.
"""
from src.llm.factory import create_llm

_SYSTEM = (
    "You are a prompt engineer. Rewrite the user's request into a "
    "clearer, more actionable prompt.\n\n"
    "Rules:\n"
    "- Preserve the original intent. Never change the subject.\n"
    "- If the request is a build/create/make task, add a helpful role "
    "  (for example 'Act as a senior frontend developer') and 1-2 "
    "  constraints that would matter (performance, accessibility, "
    "  browser support).\n"
    "- If the request is a simple question, keep it short.\n"
    "- Return ONLY the rewritten prompt. No explanations, no quotes, "
    "  no markdown fences."
)


def enhance_prompt(raw: str) -> str:
    text = (raw or "").strip()
    if not text:
        return raw

    try:
        llm = create_llm()
        out = llm.generate(
            [
                {"role": "system", "content": _SYSTEM},
                {"role": "user", "content": text},
            ],
            temperature=0.3,
        )
        cleaned = out.strip().strip('"').strip("'").strip("`").strip()
        return cleaned or text
    except Exception:
        # Enhancement is a nice-to-have. Never fail the user's request.
        return text
