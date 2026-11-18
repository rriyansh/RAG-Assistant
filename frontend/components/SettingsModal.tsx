"use client";

import * as React from "react";
import {
  X, Check, AlertCircle, Trash2, Upload, Plus, Info,
  User, KeyRound, SlidersHorizontal, MessageSquare, Shield,
  ExternalLink, ChevronDown, Sparkles, Zap, Brain, Cpu,
  Search, RotateCcw,
} from "lucide-react";
import type { KeySetPayload, ParamsInfo, Profile, FontId } from "@/lib/types";
import { useKeys } from "@/hooks/useKeys";
import { useProfile } from "@/hooks/useProfile";
import { useCannedResponses } from "@/hooks/useCannedResponses";
import { detectKey, fetchParams } from "@/lib/api";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

type Tab = "account" | "api" | "params" | "canned" | "security";

interface ModelOption {
  id: string;
  name: string;
  tagline: string;
  badge?: string;
  tier: "flagship" | "reasoning" | "fast" | "local";
}

const SECTIONS: Array<{ id: Tab; label: string; Icon: typeof User }> = [
  { id: "account", label: "Account", Icon: User },
  { id: "api", label: "API Key", Icon: KeyRound },
  { id: "params", label: "Parameters", Icon: SlidersHorizontal },
  { id: "canned", label: "Custom Replies", Icon: MessageSquare },
  { id: "security", label: "Security", Icon: Shield },
];

const PROVIDERS = [
  { id: "groq", label: "Groq", hint: "Free — console.groq.com" },
  { id: "gemini", label: "Google Gemini", hint: "Free — aistudio.google.com" },
  { id: "openrouter", label: "OpenRouter", hint: "Free models — openrouter.ai" },
  { id: "openai", label: "OpenAI", hint: "Paid — platform.openai.com" },
  { id: "ollama", label: "Ollama (local)", hint: "No key — set base_url" },
  { id: "custom", label: "Custom endpoint", hint: "Any OpenAI-compatible URL" },
];

