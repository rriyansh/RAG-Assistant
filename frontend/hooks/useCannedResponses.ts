"use client";

import { useCallback, useEffect, useState } from "react";
import type { CannedResponse } from "@/lib/types";

const KEY = "rag.canned";
const EVENT_NAME = "rag:canned";

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function read(): CannedResponse[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is CannedResponse =>
          !!x &&
          typeof x === "object" &&
          typeof (x as CannedResponse).id === "string" &&
          typeof (x as CannedResponse).trigger === "string" &&
          typeof (x as CannedResponse).response === "string"
      )
      .map((x): CannedResponse => ({
        id: x.id,
        trigger: x.trigger.trim(),
        response: x.response.trim(),
        matchMode: x.matchMode === "exact" ? "exact" : "contains",
      }))
      .filter((x) => x.trigger.length > 0 && x.response.length > 0);
  } catch {
    return [];
  }
}

function write(items: CannedResponse[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    // Ignore storage quota or private-mode access errors
  }
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

    const syncLocal = (): void => setItems(read());
    const syncStorage = (e: StorageEvent): void => {
      if (e.key === null || e.key === KEY) {
        setItems(read());
      }
    };

    window.addEventListener(EVENT_NAME, syncLocal);
    window.addEventListener("storage", syncStorage);
    return () => {
      window.removeEventListener(EVENT_NAME, syncLocal);
      window.removeEventListener("storage", syncStorage);
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
          id: createId(),
          trigger: trimmedTrigger,
          response: trimmedResponse,
          matchMode: matchMode === "exact" ? "exact" : "contains",
        },
      ];
      write(next);
      setItems(next);
    },
    []
  );

  const update = useCallback((id: string, patch: Partial<CannedResponse>): void => {
    const next = read().map((item) => {
      if (item.id !== id) return item;

      const nextTrigger =
        typeof patch.trigger === "string" ? patch.trigger.trim() : item.trigger;
      const nextResponse =
        typeof patch.response === "string" ? patch.response.trim() : item.response;

      if (!nextTrigger || !nextResponse) return item;

      return {
        ...item,
        trigger: nextTrigger,
        response: nextResponse,
        matchMode:
          patch.matchMode !== undefined
            ? patch.matchMode === "exact"
              ? "exact"
              : "contains"
            : item.matchMode,
      };
    });

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

    // 1. Exact matches always take top priority
    for (const item of all) {
      const trig = item.trigger.trim().toLowerCase();
      if (!trig) continue;
      if (item.matchMode === "exact" && q === trig) {
        return item;
      }
    }

    // 2. For substring rules, prefer the most specific (longest) matching trigger
    let bestContains: CannedResponse | null = null;
    for (const item of all) {
      const trig = item.trigger.trim().toLowerCase();
      if (!trig) continue;
      if (item.matchMode === "contains" && q.includes(trig)) {
        if (!bestContains || trig.length > bestContains.trigger.trim().length) {
          bestContains = item;
        }
      }
    }

    return bestContains;
  }, []);

  return { items, add, update, remove, findMatch };
}
