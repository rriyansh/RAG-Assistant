// hooks/useChat.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { languageName } from "../lib/locales";
import { askQuestion } from "../lib/api";
import { ApiMode, ChatMessageItem, PendingConsent, ToolCall, UserProfile } from "../lib/types";

export function useChat(assistantName: string = "Assistant", mode: ApiMode = "agent", profile?: UserProfile, hydrated = true) {
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activity, setActivity] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [storageReady, setStorageReady] = useState(false);
  const storageKey = `reso-conversation-${mode}`;
  const retentionMs = profile?.retention === "forever" ? Infinity : Number(profile?.retention ?? 30) * 86400000;
  useEffect(() => {
    if (!hydrated) return;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "[]") as ChatMessageItem[];
      if (profile?.rememberChats && Array.isArray(saved)) setMessages(current => current.length ? current :
        saved.filter(message => message.createdAt && Date.now() - message.createdAt < retentionMs));
    } catch {}
    setStorageReady(true);
  }, [hydrated, storageKey, profile?.rememberChats, retentionMs]);
  useEffect(() => {
    if (!storageReady) return;
    try {
      if (!profile?.rememberChats) localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, JSON.stringify(messages
        .filter(message => message.createdAt && Date.now() - message.createdAt < retentionMs)
        .map(({id, role, content, timestamp, createdAt}) => ({id, role, content, timestamp, createdAt}))));
    } catch {}
  }, [storageReady, storageKey, messages, profile?.rememberChats, retentionMs]);

  const sendMessage = useCallback(
    async (
      question: string,
      consent: string[] = [],
      replaceMessageId?: string, connectorId?: string, webSearch = false
    ) => {
      const trimmed = question.trim();
      if (!trimmed) return;

      setError(null);
      setIsLoading(true);
      setActivity([]);

      if (!replaceMessageId) {
        const userMessage: ChatMessageItem = {
          id: `user-${Date.now()}`,
          role: "user",
          content: trimmed,
          createdAt: Date.now(),
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        setMessages((prev) => [...prev, userMessage]);
      }

      try {
        const prior = replaceMessageId ? messages.slice(0, Math.max(0, messages.findIndex(m => m.id === replaceMessageId) - 1)) : messages;
        const history = prior.slice(-6).map(({role, content}) => ({
          role, content: content.slice(-4000),
        }));
        const response = await askQuestion(
          trimmed, assistantName, consent, mode,
          label => setActivity(prev => [...prev, label]), history, connectorId, webSearch, profile?.tone, [profile?.locale && profile.locale !== "en" ? `Reply in ${languageName(profile.locale)}.` : "", profile?.instructions].filter(Boolean).join(" ").slice(0, 2000),
        );
        if (profile?.notifications && document.hidden && typeof Notification !== "undefined" && Notification.permission === "granted") {
          try { new Notification("ResoAgent reply ready"); } catch {}
        }
        const toolCalls: ToolCall[] = response.tool_calls || [];
        const pendingConsentList: PendingConsent[] = toolCalls.flatMap(call =>
          call.status === "pending" && call.approval
            ? [{name: call.name, args: call.args, approval: call.approval}] : []
        );

        const assistantMessage: ChatMessageItem = {
          id: replaceMessageId || `assistant-${Date.now()}`,
          role: "assistant",
          content: response.answer,
          createdAt: Date.now(),
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          sources: response.sources || [],
          sourceType: response.source_type || "hybrid",
          toolCalls,
          pendingConsent: pendingConsentList,
          originalQuestion: trimmed, connectorId, webSearch,
          approvedConsent: consent,
        };

        setMessages((prev) => {
          if (replaceMessageId) {
            return prev.map((m) =>
              m.id === replaceMessageId ? assistantMessage : m
            );
          }
          return [...prev, assistantMessage];
        });
      } catch (err) {
        const errMsg =
          err instanceof Error ? err.message : "Failed to get a response.";
        setError(errMsg);
        const failMessage: ChatMessageItem = {
          id: replaceMessageId || `assistant-err-${Date.now()}`,
          role: "assistant",
          content: `Error: ${errMsg}`,
          createdAt: Date.now(),
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        setMessages((prev) =>
          replaceMessageId
            ? prev.map((m) => (m.id === replaceMessageId ? failMessage : m))
            : [...prev, failMessage]
        );
      } finally {
        setIsLoading(false);
      }
    },
    [assistantName, mode, messages, profile?.tone, profile?.instructions, profile?.notifications, profile?.locale]
  );

  const approveToolConsent = useCallback(
    async (messageId: string, toolName: string) => {
      const target = messages.find((m) => m.id === messageId);
      if (!target || !target.originalQuestion) return;

      const updatedConsent = Array.from(
        new Set([...(target.approvedConsent || []), toolName])
      );
      await sendMessage(target.originalQuestion, updatedConsent, messageId, target.connectorId, target.webSearch);
    },
    [messages, sendMessage]
  );

  const denyToolConsent = useCallback((messageId: string, toolName: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const remaining = (m.pendingConsent || []).filter(
          (p) => p.approval !== toolName
        );
        return {
          ...m,
          content: "Tool execution was declined.",
          pendingConsent: remaining,
          toolCalls: (m.toolCalls || []).map((tc) =>
            tc.approval === toolName && tc.status === "pending"
              ? {
                  ...tc,
                  status: "error",
                  result_summary: "Denied by user.",
                }
              : tc
          ),
        };
      })
    );
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    activity,
    isLoading,
    error,
    sendMessage,
    regenerate: (id: string) => {
      const last = messages.at(-1);
      if (last?.id === id && last.originalQuestion && !isLoading)
        void sendMessage(last.originalQuestion, [], id, last.connectorId, last.webSearch);
    },
    approveToolConsent,
    denyToolConsent,
    clearMessages,
    setMessages,
  };
}

export default useChat;
