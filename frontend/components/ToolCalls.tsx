// components/ToolCalls.tsx
"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Terminal,
  XCircle,
} from "lucide-react";
import { ToolCall } from "../lib/types";

interface ToolCallsProps {
  toolCalls: ToolCall[];
}

export default function ToolCalls({ toolCalls }: ToolCallsProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  if (!toolCalls || toolCalls.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 rounded-lg border border-slate-700/70 bg-slate-900/70 text-xs text-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-3 py-2 text-left font-medium hover:bg-slate-800/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-indigo-400" />
          <span>
            Tool Calls ({toolCalls.length})
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="divide-y divide-slate-800 border-t border-slate-800 px-3 py-2 space-y-2">
          {toolCalls.map((tc, idx) => (
            <div
              key={tc.id || `${tc.name}-${idx}`}
              className="pt-2 first:pt-0 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono font-semibold text-slate-100">
                  {tc.status === "ok" && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  )}
                  {tc.status === "error" && (
                    <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                  )}
                  {tc.status === "pending" && (
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                  )}
                  <span>{tc.name}</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <Clock className="h-3 w-3" />
                  <span>{tc.duration_ms} ms</span>
                </div>
              </div>

              <div className="rounded bg-slate-950/80 p-2 font-mono text-[11px] text-slate-300 overflow-x-auto">
                <div className="text-slate-500 mb-0.5">Arguments:</div>
                <pre className="whitespace-pre-wrap break-all">
                  {JSON.stringify(tc.args, null, 2)}
                </pre>
              </div>

              {tc.result_summary && (
                <div className="text-slate-300 bg-slate-800/40 rounded px-2 py-1.5">
                  <span className="text-slate-400 font-medium">Result: </span>
                  <span className="break-words">{tc.result_summary}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
