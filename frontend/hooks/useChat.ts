"use client";

import { useCallback, useState } from "react";
import type { Message } from "@/lib/types";
import { askQuestion } from "@/lib/api";
import { genId } from "@/lib/utils";
import { playSentSound, playReceivedSound } from "@/lib/sounds";
import { useCannedResponses } from "./useCannedResponses";

interface UseChatResult {
  messages: Message[];
  isLoading: boolean;
  sendMessage: (question: string) => Promise<void>;
  clearChat: () => void;
}

export function useChat(): UseChatResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { findMatch } = useCannedResponses();

  const sendMessage = useCallback(
    async (question: string): Promise<void> => {
      const trimmed = question.trim();
      if (!trimmed || isLoading) return;

      // 1. Canned response path — no backend, no loading, no sound blip.
      const canned = findMatch(trimmed);
      if (canned) {
        const now = Date.now();
        setMessages((prev) => [
          ...prev,
          { id: genId(), role: "user", content: trimmed, timestamp: now },
          {
            id: genId(),
            role: "assistant",
            content: canned.response,
            timestamp: now + 1,
            local: true,
          },
        ]);
        return;
      }

      // 2. Normal path
      playSentSound();
      const userMsg: Message = {
        id: genId(),
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
      };
      const assistantId = genId();
      const pendingMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        pending: true,
      };

      setMessages((prev) => [...prev, userMsg, pendingMsg]);
      setIsLoading(true);

      try {
        const data = await askQuestion(trimmed);
        playReceivedSound();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: data.answer,
                  sources: data.sources,
                  usedWebSearch: data.used_web_search,
                  pending: false,
                }
              : m
          )
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: message, pending: false, error: true }
              : m
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, findMatch]
  );

  const clearChat = useCallback((): void => {
    setMessages([]);
  }, []);

  return { messages, isLoading, sendMessage, clearChat };
}
