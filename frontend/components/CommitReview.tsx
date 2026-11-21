"use client";

import { useState } from "react";
import type { FileReview } from "@/lib/types";

export function CommitReview({ review }: { review: FileReview }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ sha: string; url: string }>();
  async function commit() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/github/commit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(review),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Commit failed.");
      setResult(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Commit failed."); }
    finally { setBusy(false); }
  }
  return <section className="my-3 min-w-0 space-y-2 border-y border-white/15 py-3 text-sm">
    <h3 className="font-semibold">Review GitHub change</h3>
    <code>POST /api/github/commit</code>
    <details><summary>Exact commit parameters</summary><pre className="overflow-auto">{JSON.stringify(review, null, 2)}</pre></details>
    <p className="break-all">{review.repo} · {review.branch} · {review.path}</p>
    <p>{review.message}</p>
    <pre className="max-h-64 overflow-auto rounded-lg bg-black/30 p-3 text-xs">{review.diff || review.content}</pre>
    {result ? <a href={result.url} target="_blank" rel="noreferrer" className="underline">View commit {result.sha.slice(0,7)}</a> :
      <button disabled={busy} onClick={commit} className="rounded-lg bg-white px-3 py-2 font-semibold text-black disabled:opacity-50">{busy ? "Committing…" : "Commit this change"}</button>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
