"use client";

import { AlertCircle, Bot, User } from "lucide-react";
import type { Message } from "@/lib/types";
import { cn, formatTime } from "@/lib/utils";
import { LoadingDots } from "./LoadingDots";
import { SourceList } from "./SourceList";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps): JSX.Element {
  const isUser = message.role === "user";
  const isError = message.error === true;

  return (
    <div
      className={cn(
        "flex gap-3 w-full",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
          isUser ? "bg-accent text-white" : "bg-panel text-accent border border-border"
        )}
      >
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      <div className={cn("min-w-0 flex-1", isUser && "flex flex-col items-end")}>
        <div
          className={cn(
            "inline-block max-w-full rounded-lg px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words",
            isUser
              ? "bg-accent text-white"
              : isError
                ? "bg-red-950/60 border border-red-900/60 text-red-200"
                : "bg-panel border border-border text-gray-200"
          )}
        >
          {message.pending ? (
            <LoadingDots />
          ) : (
            <span className="inline-flex items-start gap-2">
              {isError && (
                <AlertCircle size={14} className="mt-1 shrink-0" />
              )}
              <span>{message.content}</span>
            </span>
          )}
        </div>

        <div
          className={cn(
            "mt-1 flex items-center gap-2 text-[11px] text-gray-500",
            isUser && "flex-row-reverse"
          )}
        >
          <span>{formatTime(message.timestamp)}</span>
        </div>

        {!isUser && !message.pending && !isError && message.sources && (
          <SourceList
            sources={message.sources}
            usedWebSearch={message.usedWebSearch}
          />
        )}
      </div>
    </div>
  );
}
