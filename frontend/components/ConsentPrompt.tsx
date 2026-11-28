// components/ConsentPrompt.tsx
"use client";

import React from "react";
import { ShieldAlert, Check, X } from "lucide-react";
import { PendingConsent } from "../lib/types";

interface ConsentPromptProps {
  pending: PendingConsent;
  assistantName?: string;
  onApprove: (toolName: string) => void;
  onDeny: (toolName: string) => void;
  disabled?: boolean;
}

export function ConsentPrompt({
  pending,
  assistantName = "Assistant",
  onApprove,
  onDeny,
  disabled = false,
}: ConsentPromptProps) {
  return (
    <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-950/30 p-3 text-xs text-amber-100 shadow-sm">
      <div className="flex items-start gap-2.5">
        <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          <p className="leading-relaxed">
            <span className="font-semibold">{assistantName}</span> wants to use{" "}
            <code className="rounded bg-amber-900/60 px-1.5 py-0.5 font-mono text-amber-200">
              {pending.name}
            </code>{" "}
            with arguments:
          </p>
          <pre className="rounded bg-slate-950/80 p-2 font-mono text-[11px] text-slate-200 overflow-x-auto whitespace-pre-wrap break-all">
            {JSON.stringify(pending.args, null, 2)}
          </pre>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onApprove(pending.approval || pending.name)}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
            >
              <Check className="h-3.5 w-3.5" />
              Approve
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onDeny(pending.approval || pending.name)}
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-1.5 font-medium text-slate-200 hover:bg-rose-600 hover:text-white disabled:opacity-50 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Deny
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConsentPrompt;
