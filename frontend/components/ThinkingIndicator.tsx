"use client";

import * as React from "react";
import { fetchThinking } from "@/lib/api";

interface ThinkingIndicatorProps {
  /** How many messages to pre-fetch. Default 30. */
  count?: number;
  /** How long each message stays visible (ms). Default 1800. */
  interval?: number;
}

const DEFAULT_MESSAGES = ["Thinking…"];

let cachedMessages: string[] | null = null;
let inflightFetch: Promise<string[]> | null = null;

function loadThinkingPool(count: number): Promise<string[]> {
  if (cachedMessages && cachedMessages.length > 0) {
    return Promise.resolve(cachedMessages);
  }
  if (inflightFetch) {
    return inflightFetch;
  }

  inflightFetch = fetchThinking(count)
    .then((res) => {
      const valid = Array.isArray(res.messages)
        ? res.messages.map((m) => m.trim()).filter(Boolean)
        : [];
      if (valid.length > 0) {
        cachedMessages = valid;
        return valid;
      }
      return DEFAULT_MESSAGES;
    })
    .catch(() => DEFAULT_MESSAGES)
    .finally(() => {
      inflightFetch = null;
    });

  return inflightFetch;
}

export function ThinkingIndicator({
  count = 30,
  interval = 1800,
}: ThinkingIndicatorProps): JSX.Element {
  const [pool, setPool] = React.useState<string[]>(
    () => cachedMessages ?? DEFAULT_MESSAGES
  );
  const [index, setIndex] = React.useState<number>(() =>
    cachedMessages && cachedMessages.length > 1
      ? Math.floor(Math.random() * cachedMessages.length)
      : 0
  );

  // Populate pool from module cache or backend once per mount.
  React.useEffect(() => {
    let alive = true;
    void loadThinkingPool(count).then((messages) => {
      if (!alive || messages.length === 0) return;
      setPool(messages);
      setIndex((prev) =>
        messages.length > 1 && prev === 0
          ? Math.floor(Math.random() * messages.length)
          : prev % messages.length
      );
    });
    return () => {
      alive = false;
    };
  }, [count]);

  // Rotate phrases only when multiple messages are available.
  React.useEffect(() => {
    if (pool.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % pool.length);
    }, interval);
    return () => window.clearInterval(id);
  }, [pool.length, interval]);

  const activeText = pool[index % pool.length] ?? DEFAULT_MESSAGES[0];

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2.5 text-sm text-gray-300 select-none"
    >
      <style>{`
        @keyframes thinkingTextIn {
          from {
            opacity: 0;
            transform: translateY(3px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes thinkingDotPulse {
          0%, 80%, 100% {
            transform: translateY(0) scale(0.85);
            opacity: 0.45;
          }
          40% {
            transform: translateY(-3px) scale(1);
            opacity: 1;
          }
        }
        .thinking-text-enter {
          animation: thinkingTextIn 280ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .thinking-dot {
          animation: thinkingDotPulse 1.2s ease-in-out infinite;
        }
      `}</style>

      <span className="inline-flex items-center gap-1" aria-hidden="true">
        <span
          className="thinking-dot h-1.5 w-1.5 rounded-full bg-[#5FB2F2]"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="thinking-dot h-1.5 w-1.5 rounded-full bg-[#5FB2F2]"
          style={{ animationDelay: "160ms" }}
        />
        <span
          className="thinking-dot h-1.5 w-1.5 rounded-full bg-[#5FB2F2]"
          style={{ animationDelay: "320ms" }}
        />
      </span>

      <span key={`${index}-${activeText}`} className="thinking-text-enter">
        {activeText}
      </span>
    </div>
  );
}
