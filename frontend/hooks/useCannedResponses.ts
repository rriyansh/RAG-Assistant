"use client";

import { useCallback, useEffect, useState } from "react";
import type { CannedResponse } from "@/lib/types";

const KEY = "rag.canned";

function read(): CannedResponse[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is CannedResponse =>
        !!x && typeof x.id === "string" && typeof x.trigger === "string" && typeof x.response === "string"
      )
      .map((x) => ({
        id: x.id,
        trigger: x.trigger,
        response: x.response,
        matchMode: x.matchMode === "exact" ? "exact" : "contains",
      }));
  } catch {
    return [];
  }
}

function write(items: CannedResponse[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("rag:canned"));
}

export interface UseCannedResult {
  items: CannedResponse[];
  add: (trigger: string, response: string, matchMode?: "contains" | "exact") => void;
  update: (id: string, patch: Partial<CannedResponse>) => void;
  remove: (id: string) => void;
  findMatch: (question: string) => CannedResponse | null;
}

export function useCannedResponses(): UseCannedResult {
  const [items, setItems] = useState<CannedResponse[]>([]);

  useEffect(() => {
    setItems(read());
    const on = (): void => setItems(read());
    window.addEventListener("rag:canned", on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener("rag:canned", on);
      window.removeEventListener("storage", on);
    };
  }, []);

  const add = useCallback(
    (trigger: string, response: string, matchMode: "contains" | "exact" = "contains"): void => {
      const trimmedTrigger = trigger.trim();
      const trimmedResponse = response.trim();
      if (!trimmedTrigger || !trimmedResponse) return;
      const next: CannedResponse[] = [
        ...read(),
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          trigger: trimmedTrigger,
          response: trimmedResponse,
          matchMode,
        },
      ];
      write(next);
      setItems(next);
    },
    []
  );

  const update = useCallback((id: string, patch: Partial<CannedResponse>): void => {
    const next = read().map((x) => (x.id === id ? { ...x, ...patch } : x));
    write(next);
    setItems(next);
  }, []);

  const remove = useCallback((id: string): void => {
    const next = read().filter((x) => x.id !== id);
    write(next);
    setItems(next);
  }, []);

  const findMatch = useCallback((question: string): CannedResponse | null => {
    const q = question.trim().toLowerCase();
    if (!q) return null;
    const all = read();
    // exact match wins
    for (const item of all) {
      if (item.matchMode === "exact" && q === item.trigger.toLowerCase()) return item;
    }
    for (const item of all) {
      if (item.matchMode === "contains" && q.includes(item.trigger.toLowerCase())) return item;
    }
    return null;
  }, []);

  return { items, add, update, remove, findMatch };
}
