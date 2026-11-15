"use client";

import { useState, useCallback } from "react";
import type { Message } from "@/lib/types";
import { askQuestion } from "@/lib/api";
import { genId } from "@/lib/utils";

interface UseChatResult {
  messages: Message[];
  isLoading: boolean;
  sendMessage: (question: string) => Promise<void>;
  clearChat: () => void;
}

export function useChat(): UseChatResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(
    async (question: string): Promise<void> => {
      const trimmed = question.trim();
      if (!trimmed || isLoading) return;

      const userMsg: Message = {
        id: genId(),
        role: "user",
        content: trimmed,
        timestamp: Date.now()
      };

      const assistantId = genId();
      const pendingMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        pending: true
      };

      setMessages((prev) => [...prev, userMsg, pendingMsg]);
      setIsLoading(true);

      try {
        const data = await askQuestion(trimmed);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: data.answer,
                  sources: data.sources,
                  usedWebSearch: data.used_web_search,
                  pending: false
                }
              : m
          )
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: message,
                  pending: false,
                  error: true
                }
              : m
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading]
  );

  const clearChat = useCallback((): void => {
    setMessages([]);
  }, []);

  return { messages, isLoading, sendMessage, clearChat };
}
