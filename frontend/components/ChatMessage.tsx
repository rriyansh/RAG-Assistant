// components/ChatMessage.tsx
"use client";

import React from "react";
import { ExternalLink, FileText, Globe } from "lucide-react";
import { ChatMessageItem, UserProfile } from "../lib/types";
import { DEFAULT_RAG_ASSISTANT_LOGO } from "../lib/utils";
import { ToolCalls } from "./ToolCalls";
import { ConsentPrompt } from "./ConsentPrompt";
import { AiStreamingText } from "./ui/ai-streaming-text";

interface ChatMessageProps {
  message: ChatMessageItem;
  profile?: UserProfile;
  assistantName?: string;
  isLatestAssistant?: boolean;
  onApproveConsent?: (messageId: string, toolName: string) => void;
  onDenyConsent?: (messageId: string, toolName: string) => void;
  isLoading?: boolean;
}

function getInitials(name: string): string {
  const parts = (name || "User").trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (name || "U").slice(0, 2).toUpperCase();
}

export function ChatMessage({
  message,
  profile,
  assistantName = "RAG Assistant",
  isLatestAssistant = false,
  onApproveConsent,
  onDenyConsent,
  isLoading = false,
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const resolvedAssistantName =
    profile?.assistantName || assistantName || "RAG Assistant";
  const resolvedUserName = profile?.name || "You";
  const assistantLogoSrc =
    profile?.assistantLogo || DEFAULT_RAG_ASSISTANT_LOGO;
  const userAvatarSrc = profile?.avatarDataUrl || "";

  return (
    <div
      className={`flex w-full items-start gap-3.5 py-3.5 ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      {/* Assistant Logo Avatar (Left side of every assistant message) */}
      {!isUser && (
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-indigo-400/30 bg-slate-900 shadow-md shadow-indigo-950/40">
          <img
            src={assistantLogoSrc}
            alt={`${resolvedAssistantName} logo`}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Message Content Column */}
      <div
        className={`flex max-w-[82%] flex-col space-y-2 ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        {/* Sender Name & Timestamp Header */}
        <div
          className={`flex items-center gap-2 px-1 text-[11px] ${
            isUser ? "flex-row-reverse text-slate-400" : "text-slate-400"
          }`}
        >
          <span className="font-semibold text-slate-200">
            {isUser ? resolvedUserName : resolvedAssistantName}
          </span>
          <span className="text-slate-500">·</span>
          <span className="text-[10px] text-slate-500">{message.timestamp}</span>
        </div>

        {/* Bubble */}
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
            isUser
              ? "rounded-tr-sm bg-indigo-600 text-white"
              : "rounded-tl-sm border border-slate-800 bg-slate-900/90 text-slate-100"
          }`}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
          ) : (
            <AiStreamingText
              text={message.content}
              speed={16}
              mode="character"
              animate={isLatestAssistant}
              showCursor={isLatestAssistant}
              className="break-words text-slate-100"
            />
          )}
        </div>

        {/* Collapsible Tool Calls Trace */}
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <div className="w-full">
            <ToolCalls toolCalls={message.toolCalls} />
          </div>
        )}

        {/* Interactive Consent Prompt Card */}
        {!isUser &&
          message.pendingConsent &&
          message.pendingConsent.length > 0 &&
          message.pendingConsent.map((pending) => (
            <div key={pending.name} className="w-full">
              <ConsentPrompt
                pending={pending}
                assistantName={resolvedAssistantName}
                disabled={isLoading}
                onApprove={(toolName) =>
                  onApproveConsent && onApproveConsent(message.id, toolName)
                }
                onDeny={(toolName) =>
                  onDenyConsent && onDenyConsent(message.id, toolName)
                }
              />
            </div>
          ))}

        {/* Grounded Citations / Sources */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {message.sources.map((src, idx) => {
              const isWeb = src.source_type === "web" || Boolean(src.url);
              const label =
                src.doc_name || src.title || (isWeb ? "Web Reference" : "Document");
              return (
                <div
                  key={`${label}-${idx}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/90 px-2.5 py-1 text-[11px] text-slate-300"
                >
                  {isWeb ? (
                    <Globe className="h-3 w-3 text-sky-400" />
                  ) : (
                    <FileText className="h-3 w-3 text-emerald-400" />
                  )}
                  <span className="max-w-[190px] truncate">{label}</span>
                  {src.page && !isWeb && (
                    <span className="text-slate-500">p.{src.page}</span>
                  )}
                  {src.url && (
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 hover:text-sky-300"
                      aria-label={`Open ${label}`}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* User Logo / Avatar (Right side of every user message) */}
      {isUser && (
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-gradient-to-br from-indigo-500 to-sky-600 text-xs font-bold text-white shadow-md">
          {userAvatarSrc ? (
            <img
              src={userAvatarSrc}
              alt={`${resolvedUserName} avatar`}
              className="h-full w-full object-cover"
            />
          ) : (
            <span>{getInitials(resolvedUserName)}</span>
          )}
        </div>
      )}
    </div>
  );
}

export default ChatMessage;
