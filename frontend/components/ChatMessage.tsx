"use client";

import * as React from "react";
import { AlertCircle, Info, Copy, Check } from "lucide-react";
import type { Message } from "@/lib/types";
import { cn, formatTime } from "@/lib/utils";
import { SourceList } from "./SourceList";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { Avatar } from "./Avatar";
import { Logo } from "./Logo";
import { useProfile } from "@/hooks/useProfile";

interface ChatMessageProps {
  message: Message;
}

type Block =
  | { type: "p"; text: string }
  | { type: "ul-item"; text: string }
  | { type: "ol-item"; text: string }
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "blockquote"; text: string }
  | { type: "code"; lang: string; code: string };

function parseBlocks(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  let inCode = false;
  let codeLang = "";
  let codeLines: string[] = [];

  const flushPara = (): void => {
    if (para.length) {
      blocks.push({ type: "p", text: para.join(" ") });
      para = [];
    }
  };

  for (const raw of lines) {
    const fenceMatch = raw.match(/^\s*```([\w-]*)\s*$/);
    if (fenceMatch) {
      if (!inCode) {
        flushPara();
        inCode = true;
        codeLang = fenceMatch[1] || "";
        codeLines = [];
      } else {
        blocks.push({ type: "code", lang: codeLang, code: codeLines.join("\n") });
        inCode = false;
        codeLang = "";
        codeLines = [];
      }
      continue;
    }

    if (inCode) {
      codeLines.push(raw);
      continue;
    }

    const headingMatch = raw.match(/^\s*(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushPara();
      const level = Math.min(headingMatch[1].length, 3) as 1 | 2 | 3;
      blocks.push({ type: "heading", level, text: headingMatch[2].trim() });
    } else if (/^\s*[-*]\s+/.test(raw)) {
      flushPara();
      blocks.push({ type: "ul-item", text: raw.replace(/^\s*[-*]\s+/, "").trim() });
    } else if (/^\s*\d+[.)]\s+/.test(raw)) {
      flushPara();
      blocks.push({ type: "ol-item", text: raw.replace(/^\s*\d+[.)]\s+/, "").trim() });
    } else if (/^\s*>\s?/.test(raw)) {
      flushPara();
      blocks.push({ type: "blockquote", text: raw.replace(/^\s*>\s?/, "").trim() });
    } else if (raw.trim() === "") {
      flushPara();
    } else {
      para.push(raw);
    }
  }

  if (inCode && codeLines.length) {
    blocks.push({ type: "code", lang: codeLang, code: codeLines.join("\n") });
  }
  flushPara();
  return blocks;
}

function revealWords(
  text: string,
  animate: boolean,
  start: number,
  keyPrefix: string
): { nodes: React.ReactNode; next: number } {
  if (!animate) return { nodes: <>{text}</>, next: start };

  const tokens = text.split(/(\s+)/);
  let word = start;
  const nodes = tokens.map((tok, i) => {
    if (!tok) return null;
    if (/^\s+$/.test(tok)) return <span key={`${keyPrefix}-s${i}`}>{tok}</span>;
    const delay = Math.min(word * 12, 1200);
    word += 1;
    return (
      <span key={`${keyPrefix}-w${i}`} className="reveal-w" style={{ animationDelay: `${delay}ms` }}>
        {tok}
      </span>
    );
  });
  return { nodes: <>{nodes}</>, next: word };
}

function revealInline(
  text: string,
  animate: boolean,
  start: number
): { nodes: React.ReactNode; next: number } {
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))/g;
  const out: React.ReactNode[] = [];
  let lastIndex = 0;
  let word = start;
  let match: RegExpExecArray | null;
  let seg = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const plain = text.slice(lastIndex, match.index);
      const r = revealWords(plain, animate, word, `t${seg++}`);
      word = r.next;
      out.push(r.nodes);
    }

    const token = match[0];
    if (token.startsWith("`")) {
      const codeText = token.slice(1, -1);
      const r = revealWords(codeText, animate, word, `c${seg++}`);
      word = r.next;
      out.push(
        <code
          key={`code-${seg}`}
          className="rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[12px] text-[#7cc4fa]"
        >
          {r.nodes}
        </code>
      );
    } else if (token.startsWith("**")) {
      const boldText = token.slice(2, -2);
      const r = revealWords(boldText, animate, word, `b${seg++}`);
      word = r.next;
      out.push(
        <strong key={`bold-${seg}`} className="font-semibold text-gray-100">
          {r.nodes}
        </strong>
      );
    } else if (token.startsWith("*")) {
      const italicText = token.slice(1, -1);
      const r = revealWords(italicText, animate, word, `i${seg++}`);
      word = r.next;
      out.push(
        <em key={`em-${seg}`} className="italic text-gray-200">
          {r.nodes}
        </em>
      );
    } else if (match[2] && match[3]) {
      const label = match[2];
      const href = match[3];
      const r = revealWords(label, animate, word, `a${seg++}`);
      word = r.next;
      out.push(
        <a
          key={`link-${seg}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#5FB2F2] underline decoration-[#5FB2F2]/40 underline-offset-2 hover:decoration-[#5FB2F2]"
        >
          {r.nodes}
        </a>
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    const tail = text.slice(lastIndex);
    const r = revealWords(tail, animate, word, `tail${seg}`);
    word = r.next;
    out.push(r.nodes);
  }

  return { nodes: <>{out}</>, next: word };
}

function CodeBlock({ lang, code }: { lang: string; code: string }): JSX.Element {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Ignore clipboard failures in restricted contexts
    }
  };

  return (
    <div className="my-2 overflow-hidden rounded-xl border border-white/10 bg-[#0b0f14]">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] text-gray-400">
        <span className="font-mono uppercase tracking-wider">{lang || "code"}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-gray-400 hover:bg-white/10 hover:text-gray-200 transition-colors"
          aria-label="Copy code snippet"
        >
          {copied ? (
            <>
              <Check size={11} className="text-green-400" />
              <span className="text-green-400">Copied</span>
            </>
          ) : (
            <>
              <Copy size={11} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-gray-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Rendered({ text, animate }: { text: string; animate: boolean }): JSX.Element {
  const blocks = parseBlocks(text);
  const out: JSX.Element[] = [];
  let pendingUl: JSX.Element[] = [];
  let pendingOl: JSX.Element[] = [];
  let word = 0;

  const flushLists = (): void => {
    if (pendingUl.length) {
      out.push(
        <ul key={`ul${out.length}`} className="msg-list list-disc pl-5 space-y-1">
          {pendingUl}
        </ul>
      );
      pendingUl = [];
    }
    if (pendingOl.length) {
      out.push(
        <ol key={`ol${out.length}`} className="msg-list list-decimal pl-5 space-y-1">
          {pendingOl}
        </ol>
      );
      pendingOl = [];
    }
  };

  blocks.forEach((b, i) => {
    if (b.type === "ul-item") {
      if (pendingOl.length) flushLists();
      const r = revealInline(b.text, animate, word);
      word = r.next;
      pendingUl.push(<li key={`li${i}`}>{r.nodes}</li>);
      return;
    }

    if (b.type === "ol-item") {
      if (pendingUl.length) flushLists();
      const r = revealInline(b.text, animate, word);
      word = r.next;
      pendingOl.push(<li key={`oli${i}`}>{r.nodes}</li>);
      return;
    }

    flushLists();

    if (b.type === "code") {
      out.push(<CodeBlock key={`code${i}`} lang={b.lang} code={b.code} />);
    } else if (b.type === "heading") {
      const r = revealInline(b.text, animate, word);
      word = r.next;
      const cls =
        b.level === 1
          ? "pt-1 text-base font-semibold text-gray-100"
          : b.level === 2
            ? "pt-1 text-[15px] font-semibold text-gray-100"
            : "pt-0.5 text-sm font-semibold text-gray-200";
      out.push(
        <p key={`h${i}`} className={cls}>
          {r.nodes}
        </p>
      );
    } else if (b.type === "blockquote") {
      const r = revealInline(b.text, animate, word);
      word = r.next;
      out.push(
        <blockquote
          key={`bq${i}`}
          className="border-l-2 border-[#5FB2F2]/60 pl-3 text-gray-300 italic"
        >
          {r.nodes}
        </blockquote>
      );
    } else {
      const r = revealInline(b.text, animate, word);
      word = r.next;
      out.push(
        <p key={`p${i}`} className="whitespace-pre-wrap break-words">
          {r.nodes}
        </p>
      );
    }
  });

  flushLists();

  return <div className="space-y-2">{out}</div>;
}

export function ChatMessage({ message }: ChatMessageProps): JSX.Element {
  const isUser = message.role === "user";
  const isError = message.error === true;
  const { profile } = useProfile();

  const [animateText, setAnimateText] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const wasPending = React.useRef(message.pending === true);

  React.useEffect(() => {
    if (wasPending.current && !message.pending && !message.error && !message.local) {
      setAnimateText(true);
    }
    wasPending.current = message.pending === true;
  }, [message.pending, message.error, message.local]);

  const copyMessage = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Ignore clipboard failures in restricted contexts
    }
  };

  return (
    <div
      className={cn(
        "group flex gap-3 w-full",
        isUser ? "flex-row-reverse" : "flex-row",
        isUser ? "msg-in-right" : "msg-in-left"
      )}
    >
      <div className="shrink-0">
        {isUser ? (
          <Avatar profile={profile} size={32} />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-panel p-1">
            <Logo size={22} src={profile.assistantLogo || "/logo.svg"} />
          </div>
        )}
      </div>

      <div className={cn("min-w-0 flex-1", isUser && "flex flex-col items-end")}>
        <div
          className={cn(
            "inline-block max-w-full px-4 py-2.5 text-sm leading-relaxed break-words rounded-[22px]",
            isUser
              ? "bg-accent text-white rounded-br-md whitespace-pre-wrap"
              : isError
                ? "bg-red-950/60 border border-red-900/60 text-red-200 rounded-bl-md"
                : "bg-panel border border-border text-gray-200 rounded-bl-md"
          )}
        >
          {message.pending ? (
            <ThinkingIndicator />
          ) : isError ? (
            <span className="inline-flex items-start gap-2">
              <AlertCircle size={14} className="mt-1 shrink-0" />
              <span>{message.content}</span>
            </span>
          ) : isUser ? (
            <span>{message.content}</span>
          ) : (
            <Rendered text={message.content} animate={animateText} />
          )}
        </div>

        <div className={cn("mt-1 flex items-center gap-2 text-[11px] text-gray-500", isUser && "flex-row-reverse")}>
          <span>{formatTime(message.timestamp)}</span>
          {message.local && (
            <span className="flex items-center gap-1 rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-400">
              <Info size={9} /> local
            </span>
          )}
          {!isUser && !message.pending && !isError && (
            <button
              type="button"
              onClick={copyMessage}
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-gray-400 hover:bg-white/5 hover:text-gray-200 transition-opacity"
              aria-label="Copy response"
            >
              {copied ? (
                <>
                  <Check size={10} className="text-green-400" />
                  <span className="text-green-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy size={10} />
                  <span>Copy</span>
                </>
              )}
            </button>
          )}
        </div>

        {!isUser && !message.pending && !isError && message.sources && (
          <SourceList sources={message.sources} usedWebSearch={message.usedWebSearch} />
        )}
      </div>
    </div>
  );
}
