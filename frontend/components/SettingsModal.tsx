"use client";

import * as React from "react";
import { X, Check, AlertCircle, Trash2 } from "lucide-react";
import type { KeySetPayload } from "@/lib/types";
import { useKeys } from "@/hooks/useKeys";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const PROVIDERS = [
  { id: "groq", label: "Groq", hint: "Free, fastest — console.groq.com" },
  { id: "gemini", label: "Google Gemini", hint: "Free tier — aistudio.google.com" },
  { id: "openrouter", label: "OpenRouter", hint: "Free models — openrouter.ai" },
  { id: "openai", label: "OpenAI", hint: "Paid — platform.openai.com" },
  { id: "ollama", label: "Ollama (local)", hint: "No key — set base_url only" },
  { id: "custom", label: "Custom endpoint", hint: "Any OpenAI-compatible URL" },
];

export function SettingsModal({ open, onClose }: SettingsModalProps): JSX.Element | null {
  const { keys, test, save, remove } = useKeys();
  const [provider, setProvider] = React.useState("groq");
  const [apiKey, setApiKey] = React.useState("");
  const [model, setModel] = React.useState("");
  const [baseUrl, setBaseUrl] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null);

  if (!open) return null;

  const current = keys[provider];

  const runTest = async (): Promise<void> => {
    setBusy(true);
    setStatus(null);
    const payload: KeySetPayload = { provider, api_key: apiKey, model, base_url: baseUrl };
    const res = await test(payload);
    setBusy(false);
    setStatus(res.ok
      ? { kind: "ok", text: `Working — model replied "${res.reply}"` }
      : { kind: "err", text: res.error || "Test failed" });
  };

  const runSave = async (): Promise<void> => {
    setBusy(true);
    try {
      await save({ provider, api_key: apiKey, model, base_url: baseUrl });
      setStatus({ kind: "ok", text: "Saved." });
      setApiKey("");
    } catch (err) {
      setStatus({ kind: "err", text: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setBusy(false);
    }
  };

  const runDelete = async (): Promise<void> => {
    setBusy(true);
    try {
      await remove(provider);
      setStatus({ kind: "info", text: "Key removed." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#131923] p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-gray-100">API Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <label className="block text-xs font-medium text-gray-400 mb-1">Provider</label>
        <select
          value={provider}
          onChange={(e) => { setProvider(e.target.value); setStatus(null); }}
          className="w-full mb-3 rounded-md border border-white/10 bg-[#0b0f14] px-3 py-2 text-sm text-gray-100"
        >
          {PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>{p.label} — {p.hint}</option>
          ))}
        </select>

        {current?.configured && (
          <div className="mb-3 flex items-center gap-2 rounded-md border border-green-900/50 bg-green-950/40 px-3 py-2 text-xs text-green-300">
            <Check size={14} /> Key configured: {current.masked_key}
            <button
              type="button"
              onClick={runDelete}
              className="ml-auto flex items-center gap-1 text-red-300 hover:text-red-200"
            >
              <Trash2 size={12} /> Remove
            </button>
          </div>
        )}

        {provider !== "ollama" && (
          <>
            <label className="block text-xs font-medium text-gray-400 mb-1">API key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={current?.configured ? "Enter a new key to replace" : "Paste your key"}
              className="w-full mb-3 rounded-md border border-white/10 bg-[#0b0f14] px-3 py-2 text-sm text-gray-100"
            />
          </>
        )}

        <label className="block text-xs font-medium text-gray-400 mb-1">Model (optional)</label>
        <input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="Leave blank to use the default"
          className="w-full mb-3 rounded-md border border-white/10 bg-[#0b0f14] px-3 py-2 text-sm text-gray-100"
        />

        <label className="block text-xs font-medium text-gray-400 mb-1">Base URL (optional)</label>
        <input
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="Required for ollama and custom"
          className="w-full mb-4 rounded-md border border-white/10 bg-[#0b0f14] px-3 py-2 text-sm text-gray-100"
        />

        {status && (
          <div className={`mb-3 flex items-start gap-2 rounded-md px-3 py-2 text-xs ${
            status.kind === "ok" ? "bg-green-950/40 text-green-300" :
            status.kind === "err" ? "bg-red-950/40 text-red-300" :
            "bg-blue-950/40 text-blue-300"
          }`}>
            {status.kind === "err" && <AlertCircle size={14} className="mt-0.5 shrink-0" />}
            <span>{status.text}</span>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={runTest}
            className="rounded-md border border-white/10 px-3 py-2 text-sm text-gray-200 hover:bg-white/5 disabled:opacity-50"
          >
            Test
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={runSave}
            className="rounded-md bg-[#5FB2F2] px-3 py-2 text-sm font-medium text-[#06233a] hover:brightness-110 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
