"use client";

import * as React from "react";
import { AlertCircle, Info } from "lucide-react";
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
  | { type: "li"; text: string };

function parseBlocks(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];

  const flush = () => {
    if (para.length) {
      blocks.push({ type: "p", text: para.join(" ") });
      para = [];
    }
  };

  for (const raw of lines) {
    if (/^\s*[-*]\s+/.test(raw)) {
      flush();
      blocks.push({ type: "li", text: raw.replace(/^\s*[-*]\s+/, "").trim() });
    } else if (raw.trim() === "") {
      flush();
    } else {
      para.push(raw);
    }
  }
  flush();
  return blocks;
}

function reveal(text: string, animate: boolean, start: number): { nodes: React.ReactNode; next: number } {
  if (!animate) return { nodes: <>{text}</>, next: start };

  const tokens = text.split(/(\s+)/);
  let word = start;
  const nodes = tokens.map((tok, i) => {
    if (!tok) return null;
    if (/^\s+$/.test(tok)) return <span key={`s${i}`}>{tok}</span>;
    const delay = Math.min(word * 12, 1200);
    word += 1;
    return (
      <span key={`w${i}`} className="reveal-w" style={{ animationDelay: `${delay}ms` }}>
        {tok}
      </span>
    );
  });
  return { nodes: <>{nodes}</>, next: word };
}

function Rendered({ text, animate }: { text: string; animate: boolean }): JSX.Element {
  const blocks = parseBlocks(text);
  const out: JSX.Element[] = [];
  let pending: JSX.Element[] = [];
  let word = 0;

  const flushList = () => {
    if (pending.length) {
      out.push(<ul key={`ul${out.length}`} className="msg-list">{pending}</ul>);
      pending = [];
    }
  };

  blocks.forEach((b, i) => {
    if (b.type === "li") {
      const r = reveal(b.text, animate, word);
      word = r.next;
      pending.push(<li key={`li${i}`}>{r.nodes}</li>);
    } else {
      flushList();
      const r = reveal(b.text, animate, word);
      word = r.next;
      out.push(<p key={`p${i}`} className="whitespace-pre-wrap break-words">{r.nodes}</p>);
    }
  });
  flushList();

  return <div className="space-y-1.5">{out}</div>;
}

export function ChatMessage({ message }: ChatMessageProps): JSX.Element {
  const isUser = message.role === "user";
  const isError = message.error === true;
  const { profile } = useProfile();

  const [animateText, setAnimateText] = React.useState(false);
  const wasPending = React.useRef(message.pending === true);

  React.useEffect(() => {
    if (wasPending.current && !message.pending && !message.error && !message.local) {
      setAnimateText(true);
    }
    wasPending.current = message.pending === true;
  }, [message.pending, message.error, message.local]);

  return (
    <div
      className={cn(
        "flex gap-3 w-full",
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
        </div>

        {!isUser && !message.pending && !isError && message.sources && (
          <SourceList sources={message.sources} usedWebSearch={message.usedWebSearch} />
        )}
      </div>
    </div>
  );
}