const PROVIDER_MODELS: Record<string, ModelOption[]> = {
  groq: [
    {
      id: "llama-3.3-70b-versatile",
      name: "Llama 3.3 70B",
      tagline: "Great for most document Q&A and synthesis",
      badge: "Recommended",
      tier: "flagship",
    },
    {
      id: "deepseek-r1-distill-llama-70b",
      name: "DeepSeek R1 70B",
      tagline: "Uses step-by-step reasoning for complex queries",
      badge: "Reasoning",
      tier: "reasoning",
    },
    {
      id: "llama-3.1-8b-instant",
      name: "Llama 3.1 8B Instant",
      tagline: "Ultra-low latency responses for quick lookups",
      badge: "Fast",
      tier: "fast",
    },
    {
      id: "mixtral-8x7b-32768",
      name: "Mixtral 8x7B",
      tagline: "Balanced 32k context window MoE model",
      badge: "32k ctx",
      tier: "fast",
    },
  ],
  gemini: [
    {
      id: "gemini-2.5-pro",
      name: "Gemini 2.5 Pro",
      tagline: "Reasoning, complex synthesis & deep citation analysis",
      badge: "Pro",
      tier: "reasoning",
    },
    {
      id: "gemini-2.5-flash",
      name: "Gemini 2.5 Flash",
      tagline: "Fast all-around help with 1M token context",
      badge: "1M ctx",
      tier: "flagship",
    },
    {
      id: "gemini-2.0-flash-lite",
      name: "Gemini 2.0 Flash-Lite",
      tagline: "Cost-efficient speed for high-volume queries",
      badge: "Fast",
      tier: "fast",
    },
  ],
  openrouter: [
    {
      id: "meta-llama/llama-3.3-70b-instruct:free",
      name: "Llama 3.3 70B (Free)",
      tagline: "Zero-cost flagship open-weights performance",
      badge: "Free",
      tier: "flagship",
    },
    {
      id: "deepseek/deepseek-r1:free",
      name: "DeepSeek R1 (Free)",
      tagline: "Advanced chain-of-thought reasoning",
      badge: "Reasoning",
      tier: "reasoning",
    },
    {
      id: "google/gemini-2.5-flash",
      name: "Gemini 2.5 Flash",
      tagline: "Long-context retrieval routed via OpenRouter",
      badge: "Fast",
      tier: "fast",
    },
    {
      id: "anthropic/claude-3.7-sonnet",
      name: "Claude 3.7 Sonnet",
      tagline: "Nuanced writing and structured extraction",
      badge: "Flagship",
      tier: "flagship",
    },
  ],
  openai: [
    {
      id: "gpt-4o",
      name: "GPT-4o",
      tagline: "Great for most tasks and grounded document synthesis",
      badge: "Flagship",
      tier: "flagship",
    },
    {
      id: "o3-mini",
      name: "o3-mini",
      tagline: "Fast reasoning for logic, math, and technical docs",
      badge: "Reasoning",
      tier: "reasoning",
    },
    {
      id: "gpt-4o-mini",
      name: "GPT-4o mini",
      tagline: "Fast, lightweight model for everyday questions",
      badge: "Fast",
      tier: "fast",
    },
  ],
  ollama: [
    {
      id: "llama3.2",
      name: "Llama 3.2 (3B)",
      tagline: "Lightweight local inference on consumer hardware",
      badge: "Local",
      tier: "local",
    },
    {
      id: "qwen2.5:14b",
      name: "Qwen 2.5 14B",
      tagline: "Strong local multilingual & structured RAG accuracy",
      badge: "Local",
      tier: "flagship",
    },
    {
      id: "deepseek-r1:8b",
      name: "DeepSeek R1 8B",
      tagline: "Local reasoning model with private execution",
      badge: "Reasoning",
      tier: "reasoning",
    },
  ],
  custom: [
    {
      id: "default",
      name: "Server Default",
      tagline: "Uses the default model exposed by your endpoint",
      badge: "Endpoint",
      tier: "local",
    },
  ],
};

const FONTS: Array<{ id: FontId; label: string }> = [
  { id: "system", label: "System (SF Pro / DM Sans)" },
  { id: "dm-sans", label: "DM Sans" },
  { id: "josefin-sans", label: "Josefin Sans" },
  { id: "fredoka", label: "Fredoka" },
  { id: "open-sans", label: "Open Sans" },
  { id: "outfit", label: "Outfit" },
  { id: "plus-jakarta-sans", label: "Plus Jakarta Sans" },
];

