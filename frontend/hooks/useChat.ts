"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Message } from "@/lib/types";
import { askQuestion } from "@/lib/api";
import { genId } from "@/lib/utils";
import { playSentSound, playReceivedSound } from "@/lib/sounds";
import { useCannedResponses } from "./useCannedResponses";
import { useProfile } from "./useProfile";

const HISTORY_KEY = "rag.history";

interface UseChatResult {
  messages: Message[];
  isLoading: boolean;
  sendMessage: (question: string) => Promise<void>;
  stopGeneration: () => void;
  clearChat: () => void;
}

function readHistory(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (m): m is Message =>
          !!m &&
          typeof m === "object" &&
          typeof (m as Message).id === "string" &&
          ((m as Message).role === "user" || (m as Message).role === "assistant") &&
          typeof (m as Message).content === "string"
      )
      .map((m) =>
        m.pending
          ? {
              ...m,
              pending: false,
              error: true,
              content: m.content || "Request interrupted before completion.",
            }
          : m
      );
  } catch {
    return [];
  }
}

function writeHistory(messages: Message[]): void {
  if (typeof window === "undefined") return;
  try {
    if (messages.length === 0) {
      localStorage.removeItem(HISTORY_KEY);
    } else {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(messages));
    }
  } catch {
    // Ignore storage quota or private-mode access errors
  }
}

export function useChat(): UseChatResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { findMatch } = useCannedResponses();
  const { profile } = useProfile();

  const hydratedRef = useRef(false);
  const inFlightRef = useRef(false);
  const generationRef = useRef(0);

  // Hydrate persisted history on mount and sync across tabs / Settings resets.
  useEffect(() => {
    setMessages(readHistory());
    hydratedRef.current = true;

    const onStorage = (e: StorageEvent): void => {
      if (e.key === null || e.key === HISTORY_KEY) {
        setMessages(readHistory());
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Persist conversation updates once initial hydration completes.
  useEffect(() => {
    if (!hydratedRef.current) return;
    writeHistory(messages);
  }, [messages]);

  const sendMessage = useCallback(
    async (question: string): Promise<void> => {
      const trimmed = question.trim();
      if (!trimmed || isLoading || inFlightRef.current) return;

      const canned = findMatch(trimmed);
      if (canned) {
        playSentSound();
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
        playReceivedSound();
        return;
      }

      inFlightRef.current = true;
      const requestGen = ++generationRef.current;

      playSentSound();
      const now = Date.now();
      const userMsg: Message = {
        id: genId(),
        role: "user",
        content: trimmed,
        timestamp: now,
      };
      const assistantId = genId();
      const pendingMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: now + 1,
        pending: true,
      };

      setMessages((prev) => [...prev, userMsg, pendingMsg]);
      setIsLoading(true);

      try {
        const data = await askQuestion(trimmed, profile.assistantName);
        if (generationRef.current !== requestGen) return;

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
        if (generationRef.current !== requestGen) return;

        const message = err instanceof Error ? err.message : "Unknown error";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: message, pending: false, error: true }
              : m
          )
        );
      } finally {
        if (generationRef.current === requestGen) {
          inFlightRef.current = false;
          setIsLoading(false);
        }
      }
    },
    [isLoading, findMatch, profile.assistantName]
  );

  const stopGeneration = useCallback((): void => {
    if (!inFlightRef.current) return;
    generationRef.current += 1;
    inFlightRef.current = false;
    setIsLoading(false);
    setMessages((prev) =>
      prev.map((m) =>
        m.pending
          ? {
              ...m,
              pending: false,
              error: true,
              content: "Generation stopped.",
            }
          : m
      )
    );
  }, []);

  const clearChat = useCallback((): void => {
    generationRef.current += 1;
    inFlightRef.current = false;
    setIsLoading(false);
    setMessages([]);
    writeHistory([]);
  }, []);

  return { messages, isLoading, sendMessage, stopGeneration, clearChat };
}
