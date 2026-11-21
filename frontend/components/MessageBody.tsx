"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Lexer, type Token } from "../lib/vendor/marked";

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

function Diagram({ code }: { code: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const doc = new DOMParser().parseFromString(code, "image/svg+xml");
    if (doc.documentElement.localName !== "svg" || doc.querySelector("parsererror")) return;
    const elements = new Set("svg g title desc rect circle ellipse line polyline polygon path text tspan defs marker".split(" "));
    const attrs = new Set("xmlns viewBox width height x y x1 x2 y1 y2 dx dy cx cy r rx ry d points fill stroke stroke-width stroke-linecap stroke-linejoin opacity transform font-size font-family font-weight text-anchor dominant-baseline id marker-end marker-start markerWidth markerHeight refX refY orient".split(" "));
    for (const element of doc.querySelectorAll("*")) {
      if (!elements.has(element.localName)) return;
      for (const attr of element.attributes) {
        if (!attrs.has(attr.name) || (/url\s*\(/i.test(attr.value) && !/^url\(#[\w-]+\)$/.test(attr.value))) return;
      }
    }
    const src = URL.createObjectURL(new Blob([code], { type: "image/svg+xml" }));
    setUrl(src);
    return () => URL.revokeObjectURL(src);
  }, [code]);
  if (!url) return <CodeBlock language="svg" code={code} />;
  return <figure className="my-3"><img src={url} alt="Diagram from this response" className="max-h-[75vh] w-full rounded bg-white object-contain" />
    <a download="diagram.svg" href={url} className="text-xs underline">Download SVG</a>
    <details><summary className="cursor-pointer text-xs">Diagram source</summary><CodeBlock language="svg" code={code} /></details></figure>;
}

function render(tokens: Token[] = []): ReactNode {
  return tokens.map((token, key) => {
    switch (token.type) {
      case "space": return null;
      case "br": return <br key={key} />;
      case "heading": return <h3 key={key} className="mb-1 mt-4 font-bold">{render(token.tokens)}</h3>;
      case "strong": case "em": return <strong key={key}>{render(token.tokens)}</strong>;
      case "codespan": return <code key={key} className="rounded bg-white/10 px-1">{token.text}</code>;
      case "code": return token.lang === "svg" ? <Diagram key={key} code={token.text} /> : <CodeBlock key={key} language={token.lang || "Code"} code={token.text} />;
      case "paragraph": return <p key={key} className="my-3 first:mt-0 last:mb-0">{render(token.tokens)}</p>;
      case "blockquote": return <blockquote key={key} className="my-2 border-l-2 pl-3">{render(token.tokens)}</blockquote>;
      case "list": {
        const items = token.items.map((item: {tokens:Token[]}, i:number) => <li key={i}>{render(item.tokens)}</li>);
        return token.ordered ? <ol key={key} start={Number(token.start)||1} className="list-decimal pl-6">{items}</ol> : <ul key={key} className="list-disc pl-6">{items}</ul>;
      }
      case "table": return <div key={key} className="my-3 overflow-auto"><table className="w-full text-left text-sm"><thead><tr>{token.header.map((cell:{tokens:Token[]}, i:number) => <th key={i} className="border-b p-2">{render(cell.tokens)}</th>)}</tr></thead><tbody>{token.rows.map((row:{tokens:Token[]}[], i:number) => <tr key={i}>{row.map((cell,j) => <td key={j} className="border-b border-white/15 p-2">{render(cell.tokens)}</td>)}</tr>)}</tbody></table></div>;
      case "link": return /^https?:\/\//i.test(token.href) ? <a key={key} className="underline" href={token.href} target="_blank" rel="noreferrer">{render(token.tokens)}</a> : render(token.tokens);
      case "hr": return <hr key={key} />;
      default: return "tokens" in token && Array.isArray(token.tokens) ? render(token.tokens) : ("text" in token ? String(token.text) : token.raw);
    }
  });
}

export function MessageBody({ text }: { text: string }) {
  const tokens = useMemo(() => Lexer.lex(text, { gfm: true }), [text]);
  return <div className="min-w-0 max-w-full whitespace-normal">{render(tokens)}</div>;
}