export function SettingsModal({ open, onClose }: SettingsModalProps): JSX.Element | null {
  const [tab, setTab] = React.useState<Tab>("account");
  const { keys, test, save, remove } = useKeys();
  const {
    profile, update,
    setAvatarFromFile, clearAvatar,
    setAssistantLogoFromFile, clearAssistantLogo,
  } = useProfile();
  const { items: canned, add: addCanned, remove: removeCanned } = useCannedResponses();

  const [rawKey, setRawKey] = React.useState("");
  const [detected, setDetected] = React.useState("");
  const [detectedHint, setDetectedHint] = React.useState("");
  const [provider, setProvider] = React.useState("groq");
  const [model, setModel] = React.useState("");
  const [baseUrl, setBaseUrl] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null);

  const [modelMenuOpen, setModelMenuOpen] = React.useState(false);
  const [modelSearch, setModelSearch] = React.useState("");
  const modelPickerRef = React.useRef<HTMLDivElement | null>(null);
  const modelSearchInputRef = React.useRef<HTMLInputElement | null>(null);

  const [params, setParams] = React.useState<ParamsInfo | null>(null);

  const [cannedTrigger, setCannedTrigger] = React.useState("");
  const [cannedResponse, setCannedResponse] = React.useState("");
  const [cannedMode, setCannedMode] = React.useState<"contains" | "exact">("contains");

  const avatarInputRef = React.useRef<HTMLInputElement | null>(null);
  const logoInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!open || tab !== "params") return;
    void fetchParams().then(setParams).catch(() => setParams(null));
  }, [open, tab]);

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

  React.useEffect(() => {
    if (!modelMenuOpen) return;
    const handlePointerDown = (e: MouseEvent): void => {
      if (modelPickerRef.current && !modelPickerRef.current.contains(e.target as Node)) {
        setModelMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setModelMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    const focusTimer = window.setTimeout(() => {
      modelSearchInputRef.current?.focus();
    }, 60);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [modelMenuOpen]);

  if (!open) return null;

  const current = keys[provider];
  const providerOptions = PROVIDER_MODELS[provider] ?? PROVIDER_MODELS.custom;
  const selectedPreset = providerOptions.find((m) => m.id === model);
  const filteredModels = providerOptions.filter((m) => {
    const q = modelSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      m.name.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q) ||
      m.tagline.toLowerCase().includes(q)
    );
  });

  const handleProviderChange = (nextProvider: string): void => {
    setProvider(nextProvider);
    setModelSearch("");
    setModelMenuOpen(false);
    const wasPreset = Object.values(PROVIDER_MODELS)
      .flat()
      .some((m) => m.id === model);
    if (wasPreset) {
      setModel("");
    }
  };

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

  const onLogoPicked = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      await setAssistantLogoFromFile(file);
    } catch (err) {
      setStatus({ kind: "err", text: err instanceof Error ? err.message : "Upload failed" });
    }
  };

  const clearAllLocalData = (): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("rag.profile");
    localStorage.removeItem("rag.canned");
    localStorage.removeItem("rag.history");
    window.dispatchEvent(new CustomEvent("rag:profile"));
    window.dispatchEvent(new CustomEvent("rag:canned"));
    setStatus({ kind: "info", text: "All local data cleared." });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 fade-in">
      <style>{`
        @keyframes modelPopoverIn {
          0% {
            opacity: 0;
            transform: translateY(-6px) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes modelItemStagger {
          0% {
            opacity: 0;
            transform: translateY(4px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .model-popover-enter {
          animation: modelPopoverIn 180ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transform-origin: top right;
        }
        .model-item-enter {
          opacity: 0;
          animation: modelItemStagger 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-white/10 bg-[#131923] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <h2 className="font-display text-lg font-semibold text-gray-100">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-white/10 hover:text-white transition"
            aria-label="Close settings"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 min-h-0">
          <nav className="md:w-52 shrink-0 border-b md:border-b-0 md:border-r border-white/10 bg-[#0f141c]/40">
            <div className="flex md:flex-col overflow-x-auto md:overflow-x-visible p-2 gap-1">
              {SECTIONS.map(({ id, label, Icon }) => {
                const active = tab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { setTab(id); setStatus(null); setModelMenuOpen(false); }}
                    className={`flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-white/10 text-gray-100"
                        : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                    }`}
                  >
                    <Icon size={15} className={active ? "text-[#5FB2F2]" : "text-gray-500"} />
                    <span className="font-medium">{label}</span>
                  </button>
                );
              })}

              <div className="hidden md:block mt-auto pt-3 border-t border-white/10 mt-3">
                <a
                  href="/terms"
                  target="_blank"
                  className="flex items-center justify-between gap-2 rounded-md px-3 py-2 text-xs text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-colors"
                >
                  Terms of Service <ExternalLink size={11} />
                </a>
                <a
                  href="/privacy"
                  target="_blank"
                  className="flex items-center justify-between gap-2 rounded-md px-3 py-2 text-xs text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-colors"
                >
                  Privacy Policy <ExternalLink size={11} />
                </a>
              </div>
            </div>
          </nav>

          <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
            {tab === "account" && (
              <div className="space-y-6 fade-in">
                <Section title="Assistant">
                  <Field label="Assistant name">
                    <input
                      value={profile.assistantName}
                      onChange={(e) => update({ assistantName: e.target.value })}
                      className="w-full rounded-md border border-white/10 bg-[#0b0f14] px-3 py-2 text-sm text-gray-100"
                      placeholder="RAG Assistant"
                    />
                  </Field>
                  <Field label="Headline">
                    <input
                      value={profile.headline}
                      onChange={(e) => update({ headline: e.target.value })}
                      className="w-full rounded-md border border-white/10 bg-[#0b0f14] px-3 py-2 text-sm text-gray-100"
                      placeholder="Ask questions from your documents"
                    />
                  </Field>
                  <Field label="Body text">
                    <textarea
                      value={profile.bodyText}
                      onChange={(e) => update({ bodyText: e.target.value })}
                      rows={2}
                      className="w-full rounded-md border border-white/10 bg-[#0b0f14] px-3 py-2 text-sm text-gray-100 resize-none"
                      placeholder="Answers are grounded in your PDFs and come with page-level citations."
                    />
                  </Field>
                  <div className="flex items-center gap-3">
                    <LogoPreview profile={profile} />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-2 text-xs text-gray-200 hover:bg-white/5 transition-colors"
                      >
                        <Upload size={14} /> Upload logo
                      </button>
                      {profile.assistantLogo && (
                        <button
                          type="button"
                          onClick={clearAssistantLogo}
                          className="flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-2 text-xs text-red-300 hover:bg-red-950/30 transition-colors"
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      )}
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={onLogoPicked}
                      />
                    </div>
                  </div>
                </Section>

                <Section title="You">
                  <Field label="Display name">
                    <input
                      value={profile.name}
                      onChange={(e) => update({ name: e.target.value })}
                      className="w-full rounded-md border border-white/10 bg-[#0b0f14] px-3 py-2 text-sm text-gray-100"
                      placeholder="Your name"
                    />
                  </Field>
                  <div className="flex items-center gap-3">
                    <AvatarPreview profile={profile} />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-2 text-xs text-gray-200 hover:bg-white/5 transition-colors"
                      >
                        <Upload size={14} /> Upload avatar
                      </button>
                      {profile.avatarDataUrl && (
                        <button
                          type="button"
                          onClick={clearAvatar}
                          className="flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-2 text-xs text-red-300 hover:bg-red-950/30 transition-colors"
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
                  </div>
                </Section>

                <Section title="Font">
                  <Field label="Interface font">
                    <select
                      value={profile.font}
                      onChange={(e) => update({ font: e.target.value as FontId })}
                      className="w-full rounded-md border border-white/10 bg-[#0b0f14] px-3 py-2 text-sm text-gray-100"
                    >
                      {FONTS.map((f) => (
                        <option key={f.id} value={f.id}>{f.label}</option>
                      ))}
                    </select>
                  </Field>
                  <div className="rounded-md border border-white/10 bg-[#0b0f14]/60 px-4 py-3">
                    <p className="font-display text-base text-gray-100">The quick brown fox jumps over the lazy dog</p>
                    <p className="mt-1 text-sm text-gray-400">Body text · 0123456789 · ABC abc</p>
                  </div>
                </Section>
              </div>
            )}

            {tab === "api" && (
              <div className="space-y-4 fade-in">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    Paste an API key — the provider is detected automatically
                  </label>
                  <input
                    type="password"
                    value={rawKey}
                    onChange={(e) => setRawKey(e.target.value)}
                    placeholder="Paste your key"
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Provider</label>
                    <select
                      value={provider}
                      onChange={(e) => handleProviderChange(e.target.value)}
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

                  {/* ChatGPT / Gemini style interactive Model Selector */}
                  <div ref={modelPickerRef} className="relative">
                    <label className="block text-xs font-medium text-gray-400 mb-1">Model</label>
                    <button
                      type="button"
                      onClick={() => setModelMenuOpen((prev) => !prev)}
                      aria-expanded={modelMenuOpen}
                      aria-haspopup="listbox"
                      className={`group flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-all duration-150 ${
                        modelMenuOpen
                          ? "border-[#5FB2F2]/60 bg-[#0b0f14] ring-2 ring-[#5FB2F2]/20"
                          : "border-white/10 bg-[#0b0f14] hover:border-white/20 hover:bg-[#0b0f14]/90"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ModelTierIcon tier={selectedPreset?.tier ?? "flagship"} />
                        <span className="truncate font-medium text-gray-100">
                          {selectedPreset
                            ? selectedPreset.name
                            : model.trim()
                              ? model
                              : "Provider default"}
                        </span>
                        {(selectedPreset?.badge || (!model.trim() && "Auto")) && (
                          <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-gray-300">
                            {selectedPreset?.badge ?? "Auto"}
                          </span>
                        )}
                      </div>
                      <ChevronDown
                        size={15}
                        className={`shrink-0 text-gray-400 transition-transform duration-200 ${
                          modelMenuOpen ? "rotate-180 text-[#5FB2F2]" : "group-hover:text-gray-200"
                        }`}
                      />
                    </button>
                    <p className="mt-1 truncate text-[11px] text-gray-500">
                      {selectedPreset
                        ? selectedPreset.tagline
                        : model.trim()
                          ? `Custom model ID: ${model}`
                          : "Uses recommended default for selected provider"}
                    </p>

                    {modelMenuOpen && (
                      <div
                        role="listbox"
                        className="model-popover-enter absolute right-0 left-0 sm:left-auto sm:w-80 z-30 mt-2 rounded-xl border border-white/15 bg-[#161e2b]/95 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.65)] overflow-hidden"
                      >
                        <div className="border-b border-white/10 px-3 py-2.5">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                              {PROVIDERS.find((p) => p.id === provider)?.label} Models
                            </span>
                            {model && (
                              <button
                                type="button"
                                onClick={() => {
                                  setModel("");
                                  setModelSearch("");
                                  setModelMenuOpen(false);
                                }}
                                className="flex items-center gap-1 text-[11px] text-[#5FB2F2] hover:underline"
                              >
                                <RotateCcw size={10} /> Reset default
                              </button>
                            )}
                          </div>

                          <div className="relative flex items-center">
                            <Search size={13} className="pointer-events-none absolute left-2.5 text-gray-500" />
                            <input
                              ref={modelSearchInputRef}
                              type="text"
                              value={modelSearch}
                              onChange={(e) => setModelSearch(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && modelSearch.trim()) {
                                  e.preventDefault();
                                  setModel(modelSearch.trim());
                                  setModelSearch("");
                                  setModelMenuOpen(false);
                                }
                              }}
                              placeholder="Filter or type custom model ID..."
                              className="w-full rounded-md border border-white/10 bg-[#0b0f14] py-1.5 pl-8 pr-2.5 text-xs text-gray-100 placeholder:text-gray-500 focus:border-[#5FB2F2]/50 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="max-h-64 overflow-y-auto p-1.5 space-y-1">
                          {/* Default Auto Option */}
                          {!modelSearch.trim() && (
                            <button
                              type="button"
                              onClick={() => {
                                setModel("");
                                setModelMenuOpen(false);
                              }}
                              className={`model-item-enter flex w-full items-start justify-between gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                                model === ""
                                  ? "bg-[#5FB2F2]/12 border border-[#5FB2F2]/30"
                                  : "border border-transparent hover:bg-white/[0.06]"
                              }`}
                            >
                              <div className="flex items-start gap-2.5 min-w-0">
                                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/[0.06] border border-white/10">
                                  <Sparkles size={13} className="text-[#5FB2F2]" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-semibold text-gray-100">Auto (Default)</span>
                                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-gray-300">
                                      Recommended
                                    </span>
                                  </div>
                                  <p className="mt-0.5 text-[11px] text-gray-400 leading-snug">
                                    Automatically picks the best default model for {provider}
                                  </p>
                                </div>
                              </div>
                              {model === "" && (
                                <Check size={14} className="mt-1 shrink-0 text-[#5FB2F2]" />
                              )}
                            </button>
                          )}

                          {filteredModels.map((opt, idx) => {
                            const isSelected = model === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                style={{ animationDelay: `${(idx + 1) * 25}ms` }}
                                onClick={() => {
                                  setModel(opt.id);
                                  setModelSearch("");
                                  setModelMenuOpen(false);
                                }}
                                className={`model-item-enter flex w-full items-start justify-between gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                                  isSelected
                                    ? "bg-[#5FB2F2]/12 border border-[#5FB2F2]/30"
                                    : "border border-transparent hover:bg-white/[0.06]"
                                }`}
                              >
                                <div className="flex items-start gap-2.5 min-w-0">
                                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/[0.06] border border-white/10">
                                    <ModelTierIcon tier={opt.tier} />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-xs font-semibold text-gray-100">{opt.name}</span>
                                      {opt.badge && (
                                        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-gray-300">
                                          {opt.badge}
                                        </span>
                                      )}
                                    </div>
                                    <p className="mt-0.5 text-[11px] text-gray-400 leading-snug">
                                      {opt.tagline}
                                    </p>
                                    <p className="mt-0.5 font-mono text-[10px] text-gray-500 truncate">
                                      {opt.id}
                                    </p>
                                  </div>
                                </div>
                                {isSelected && (
                                  <Check size={14} className="mt-1 shrink-0 text-[#5FB2F2]" />
                                )}
                              </button>
                            );
                          })}

                          {modelSearch.trim() && (
                            <button
                              type="button"
                              onClick={() => {
                                setModel(modelSearch.trim());
                                setModelSearch("");
                                setModelMenuOpen(false);
                              }}
                              className="flex w-full items-center justify-between gap-2 rounded-lg border border-dashed border-[#5FB2F2]/40 bg-[#5FB2F2]/10 px-2.5 py-2 text-left text-xs text-gray-100 hover:bg-[#5FB2F2]/15 transition-colors"
                            >
                              <span className="truncate">
                                Use custom ID: <span className="font-mono text-[#5FB2F2]">{modelSearch.trim()}</span>
                              </span>
                              <span className="shrink-0 rounded bg-[#5FB2F2] px-1.5 py-0.5 text-[10px] font-semibold text-[#06233a]">
                                Apply
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {(provider === "ollama" || provider === "custom") && (
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Base URL</label>
                    <input
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder={provider === "ollama" ? "http://localhost:11434/v1" : "https://your-server.com/v1"}
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
                    className="rounded-md border border-white/10 px-3 py-2 text-sm text-gray-200 hover:bg-white/5 disabled:opacity-50 transition-colors"
                  >
                    Test
                  </button>
                  <button
                    type="button"
                    disabled={busy || !rawKey.trim()}
                    onClick={runSave}
                    className="rounded-md bg-[#5FB2F2] px-3 py-2 text-sm font-medium text-[#06233a] hover:brightness-110 disabled:opacity-50 transition"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {tab === "params" && (
              <div className="fade-in">
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
                    <ParamRow label="Web fallback threshold" value={params.web_fallback_threshold.toFixed(2)} />
                  </div>
                )}
              </div>
            )}

            {tab === "canned" && (
              <div className="space-y-4 fade-in">
                <p className="text-xs text-gray-500">
                  Custom replies are answered locally in the browser — no API call, no tokens, instant.
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
                      className="flex items-center gap-1.5 rounded-md bg-[#5FB2F2] px-3 py-1.5 text-xs font-medium text-[#06233a] hover:brightness-110 transition"
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
                    <div key={c.id} className="rounded-md border border-white/10 bg-[#0b0f14]/60 px-3 py-2 text-xs fade-in">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-mono text-[#5FB2F2] truncate">
                            {c.trigger} <span className="text-gray-600">({c.matchMode})</span>
                          </p>
                          <p className="mt-1 text-gray-300 whitespace-pre-wrap break-words">{c.response}</p>
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

            {tab === "security" && (
              <div className="space-y-6 fade-in">
                <Section title="Where your API keys live">
                  <div className="rounded-md border border-white/10 bg-[#0b0f14]/60 p-4 text-xs text-gray-400 space-y-1.5">
                    <p>Keys are stored on the backend in <span className="font-mono text-gray-200">data/keys.json</span> with file permissions set to <span className="font-mono text-gray-200">0600</span> (owner read/write only).</p>
                    <p>Keys never leave your machine unless the LLM provider requires them for the request you initiated.</p>
                    <p>The frontend only ever sees a masked form (first 4 and last 4 characters).</p>
                  </div>
                </Section>

                <Section title="Recommended practices">
                  <ul className="text-xs text-gray-400 space-y-1.5 list-disc pl-5">
                    <li>Never commit <span className="font-mono text-gray-300">.env</span> or <span className="font-mono text-gray-300">data/keys.json</span> to version control.</li>
                    <li>Rotate keys from the provider dashboard if you suspect exposure.</li>
                    <li>For shared deployments, place the API behind authentication before exposing it to a network.</li>
                    <li>Prefer project-scoped or short-lived keys when the provider supports them.</li>
                  </ul>
                </Section>

                <Section title="Clear local data">
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={clearAllLocalData}
                      className="flex items-center gap-2 rounded-md border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300 hover:bg-red-950/50 transition-colors"
                    >
                      <Trash2 size={14} /> Clear profile, custom replies, and chat history
                    </button>
                    <p className="text-[11px] text-gray-500">
                      This only clears browser-local data. Backend keys and the vector database remain untouched.
                    </p>
                  </div>
                </Section>

                {status && <StatusBar status={status} />}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-white/10 px-5 py-3 flex justify-between items-center">
          <div className="flex gap-3 md:hidden">
            <a href="/terms" target="_blank" className="text-[11px] text-gray-500 hover:text-gray-300">Terms</a>
            <a href="/privacy" target="_blank" className="text-[11px] text-gray-500 hover:text-gray-300">Privacy</a>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-[#5FB2F2] px-4 py-2 text-sm font-medium text-[#06233a] hover:brightness-110 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function ModelTierIcon({ tier }: { tier: ModelOption["tier"] }): JSX.Element {
  switch (tier) {
    case "reasoning":
      return <Brain size={13} className="shrink-0 text-purple-400" />;
    case "fast":
      return <Zap size={13} className="shrink-0 text-amber-400" />;
    case "local":
      return <Cpu size={13} className="shrink-0 text-emerald-400" />;
    case "flagship":
    default:
      return <Sparkles size={13} className="shrink-0 text-[#5FB2F2]" />;
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

function LogoPreview({ profile }: { profile: Profile }): JSX.Element {
  if (profile.assistantLogo) {
    return (
      <img
        src={profile.assistantLogo}
        alt=""
        className="h-12 w-12 rounded-full object-cover border border-white/10"
      />
    );
  }
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 border border-white/10">
      <img src="/logo.svg" alt="" className="h-8 w-8 object-contain" style={{ filter: "invert(1)" }} />
    </div>
  );
}

function AvatarPreview({ profile }: { profile: Profile }): JSX.Element {
  if (profile.avatarDataUrl) {
    return (
      <img
        src={profile.avatarDataUrl}
        alt=""
        className="h-12 w-12 rounded-full object-cover border border-white/10"
      />
    );
  }
  const initial = profile.name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white text-lg font-semibold border border-white/10">
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

function StatusBar({ status }: { status: { kind: "ok" | "err" | "info"; text: string } }): JSX.Element {
  const cls =
    status.kind === "ok"
      ? "bg-green-950/40 text-green-300 border-green-900/50"
      : status.kind === "err"
        ? "bg-red-950/40 text-red-300 border-red-900/50"
        : "bg-blue-950/40 text-blue-300 border-blue-900/50";
  return (
    <div className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs fade-in ${cls}`}>
      {status.kind === "err" && <AlertCircle size={14} className="mt-0.5 shrink-0" />}
      <span>{status.text}</span>
    </div>
  );
}
