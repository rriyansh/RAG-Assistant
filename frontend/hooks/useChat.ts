// hooks/useChat.ts
"use client";

import { useCallback, useState } from "react";
import { askQuestion } from "../lib/api";
import { ChatMessageItem, PendingConsent, ToolCall } from "../lib/types";

export function useChat(assistantName: string = "Assistant") {
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (
      question: string,
      consent: string[] = [],
      replaceMessageId?: string
    ) => {
      const trimmed = question.trim();
      if (!trimmed) return;

      setError(null);
      setIsLoading(true);

      if (!replaceMessageId) {
        const userMessage: ChatMessageItem = {
          id: `user-${Date.now()}`,
          role: "user",
          content: trimmed,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        setMessages((prev) => [...prev, userMessage]);
      }

      try {
        const response = await askQuestion(trimmed, assistantName, consent);
        const toolCalls: ToolCall[] = response.tool_calls || [];
        const pendingNames: string[] = response.pending_consent || [];

        const pendingConsentList: PendingConsent[] = pendingNames.map(
          (tName) => {
            const matchingCall = toolCalls.find(
              (tc) => tc.name === tName && tc.status === "pending"
            );
            return {
              name: tName,
              args: matchingCall ? matchingCall.args : {},
            };
          }
        );

        const assistantMessage: ChatMessageItem = {
          id: replaceMessageId || `assistant-${Date.now()}`,
          role: "assistant",
          content: response.answer,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          sources: response.sources || [],
          sourceType: response.source_type || "hybrid",
          toolCalls,
          pendingConsent: pendingConsentList,
          originalQuestion: trimmed,
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
    [assistantName]
  );

  const approveToolConsent = useCallback(
    async (messageId: string, toolName: string) => {
      const target = messages.find((m) => m.id === messageId);
      if (!target || !target.originalQuestion) return;

      const updatedConsent = Array.from(
        new Set([...(target.approvedConsent || []), toolName])
      );
      await sendMessage(target.originalQuestion, updatedConsent, messageId);
    },
    [messages, sendMessage]
  );

  const denyToolConsent = useCallback((messageId: string, toolName: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const remaining = (m.pendingConsent || []).filter(
          (p) => p.name !== toolName
        );
        return {
          ...m,
          content: `Tool execution of \`${toolName}\` was denied by the user.`,
          pendingConsent: remaining,
          toolCalls: (m.toolCalls || []).map((tc) =>
            tc.name === toolName && tc.status === "pending"
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
    isLoading,
    error,
    sendMessage,
    approveToolConsent,
    denyToolConsent,
    clearMessages,
    setMessages,
  };
}
