"use client";

import React, { useMemo, useState } from "react";
import { Check, Copy, Download, ExternalLink, FileCode2, FileText, Globe } from "lucide-react";
import { ChatMessageItem, UserProfile } from "../lib/types";
import {
  DEFAULT_RAG_ASSISTANT_LOGO,
  INBUILT_USER_PFPS,
  triggerFileDownload,
} from "../lib/utils";
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

const LANG_EXTENSION_MAP: Record<string, string> = {
  python: "py",
  py: "py",
  c: "c",
  cpp: "cpp",
  "c++": "cpp",
  javascript: "js",
  js: "js",
  typescript: "ts",
  ts: "ts",
  tsx: "tsx",
  jsx: "jsx",
  java: "java",
  go: "go",
  rust: "rs",
  html: "html",
  css: "css",
  json: "json",
  sql: "sql",
  bash: "sh",
  sh: "sh",
  markdown: "md",
  md: "md",
};

interface ExtractedCodeFile {
  filename: string;
  language: string;
  code: string;
}

function extractCodeBlocks(content: string): ExtractedCodeFile[] {
  const regex = /```([a-zA-Z0-9_+-]*)\n([\s\S]*?)```/g;
  const files: ExtractedCodeFile[] = [];
  let match: RegExpExecArray | null;
  let index = 1;

  while ((match = regex.exec(content)) !== null) {
    const rawLang = (match[1] || "txt").toLowerCase().trim();
    const code = (match[2] || "").trim();
    if (!code) continue;
    const ext = LANG_EXTENSION_MAP[rawLang] || "txt";
    const firstLine = code.split("\n")[0] || "";
    const nameMatch = firstLine.match(/(?:\/\/|#|\/\*|--)\s*([a-zA-Z0-9_.-]+\.[a-zA-Z0-9]+)/);
    const filename = nameMatch?.[1] || `script_${index}.${ext}`;
    files.push({
      filename,
      language: rawLang || "text",
      code,
    });
    index++;
  }
  return files;
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
  const [copied, setCopied] = useState(false);

  const resolvedAssistantName = profile?.assistantName || assistantName || "RAG Assistant";
  const resolvedUserName = profile?.name?.trim() || "User";
  const assistantLogoSrc = profile?.assistantLogo ?? DEFAULT_RAG_ASSISTANT_LOGO;
  const userAvatarSrc = profile?.avatarDataUrl || INBUILT_USER_PFPS[0]!.url;

  const extractedFiles = useMemo(
    () => (!isUser ? extractCodeBlocks(message.content) : []),
    [isUser, message.content]
  );

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <div
      className={`flex w-full items-start gap-3.5 py-4 ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      {!isUser && assistantLogoSrc && (
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#e6e4f0]/20 bg-[#141417]">
          <img
            src={assistantLogoSrc}
            alt={resolvedAssistantName}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div
        className={`flex max-w-[82%] flex-col space-y-2 ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        <div
          className={`flex items-center gap-2 px-1 text-[11px] text-[#e6e4f0]/60 ${
            isUser ? "flex-row-reverse" : ""
          }`}
        >
          <span className="font-semibold text-[#f4f3f8]">
            {isUser ? resolvedUserName : resolvedAssistantName}
          </span>
          <span>·</span>
          <span className="text-[10px]">{message.timestamp}</span>
        </div>

        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "rounded-tr-sm bg-[#f4f3f8] text-[#0c0c0e] font-medium"
              : "rounded-tl-sm border border-[#e6e4f0]/15 bg-[#141417] text-[#f4f3f8]"
          }`}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap break-words">{message.content}</div>
          ) : (
            <AiStreamingText
              text={message.content}
              speed={15}
              mode="character"
              animate={isLatestAssistant}
              showCursor={isLatestAssistant}
              className="break-words text-[#f4f3f8]"
            />
          )}
        </div>

        {!isUser && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={handleCopyText}
              className="inline-flex items-center gap-1 rounded-lg border border-[#e6e4f0]/15 bg-[#141417] px-2.5 py-1 text-[11px] text-[#e6e4f0]/80 transition hover:border-[#f4f3f8]/40 hover:text-[#f4f3f8]"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </button>

            <button
              type="button"
              onClick={() =>
                triggerFileDownload(`response_${message.id}.pdf`, message.content, "pdf")
              }
              className="inline-flex items-center gap-1 rounded-lg border border-[#e6e4f0]/15 bg-[#141417] px-2.5 py-1 text-[11px] text-[#e6e4f0]/80 transition hover:border-[#f4f3f8]/40 hover:text-[#f4f3f8]"
            >
              <Download className="h-3 w-3" />
              PDF
            </button>

            <button
              type="button"
              onClick={() =>
                triggerFileDownload(`response_${message.id}.doc`, message.content, "doc")
              }
              className="inline-flex items-center gap-1 rounded-lg border border-[#e6e4f0]/15 bg-[#141417] px-2.5 py-1 text-[11px] text-[#e6e4f0]/80 transition hover:border-[#f4f3f8]/40 hover:text-[#f4f3f8]"
            >
              <Download className="h-3 w-3" />
              DOC
            </button>

            <button
              type="button"
              onClick={() =>
                triggerFileDownload(`response_${message.id}.txt`, message.content, "raw")
              }
              className="inline-flex items-center gap-1 rounded-lg border border-[#e6e4f0]/15 bg-[#141417] px-2.5 py-1 text-[11px] text-[#e6e4f0]/80 transition hover:border-[#f4f3f8]/40 hover:text-[#f4f3f8]"
            >
              <Download className="h-3 w-3" />
              TXT
            </button>

            {extractedFiles.map((file, idx) => (
              <button
                key={`${file.filename}-${idx}`}
                type="button"
                onClick={() => triggerFileDownload(file.filename, file.code, "raw")}
                className="inline-flex items-center gap-1 rounded-lg border border-[#f4f3f8]/30 bg-[#1c1c21] px-2.5 py-1 text-[11px] font-medium text-[#f4f3f8] transition hover:bg-[#f4f3f8] hover:text-[#0c0c0e]"
              >
                <FileCode2 className="h-3 w-3" />
                Download {file.filename}
              </button>
            ))}
          </div>
        )}

        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <div className="w-full">
            <ToolCalls toolCalls={message.toolCalls} />
          </div>
        )}

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

        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {message.sources.map((src, idx) => {
              const isWeb = src.source_type === "web" || Boolean(src.url);
              const label =
                src.doc_name || src.title || (isWeb ? "Web Reference" : "Document");
              return (
                <div
                  key={`${label}-${idx}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#e6e4f0]/15 bg-[#141417] px-2.5 py-1 text-[11px] text-[#e6e4f0]"
                >
                  {isWeb ? (
                    <Globe className="h-3 w-3 text-[#f4f3f8]" />
                  ) : (
                    <FileText className="h-3 w-3 text-[#f4f3f8]" />
                  )}
                  <span className="max-w-[190px] truncate">{label}</span>
                  {src.page && !isWeb && (
                    <span className="text-[#e6e4f0]/50">p.{src.page}</span>
                  )}
                  {src.url && (
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#f4f3f8] hover:opacity-80"
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

      {isUser && (
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#e6e4f0]/20 bg-[#141417]">
          <img
            src={userAvatarSrc}
            alt={resolvedUserName}
            className="h-full w-full object-cover"
          />
        </div>
      )}
    </div>
  );
}

export default ChatMessage;
