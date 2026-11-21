"use client";

import { useState } from "react";

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [status, setStatus] = useState("Copy code");
  return <figure className="my-3 min-w-0 overflow-hidden rounded-lg border border-white/15 bg-[#17171b]">
    <figcaption className="flex items-center justify-between gap-4 border-b border-white/10 px-3 py-1 text-xs">
      <span>{language || "Code"}</span>
      <button type="button" onClick={async () => {
        try { await navigator.clipboard.writeText(code); setStatus("Copied"); }
        catch { setStatus("Select code to copy"); }
      }}>{status}</button>
    </figcaption>
    <pre className="overflow-x-auto whitespace-pre p-3 text-left text-sm"><code>{code}</code></pre>
  </figure>;
}

export function MessageBody({ text }: { text: string }) {
  const nodes = [];
  const fences = /^ {0,3}(`{3,}|~{3,})([^\r\n]*)\r?\n([\s\S]*?)^ {0,3}\1[ \t]*(?=\r?$)/gm;
  let cursor = 0;
  function prose(value: string) {
    return value.split(/(\*\*[^*\n]+\*\*|`[^`\n]+`)/g).map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2,-2)}</strong> :
      part.startsWith("`") && part.endsWith("`") ? <code key={i} className="rounded bg-white/10 px-1">{part.slice(1,-1)}</code> : part);
  }
  for (const match of text.matchAll(fences)) {
    nodes.push(<span key={'p'+cursor}>{prose(text.slice(cursor, match.index))}</span>);
    nodes.push(<CodeBlock key={'c'+match.index} language={(match[2] || "").trim()} code={match[3] || ""} />);
    cursor = match.index! + match[0].length;
  }
  return <div className="min-w-0 max-w-full whitespace-pre-wrap">{nodes}{prose(text.slice(cursor))}</div>;
}
