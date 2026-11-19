// components/ChatMessage.tsx
"use client";

import React from "react";
import { Bot, ExternalLink, FileText, Globe, User } from "lucide-react";
import type { ChatMessageItem, Profile } from "../lib/types";
import { ToolCalls } from "./ToolCalls";
import { ConsentPrompt } from "./ConsentPrompt";
import { Avatar } from "./Avatar";

interface ChatMessageProps {
  message: ChatMessageItem;
  assistantName?: string;
  profile?: Profile;
  onApproveConsent?: (messageId: string, toolName: string) => void;
  onDenyConsent?: (messageId: string, toolName: string) => void;
  isLoading?: boolean;
}

export function ChatMessage({
  message,
  assistantName = "Assistant",
  profile,
  onApproveConsent,
  onDenyConsent,
  isLoading = false,
}: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex w-full gap-3 py-3 ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      {!isUser && (
        profile?.assistantLogo ? (
          <img
            src={profile.assistantLogo}
            alt={`${assistantName} logo`}
            className="h-8 w-8 shrink-0 rounded-full border border-indigo-500/40 object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-indigo-500/40 bg-indigo-600/20 text-indigo-400">
            <Bot className="h-4 w-4" />
          </div>
        )
      )}

      <div
        className={`max-w-[82%] space-y-2 ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        <p className={`px-1 text-[10px] font-medium text-slate-400 ${isUser ? "text-right" : "text-left"}`}>
          {isUser ? profile?.name || "You" : assistantName}
        </p>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
            isUser
              ? "bg-indigo-600 text-white rounded-br-none"
              : "bg-slate-800/90 text-slate-100 border border-slate-700/70 rounded-bl-none"
          }`}
        >
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>
        </div>

        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <ToolCalls toolCalls={message.toolCalls} />
        )}

        {!isUser &&
          message.pendingConsent &&
          message.pendingConsent.length > 0 &&
          message.pendingConsent.map((pending) => (
            <ConsentPrompt
              key={pending.name}
              pending={pending}
              assistantName={assistantName}
              disabled={isLoading}
              onApprove={(toolName) =>
                onApproveConsent && onApproveConsent(message.id, toolName)
              }
              onDeny={(toolName) =>
                onDenyConsent && onDenyConsent(message.id, toolName)
              }
            />
          ))}

        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {message.sources.map((src, idx) => {
              const isWeb = src.source_type === "web" || Boolean(src.url);
              const label =
                src.doc_name || src.title || (isWeb ? "Web Source" : "PDF");
              return (
                <div
                  key={`${label}-${idx}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-[11px] text-slate-300"
                >
                  {isWeb ? (
                    <Globe className="h-3 w-3 text-sky-400" />
                  ) : (
                    <FileText className="h-3 w-3 text-emerald-400" />
                  )}
                  <span className="truncate max-w-[180px]">{label}</span>
                  {src.page && !isWeb && (
                    <span className="text-slate-500">p.{src.page}</span>
                  )}
                  {src.url && (
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 hover:text-sky-300"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div
          className={`text-[10px] text-slate-500 px-1 ${
            isUser ? "text-right" : "text-left"
          }`}
        >
          {message.timestamp}
        </div>
      </div>

      {isUser && (
        profile ? (
          <Avatar profile={profile} size={32} className="shrink-0" />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-slate-200">
            <User className="h-4 w-4" />
          </div>
        )
      )}
    </div>
  );
}

export default ChatMessage;
