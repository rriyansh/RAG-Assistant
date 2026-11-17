
"use client";

import * as React from "react";
import { fetchThinking } from "@/lib/api";

interface ThinkingIndicatorProps {
  /** How many messages to pre-fetch. Default 30. */
  count?: number;
  /** How long each message stays visible (ms). Default 1800. */
  interval?: number;
}

export function ThinkingIndicator({
  count = 30,
  interval = 1800,
}: ThinkingIndicatorProps): JSX.Element {
  const [pool, setPool] = React.useState<string[]>(["Thinking…"]);
  const [index, setIndex] = React.useState(0);

  // Load the pool once per mount.
  React.useEffect(() => {
    let alive = true;
    void fetchThinking(count)
      .then((r) => { if (alive && r.messages.length) setPool(r.messages); })
      .catch(() => {});
    return () => { alive = false; };
  }, [count]);

  // Rotate.
  React.useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % pool.length);
    }, interval);
    return () => window.clearInterval(id);
  }, [pool.length, interval]);

  return (
    <div className="flex items-center gap-2 text-sm text-gray-300">
      <span className="inline-flex gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" />
      </span>
      <span key={index} className="animate-[fadeIn_.3s_ease]">
        {pool[index]}
      </span>
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(2px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
