"use client";

import * as React from "react";
import {
  X, Check, AlertCircle, Trash2, Upload, Plus, Info,
} from "lucide-react";
import type { KeySetPayload, ParamsInfo, Profile } from "@/lib/types";
import { useKeys } from "@/hooks/useKeys";
import { useProfile } from "@/hooks/useProfile";
import { useCannedResponses } from "@/hooks/useCannedResponses";
import { detectKey, fetchParams, enhancePrompt } from "@/lib/api";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

type Tab = "identity" | "api" | "params" | "canned";

const PROVIDERS = [
  { id: "groq", label: "Groq", hint: "Free — console.groq.com" },
  { id: "gemini", label: "Google Gemini", hint: "Free — aistudio.google.com" },
  { id: "openrouter", label: "OpenRouter", hint: "Free models — openrouter.ai" },
  { id: "openai", label: "OpenAI", hint: "Paid — platform.openai.com" },
  { id: "ollama", label: "Ollama (local)", hint: "No key — set base_url" },
  { id: "custom", label: "Custom endpoint", hint: "Any OpenAI-compatible URL" },
];

export function SettingsModal({ open, onClose }: SettingsModalProps): JSX.Element | null {
  const [tab, setTab] = React.useState<Tab>("identity");
  const { keys, test, save, remove } = useKeys();
  const { profile, setName, setAvatarFromFile, clearAvatar } = useProfile();
  const { items: canned, add: addCanned, remove: removeCanned } = useCannedResponses();

  // ---- API key state ----
  const [rawKey, setRawKey] = React.useState("");
  const [detected, setDetected] = React.useState<string>("");
  const [detectedHint, setDetectedHint] = React.useState<string>("");
  const [provider, setProvider] = React.useState("groq");
  const [model, setModel] = React.useState("");
  const [baseUrl, setBaseUrl] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState<
    { kind: "ok" | "err" | "info"; text: string } | null
  >(null);

  // ---- Params state ----
  const [params, setParams] = React.useState<ParamsInfo | null>(null);

  // ---- Canned state ----
  const [cannedTrigger, setCannedTrigger] = React.useState("");
  const [cannedResponse, setCannedResponse] = React.useState("");
  const [cannedMode, setCannedMode] = React.useState<"contains" | "exact">("contains");

  // ---- Avatar file input ----
  const avatarInputRef = React.useRef<HTMLInputElement | null>(null);

  // Load params when the modal opens on the params tab
  React.useEffect(() => {
    if (!open) return;
    if (tab !== "params") return;
    void fetchParams().then(setParams).catch(() => setParams(null));
  }, [open, tab]);

  // Debounced detection as the user types the key
  React.useEffect(() => {
    if (!rawKey.trim()) {
      setDetected("");
      setDetectedHint("");
      return;
    }
    const t = window.setTimeout(async () => {
      try {
        const r = await detectKey(rawKey);
        setDetected(r.provider);
        setDetectedHint(r.hint);
        if (r.provider !== "unknown") setProvider(r.provider);
      } catch {
        setDetected("");
        setDetectedHint("");
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, [rawKey]);

  if (!open) return null;

  const current = keys[provider];

  const runTest = async (): Promise<void> => {
    setBusy(true);
    setStatus(null);
    const payload: KeySetPayload = { provider, api_key: rawKey, model, base_url: baseUrl };
    const res = await test(payload);
    setBusy(false);
    setStatus(
      res.ok
        ? { kind: "ok", text: `Working — replied "${res.reply}"` }
        : { kind: "err", text: res.error || "Test failed" }
    );
  };

  const runSave = async (): Promise<void> => {
    setBusy(true);
    try {
      await save({ provider, api_key: rawKey, model, base_url: baseUrl });
      setStatus({ kind: "ok", text: `Saved key for ${provider}.` });
      setRawKey("");
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
      setStatus({ kind: "info", text: `Removed key for ${provider}.` });
    } finally {
      setBusy(false);
    }
  };

  const onAvatarPicked = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      await setAvatarFromFile(file);
    } catch (err) {
      setStatus({ kind: "err", text: err instanceof Error ? err.message : "Upload failed" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-white/10 bg-[#131923] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <h2 className="font-display text-lg font-semibold text-gray-100">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-white/10 px-3 py-2 overflow-x-auto">
          {([
            ["identity", "Identity"],
            ["api", "API Key"],
            ["params", "Parameters"],
            ["canned", "Custom Replies"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => { setTab(id); setStatus(null); }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition whitespace-nowrap ${
                tab === id
                  ? "bg-[#5FB2F2] text-[#06233a]"
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">

          {/* ============ IDENTITY ============ */}
          {tab === "identity" && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <AvatarPreview profile={profile} />
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-400 mb-1">Display name</label>
                  <input
                    value={profile.name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-md border border-white/10 bg-[#0b0f14] px-3 py-2 text-sm text-gray-100"
                    placeholder="Your name"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-2 text-xs text-gray-200 hover:bg-white/5"
                >
                  <Upload size={14} /> Upload avatar
                </button>
                {profile.avatarDataUrl && (
                  <button
                    type="button"
                    onClick={clearAvatar}
                    className="flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-2 text-xs text-red-300 hover:bg-red-950/30"
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                )}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onAvatarPicked}
                />
              </div>
              <p className="text-xs text-gray-500">Avatar is stored locally in your browser. Max 2 MB.</p>
            </div>
          )}

          {/* ============ API KEY ============ */}
          {tab === "api" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Paste an API key — the provider is detected automatically
                </label>
                <input
                  type="password"
                  value={rawKey}
                  onChange={(e) => setRawKey(e.target.value)}
                  placeholder="sk-..., gsk_..., AIza..., sk-or-v1-..."
                  className="w-full rounded-md border border-white/10 bg-[#0b0f14] px-3 py-2 text-sm text-gray-100 font-mono"
                />
                {detected && detected !== "unknown" && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-green-400">
                    <Check size={12} /> Detected: <span className="font-semibold">{detected}</span>
                    {detectedHint && <span className="text-gray-500">— {detectedHint}</span>}
                  </p>
                )}
                {detected === "unknown" && rawKey.trim() && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-yellow-400">
                    <Info size={12} /> Could not detect provider. Pick one manually below.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Provider</label>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="w-full rounded-md border border-white/10 bg-[#0b0f14] px-3 py-2 text-sm text-gray-100"
                  >
                    {PROVIDERS.map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-gray-500">
                    {PROVIDERS.find((p) => p.id === provider)?.hint}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Model (optional)</label>
                  <input
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="Leave blank for default"
                    className="w-full rounded-md border border-white/10 bg-[#0b0f14] px-3 py-2 text-sm text-gray-100"
                  />
                </div>
              </div>

              {(provider === "ollama" || provider === "custom") && (
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Base URL</label>
                  <input
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder={
                      provider === "ollama"
                        ? "http://localhost:11434/v1"
                        : "https://your-server.com/v1"
                    }
                    className="w-full rounded-md border border-white/10 bg-[#0b0f14] px-3 py-2 text-sm text-gray-100"
                  />
                </div>
              )}

              {current?.configured && (
                <div className="flex items-center gap-2 rounded-md border border-green-900/50 bg-green-950/40 px-3 py-2 text-xs text-green-300">
                  <Check size={14} /> Configured: {current.masked_key}
                  <button
                    type="button"
                    onClick={runDelete}
                    className="ml-auto flex items-center gap-1 text-red-300 hover:text-red-200"
                  >
                    <Trash2 size={12} /> Remove
                  </button>
                </div>
              )}

              {status && <StatusBar status={status} />}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  disabled={busy || !rawKey.trim()}
                  onClick={runTest}
                  className="rounded-md border border-white/10 px-3 py-2 text-sm text-gray-200 hover:bg-white/5 disabled:opacity-50"
                >
                  Test
                </button>
                <button
                  type="button"
                  disabled={busy || !rawKey.trim()}
                  onClick={runSave}
                  className="rounded-md bg-[#5FB2F2] px-3 py-2 text-sm font-medium text-[#06233a] hover:brightness-110 disabled:opacity-50"
                >
                  Save
                </button>
              </div>

              <div className="rounded-md border border-white/10 bg-[#0b0f14]/60 px-3 py-2 text-[11px] text-gray-500">
                <strong className="text-gray-400">Detected key formats:</strong>{" "}
                <span className="font-mono">gsk_</span> (Groq),{" "}
                <span className="font-mono">AIza</span> (Gemini),{" "}
                <span className="font-mono">sk-or-v1-</span> (OpenRouter),{" "}
                <span className="font-mono">sk-</span> (OpenAI). Anthropic keys are detected but not yet supported as a provider.
              </div>
            </div>
          )}

          {/* ============ PARAMS ============ */}
          {tab === "params" && (
            <div>
              {!params && <p className="text-sm text-gray-400">Loading…</p>}
              {params && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <ParamRow label="LLM provider" value={params.llm_provider} />
                  <ParamRow label="Embedding provider" value={params.embedding_provider} />
                  <ParamRow label="Embedding model" value={params.embedding_model} />
                  <ParamRow label="Chunk size (tokens)" value={String(params.chunk_size)} />
                  <ParamRow label="Chunk overlap" value={String(params.chunk_overlap)} />
                  <ParamRow label="Top-K chunks" value={String(params.top_k)} />
                  <ParamRow label="Web search" value={params.web_search_enabled ? "On" : "Off"} />
                  <ParamRow label="Web provider" value={params.web_search_provider} />
                  <ParamRow
                    label="Web fallback threshold"
                    value={params.web_fallback_threshold.toFixed(2)}
                  />
                </div>
              )}
            </div>
          )}

          {/* ============ CANNED ============ */}
          {tab === "canned" && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">
                Custom replies are answered locally in the browser — no API call, no tokens, instant.
                When your message matches a trigger, the assistant replies immediately.
              </p>

              <div className="rounded-lg border border-white/10 bg-[#0b0f14]/60 p-3 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <input
                    value={cannedTrigger}
                    onChange={(e) => setCannedTrigger(e.target.value)}
                    placeholder="Trigger (e.g. /help)"
                    className="col-span-2 rounded-md border border-white/10 bg-[#0b0f14] px-3 py-2 text-sm text-gray-100"
                  />
                  <select
                    value={cannedMode}
                    onChange={(e) => setCannedMode(e.target.value as "contains" | "exact")}
                    className="rounded-md border border-white/10 bg-[#0b0f14] px-2 py-2 text-sm text-gray-100"
                  >
                    <option value="contains">contains</option>
                    <option value="exact">exact</option>
                  </select>
                </div>
                <textarea
                  value={cannedResponse}
                  onChange={(e) => setCannedResponse(e.target.value)}
                  placeholder="Response text"
                  rows={2}
                  className="w-full rounded-md border border-white/10 bg-[#0b0f14] px-3 py-2 text-sm text-gray-100 resize-none"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (!cannedTrigger.trim() || !cannedResponse.trim()) return;
                      addCanned(cannedTrigger, cannedResponse, cannedMode);
                      setCannedTrigger("");
                      setCannedResponse("");
                    }}
                    className="flex items-center gap-1.5 rounded-md bg-[#5FB2F2] px-3 py-1.5 text-xs font-medium text-[#06233a] hover:brightness-110"
                  >
                    <Plus size={12} /> Add reply
                  </button>
                </div>
              </div>

              {canned.length === 0 && (
                <p className="text-xs text-gray-500 text-center py-4">No custom replies yet.</p>
              )}

              <div className="space-y-2">
                {canned.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-md border border-white/10 bg-[#0b0f14]/60 px-3 py-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-[#5FB2F2] truncate">
                          {c.trigger}{" "}
                          <span className="text-gray-600">({c.matchMode})</span>
                        </p>
                        <p className="mt-1 text-gray-300 whitespace-pre-wrap break-words">
                          {c.response}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCanned(c.id)}
                        className="shrink-0 text-red-300 hover:text-red-200"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-5 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-[#5FB2F2] px-4 py-2 text-sm font-medium text-[#06233a] hover:brightness-110"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function AvatarPreview({ profile }: { profile: Profile }): JSX.Element {
  if (profile.avatarDataUrl) {
    return (
      <img
        src={profile.avatarDataUrl}
        alt=""
        className="h-16 w-16 rounded-full object-cover border border-white/10"
      />
    );
  }
  const initial = profile.name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-white text-xl font-semibold border border-white/10">
      {initial}
    </div>
  );
}

function ParamRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-md border border-white/10 bg-[#0b0f14]/60 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-0.5 font-mono text-sm text-gray-100">{value}</p>
    </div>
  );
}

function StatusBar({
  status,
}: {
  status: { kind: "ok" | "err" | "info"; text: string };
}): JSX.Element {
  const cls =
    status.kind === "ok"
      ? "bg-green-950/40 text-green-300 border-green-900/50"
      : status.kind === "err"
        ? "bg-red-950/40 text-red-300 border-red-900/50"
        : "bg-blue-950/40 text-blue-300 border-blue-900/50";
  return (
    <div className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${cls}`}>
      {status.kind === "err" && <AlertCircle size={14} className="mt-0.5 shrink-0" />}
      <span>{status.text}</span>
    </div>
  );
}
