"use client";

import { AlertCircle, Info } from "lucide-react";
import type { Message } from "@/lib/types";
import { cn, formatTime } from "@/lib/utils";
import { SourceList } from "./SourceList";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { Avatar } from "./Avatar";
import { useProfile } from "@/hooks/useProfile";
import { Logo } from "./Logo";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps): JSX.Element {
  const isUser = message.role === "user";
  const isError = message.error === true;
  const { profile } = useProfile();

  return (
    <div className={cn("flex gap-3 w-full", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar / Logo */}
      <div className="shrink-0">
        {isUser ? (
          <Avatar profile={profile} size={32} />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-panel p-1">
            <Logo size={22} />
          </div>
        )}
      </div>

      <div className={cn("min-w-0 flex-1", isUser && "flex flex-col items-end")}>
        <div
          className={cn(
            "inline-block max-w-full px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words rounded-[22px]",
            isUser
              ? "bg-accent text-white rounded-br-md"
              : isError
                ? "bg-red-950/60 border border-red-900/60 text-red-200 rounded-bl-md"
                : "bg-panel border border-border text-gray-200 rounded-bl-md"
          )}
        >
          {message.pending ? (
            <ThinkingIndicator />
          ) : (
            <span className="inline-flex items-start gap-2">
              {isError && <AlertCircle size={14} className="mt-1 shrink-0" />}
              <span>{message.content}</span>
            </span>
          )}
        </div>

        <div className={cn("mt-1 flex items-center gap-2 text-[11px] text-gray-500", isUser && "flex-row-reverse")}>
          <span>{formatTime(message.timestamp)}</span>
          {message.local && (
            <span className="flex items-center gap-1 rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-400">
              <Info size={9} /> local
            </span>
          )}
          {message.enhanced && (
            <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-400">
              enhanced
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
