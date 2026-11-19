// components/SettingsModal.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
  Check,
  ImagePlus,
  Key,
  Loader2,
  Plug,
  Palette,
  Plus,
  RotateCcw,
  Server,
  Shield,
  Sliders,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  addMcpServer,
  deleteProviderKey,
  fetchConfig,
  fetchKeys,
  fetchMcpServers,
  fetchPlugins,
  removeMcpServer,
  saveProviderKey,
  testProviderKey,
  togglePlugin,
  updateConfig,
} from "../lib/api";
import type {
  FontId,
  KeyListResponse,
  KeyStatusMap,
  LLMConfig,
  MCPServer,
  PluginInfo,
} from "../lib/types";
import { Avatar } from "./Avatar";
import { useProfile } from "@/hooks/useProfile";

export interface SettingsModalProps {
  isOpen?: boolean;
  open?: boolean;
  onClose: () => void;
}

type TabKey = "profile" | "plugins" | "keys" | "model" | "security";

const PROVIDERS = [
  { id: "groq", label: "Groq" },
  { id: "gemini", label: "Google Gemini" },
  { id: "openrouter", label: "OpenRouter · free models" },
  { id: "openai", label: "OpenAI" },
  { id: "ollama", label: "Ollama · local" },
  { id: "custom", label: "Custom endpoint" },
];

const DEFAULT_MODELS: Record<string, string> = {
  groq: "llama-3.3-70b-versatile",
  gemini: "gemini-2.0-flash",
  openrouter: "openrouter/free",
  openai: "gpt-4o-mini",
  ollama: "llama3.2",
};

const FONT_OPTIONS: Array<{ id: FontId; label: string }> = [
  { id: "system", label: "System default" },
  { id: "dm-sans", label: "DM Sans" },
  { id: "josefin-sans", label: "Josefin Sans" },
  { id: "fredoka", label: "Fredoka" },
  { id: "open-sans", label: "Open Sans" },
  { id: "outfit", label: "Outfit" },
  { id: "plus-jakarta-sans", label: "Plus Jakarta Sans" },
];

export function SettingsModal({ isOpen, open, onClose }: SettingsModalProps) {
  const modalVisible = Boolean(isOpen ?? open);
  const [activeTab, setActiveTab] = useState<TabKey>("profile");
  const {
    profile,
    update: updateProfile,
    reset: resetProfile,
    setAvatarFromFile,
    clearAvatar,
    setAssistantLogoFromFile,
    clearAssistantLogo,
  } = useProfile();
  const [profileError, setProfileError] = useState<string | null>(null);

  // Keys state
  const [keys, setKeys] = useState<KeyStatusMap>({});
  const [selectedProvider, setSelectedProvider] = useState<string>("openrouter");
  const [apiKeyInput, setApiKeyInput] = useState<string>("");
  const [keyStatusMsg, setKeyStatusMsg] = useState<string | null>(null);
  const [keyBusy, setKeyBusy] = useState<boolean>(false);

  // Model config state
  const [config, setConfig] = useState<LLMConfig>({
    provider: "groq",
    model: "llama-3.3-70b-versatile",
    base_url: "",
    temperature: 0.3,
    max_tokens: 1024,
    top_p: 0.9,
  });

  // Plugins & MCP state
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [mcpId, setMcpId] = useState<string>("");
  const [mcpTransport, setMcpTransport] = useState<"stdio" | "http">("stdio");
  const [mcpCommand, setMcpCommand] = useState<string>("npx");
  const [mcpArgs, setMcpArgs] = useState<string>("");
  const [mcpUrl, setMcpUrl] = useState<string>("");
  const [mcpLoading, setMcpLoading] = useState<boolean>(false);
  const [pluginError, setPluginError] = useState<string | null>(null);

  useEffect(() => {
    if (!modalVisible) return;
    loadAllData();
  }, [modalVisible]);

  async function loadAllData() {
    try {
      const [kData, cData, pData, sData] = await Promise.all([
        fetchKeys().catch(
          (): KeyListResponse => ({ keys: {}, active_provider: "" })
        ),
        fetchConfig().catch(() => ({
          provider: "groq",
          model: "llama-3.3-70b-versatile",
          base_url: "",
          temperature: 0.3,
          max_tokens: 1024,
          top_p: 0.9,
        })),
        fetchPlugins().catch(() => []),
        fetchMcpServers().catch(() => []),
      ]);
      setKeys(kData.keys);
      const activeProvider =
        cData.provider ||
        kData.active_provider ||
        Object.keys(kData.keys)[0] ||
        "groq";
      setSelectedProvider(activeProvider);
      setConfig({ ...cData, provider: activeProvider });
      setPlugins(pData);
      setMcpServers(sData);
    } catch {
      // Errors handled per-fetch above
    }
  }

  async function handleTogglePlugin(name: string, enabled: boolean) {
    setPluginError(null);
    try {
      await togglePlugin(name, enabled);
      setPlugins((prev) =>
        prev.map((p) => (p.name === name ? { ...p, enabled } : p))
      );
    } catch (err) {
      setPluginError(
        err instanceof Error ? err.message : "Failed to toggle plugin."
      );
    }
  }

  async function handleAddMcpServer(e: React.FormEvent) {
    e.preventDefault();
    if (!mcpId.trim()) return;
    setPluginError(null);
    setMcpLoading(true);
    try {
      const parsedArgs = mcpArgs
        .split(" ")
        .map((part) => part.trim())
        .filter(Boolean);

      await addMcpServer({
        id: mcpId.trim(),
        transport: mcpTransport,
        command: mcpTransport === "stdio" ? mcpCommand.trim() : undefined,
        args: mcpTransport === "stdio" ? parsedArgs : undefined,
        url: mcpTransport === "http" ? mcpUrl.trim() : undefined,
        prefix: `mcp_${mcpId.trim()}_`,
      });
      setMcpId("");
      setMcpArgs("");
      setMcpUrl("");
      const [updatedPlugins, updatedServers] = await Promise.all([
        fetchPlugins(),
        fetchMcpServers(),
      ]);
      setPlugins(updatedPlugins);
      setMcpServers(updatedServers);
    } catch (err) {
      setPluginError(
        err instanceof Error ? err.message : "Failed to connect MCP server."
      );
    } finally {
      setMcpLoading(false);
    }
  }

  async function handleRemoveMcpServer(id: string) {
    setPluginError(null);
    try {
      await removeMcpServer(id);
      const [updatedPlugins, updatedServers] = await Promise.all([
        fetchPlugins(),
        fetchMcpServers(),
      ]);
      setPlugins(updatedPlugins);
      setMcpServers(updatedServers);
    } catch (err) {
      setPluginError(
        err instanceof Error ? err.message : "Failed to remove MCP server."
      );
    }
  }

  async function handleSaveKey() {
    if (!apiKeyInput.trim()) return;
    setKeyBusy(true);
    setKeyStatusMsg("Testing & saving key...");
    try {
      const testRes = await testProviderKey({
        provider: selectedProvider,
        api_key: apiKeyInput.trim(),
        model: config.provider === selectedProvider ? config.model : undefined,
        base_url: config.provider === selectedProvider ? config.base_url : undefined,
      });
      if (!testRes.valid) {
        setKeyStatusMsg(
          `Key check failed: ${testRes.error || "provider rejected the key."}`
        );
        return;
      }

      const activeModel =
        testRes.model ||
        (config.provider === selectedProvider ? config.model : "");
      await saveProviderKey({
        provider: selectedProvider,
        api_key: apiKeyInput.trim(),
        model: activeModel,
        base_url: config.provider === selectedProvider ? config.base_url : "",
      });
      const nextConfig = {
        ...config,
        provider: selectedProvider,
        model: activeModel,
        base_url: config.provider === selectedProvider ? config.base_url : "",
      };
      await updateConfig(nextConfig);
      setConfig(nextConfig);
      const updated = await fetchKeys();
      setKeys(updated.keys);
      setApiKeyInput("");
      setKeyStatusMsg(`Verified ${selectedProvider}; it is now active for chat.`);
    } catch (err) {
      setKeyStatusMsg(
        err instanceof Error ? err.message : "Failed to save key."
      );
    } finally {
      setKeyBusy(false);
    }
  }

  async function handleDeleteKey(provider: string) {
    try {
      await deleteProviderKey(provider);
      const updated = await fetchKeys();
      setKeys(updated.keys);
      setKeyStatusMsg(`Removed ${provider} key.`);
    } catch (err) {
      setKeyStatusMsg(
        err instanceof Error ? err.message : "Failed to remove API key."
      );
    }
  }

  async function handleSaveModelConfig() {
    setKeyBusy(true);
    try {
      await updateConfig(config);
      setSelectedProvider(config.provider);
      setKeyStatusMsg("Model configuration saved.");
    } catch (err) {
      setKeyStatusMsg(
        err instanceof Error ? err.message : "Failed to save model configuration."
      );
    } finally {
      setKeyBusy(false);
    }
  }

  async function handleProfileImage(
    file: File | undefined,
    kind: "avatar" | "assistant"
  ): Promise<void> {
    if (!file) return;
    setProfileError(null);
    try {
      if (kind === "avatar") await setAvatarFromFile(file);
      else await setAssistantLogoFromFile(file);
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : "Could not update the image."
      );
    }
  }

  if (!modalVisible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-md sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="flex h-[min(88vh,780px)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950 text-slate-100 shadow-2xl shadow-black/60"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-7">
          <div>
            <h2 id="settings-title" className="text-lg font-semibold tracking-tight">
              Assistant Settings
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Personalize your assistant and manage its connections.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="rounded-xl border border-white/10 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Settings sections"
          className="flex gap-1 overflow-x-auto border-b border-white/10 bg-white/[0.025] px-3 sm:px-5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "profile"}
            onClick={() => setActiveTab("profile")}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-xs font-medium transition-colors sm:px-4 ${
              activeTab === "profile"
                ? "border-indigo-400 text-indigo-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <UserRound className="h-4 w-4" />
            Profile
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "plugins"}
            onClick={() => setActiveTab("plugins")}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-xs font-medium transition-colors sm:px-4 ${
              activeTab === "plugins"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Plug className="h-4 w-4" />
            Plugins & MCP
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "keys"}
            onClick={() => setActiveTab("keys")}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-xs font-medium transition-colors sm:px-4 ${
              activeTab === "keys"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Key className="h-4 w-4" />
            API Keys
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "model"}
            onClick={() => setActiveTab("model")}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-xs font-medium transition-colors sm:px-4 ${
              activeTab === "model"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sliders className="h-4 w-4" />
            Model & Params
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "security"}
            onClick={() => setActiveTab("security")}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-xs font-medium transition-colors sm:px-4 ${
              activeTab === "security"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Shield className="h-4 w-4" />
            Security
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-7">
          {activeTab === "profile" && (
            <div className="mx-auto max-w-3xl space-y-5">
              <div className="flex items-center gap-4 rounded-2xl border border-indigo-400/20 bg-gradient-to-br from-indigo-500/10 to-slate-900 p-4 sm:p-5">
                <Avatar profile={profile} size={52} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-100">
                    {profile.name}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    Chat preview · {profile.assistantName}
                  </p>
                </div>
                <Palette className="h-5 w-5 shrink-0 text-indigo-300" />
              </div>

              {profileError && (
                <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-200">
                  {profileError}
                </p>
              )}

              <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
                <h3 className="mb-4 text-sm font-semibold">Your profile</h3>
                <div className="grid gap-4 sm:grid-cols-[1fr_1.2fr]">
                  <label className="text-xs text-slate-400">
                    Your name
                    <input
                      value={profile.name}
                      maxLength={60}
                      onChange={(event) => updateProfile({ name: event.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-400/70"
                    />
                  </label>
                  <div className="flex items-end gap-2">
                    <label className="flex-1 text-xs text-slate-400">
                      Profile avatar
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="sr-only"
                        onChange={async (event) => {
                          const input = event.currentTarget;
                          await handleProfileImage(input.files?.[0], "avatar");
                          input.value = "";
                        }}
                      />
                      <span className="mt-1.5 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 transition hover:border-indigo-400/50 hover:bg-white/5">
                        <ImagePlus className="h-4 w-4" /> Upload image
                      </span>
                    </label>
                    {profile.avatarDataUrl && (
                      <button
                        type="button"
                        onClick={clearAvatar}
                        className="mb-px rounded-xl border border-white/10 p-2.5 text-slate-400 hover:bg-white/5 hover:text-white"
                        aria-label="Remove profile avatar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
                <h3 className="mb-4 text-sm font-semibold">Assistant identity</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-xs text-slate-400">
                    Assistant name
                    <input
                      value={profile.assistantName}
                      maxLength={60}
                      onChange={(event) => updateProfile({ assistantName: event.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-400/70"
                    />
                  </label>
                  <label className="text-xs text-slate-400">
                    Welcome headline
                    <input
                      value={profile.headline}
                      maxLength={100}
                      onChange={(event) => updateProfile({ headline: event.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-400/70"
                    />
                  </label>
                  <label className="text-xs text-slate-400 sm:col-span-2">
                    Welcome message
                    <textarea
                      value={profile.bodyText}
                      maxLength={240}
                      rows={2}
                      onChange={(event) => updateProfile({ bodyText: event.target.value })}
                      className="mt-1.5 w-full resize-y rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-400/70"
                    />
                  </label>
                  <div className="flex items-end gap-2 sm:col-span-2">
                    {profile.assistantLogo ? (
                      <img
                        src={profile.assistantLogo}
                        alt="Assistant logo preview"
                        className="h-10 w-10 rounded-xl border border-white/10 object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-xl border border-white/10 bg-slate-900" />
                    )}
                    <label className="flex-1 text-xs text-slate-400">
                      Assistant logo
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="sr-only"
                        onChange={async (event) => {
                          const input = event.currentTarget;
                          await handleProfileImage(input.files?.[0], "assistant");
                          input.value = "";
                        }}
                      />
                      <span className="mt-1.5 flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 transition hover:border-indigo-400/50 hover:bg-white/5">
                        <ImagePlus className="h-4 w-4" /> Choose logo
                      </span>
                    </label>
                    {profile.assistantLogo && (
                      <button
                        type="button"
                        onClick={clearAssistantLogo}
                        className="mb-px rounded-xl border border-white/10 p-2.5 text-slate-400 hover:bg-white/5 hover:text-white"
                        aria-label="Remove assistant logo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </section>

              <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
                <label className="text-xs text-slate-400">
                  Interface font
                  <select
                    value={profile.font}
                    onChange={(event) => {
                      const font = FONT_OPTIONS.find((option) => option.id === event.target.value)?.id;
                      if (font) updateProfile({ font });
                    }}
                    className="mt-1.5 block w-full min-w-56 rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-400/70"
                  >
                    {FONT_OPTIONS.map((font) => (
                      <option key={font.id} value={font.id}>{font.label}</option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    resetProfile();
                    setProfileError(null);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-xs text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset profile
                </button>
              </section>
            </div>
          )}

          {activeTab === "plugins" && (
            <div className="space-y-6">
              {pluginError && (
                <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-4 py-2.5 text-xs text-rose-200">
                  {pluginError}
                </div>
              )}

              {/* Registered Tools List */}
              <div>
                <h3 className="text-sm font-semibold text-slate-200 mb-1">
                  Registered Tools & Plugins
                </h3>
                <p className="text-xs text-slate-400 mb-3">
                  Toggle internal RAG tools and connected MCP server tools exposed to the agent loop.
                </p>

                <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950/50">
                  {plugins.length === 0 ? (
                    <div className="p-4 text-xs text-slate-500">
                      No plugins currently registered.
                    </div>
                  ) : (
                    plugins.map((plugin) => (
                      <div
                        key={plugin.name}
                        className="flex items-center justify-between px-4 py-3"
                      >
                        <div className="space-y-0.5 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-slate-100">
                              {plugin.name}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                plugin.source === "internal"
                                  ? "bg-indigo-500/20 text-indigo-300"
                                  : "bg-emerald-500/20 text-emerald-300"
                              }`}
                            >
                              {plugin.source}
                            </span>
                            {plugin.requires_consent && (
                              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300">
                                requires consent
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">
                            {plugin.description}
                          </p>
                        </div>

                        <label className="relative inline-flex cursor-pointer items-center">
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={plugin.enabled}
                            onChange={(e) =>
                              handleTogglePlugin(plugin.name, e.target.checked)
                            }
                          />
                          <div className="h-5 w-9 rounded-full bg-slate-700 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-indigo-600 peer-checked:after:translate-x-full" />
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* MCP Servers Section */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-indigo-400" />
                  <h3 className="text-sm font-semibold text-slate-200">
                    MCP Connectors
                  </h3>
                </div>

                {/* Existing MCP servers */}
                <div className="space-y-2">
                  {mcpServers.length === 0 ? (
                    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-500">
                      No MCP servers connected. Add a stdio or streamable HTTP MCP server below.
                    </div>
                  ) : (
                    mcpServers.map((srv) => (
                      <div
                        key={srv.id}
                        className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-100">
                              {srv.id}
                            </span>
                            <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                              {srv.transport}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] ${
                                srv.status === "connected"
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : "bg-rose-500/20 text-rose-300"
                              }`}
                            >
                              {srv.status} ({srv.tool_count} tools)
                            </span>
                          </div>
                          <div className="font-mono text-[11px] text-slate-400">
                            {srv.url_or_command}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveMcpServer(srv.id)}
                          className="rounded p-1.5 text-slate-400 hover:bg-rose-950 hover:text-rose-400"
                          title="Disconnect MCP Server"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add MCP Server Form */}
                <form
                  onSubmit={handleAddMcpServer}
                  className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-3"
                >
                  <div className="text-xs font-medium text-slate-300">
                    Connect New MCP Server
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Server ID
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. memory"
                        value={mcpId}
                        onChange={(e) => setMcpId(e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Transport
                      </label>
                      <select
                        value={mcpTransport}
                        onChange={(e) =>
                          setMcpTransport(e.target.value as "stdio" | "http")
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="stdio">stdio (Local Process)</option>
                        <option value="http">http (Streamable HTTP)</option>
                      </select>
                    </div>
                  </div>

                  {mcpTransport === "stdio" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Command (Allow-listed)
                        </label>
                        <select
                          value={mcpCommand}
                          onChange={(e) => setMcpCommand(e.target.value)}
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                        >
                          <option value="npx">npx</option>
                          <option value="uvx">uvx</option>
                          <option value="python">python</option>
                          <option value="node">node</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Arguments (space-separated)
                        </label>
                        <input
                          type="text"
                          placeholder="-y @modelcontextprotocol/server-memory"
                          value={mcpArgs}
                          onChange={(e) => setMcpArgs(e.target.value)}
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Streamable HTTP URL (https:// or http://localhost)
                      </label>
                      <input
                        type="url"
                        required
                        placeholder="http://localhost:8001/mcp"
                        value={mcpUrl}
                        onChange={(e) => setMcpUrl(e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={mcpLoading}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {mcpLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    Connect Server
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === "keys" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-indigo-400/20 bg-indigo-500/[0.07] p-4 text-xs leading-relaxed text-slate-300">
                Add and verify a provider key. A verified key is automatically
                selected for chat; OpenRouter&apos;s free-model route is available
                without a paid web-search API.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <input
                  type="password"
                  placeholder="Enter API Key..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="sm:col-span-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100"
                />
              </div>
              <button
                type="button"
                onClick={handleSaveKey}
                disabled={keyBusy || !apiKeyInput.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-950/30 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {keyBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Verify, save & activate
              </button>
              {keyStatusMsg && (
                <p role="status" aria-live="polite" className="text-xs text-indigo-200">
                  {keyStatusMsg}
                </p>
              )}

              <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950/50 mt-4">
                {Object.entries(keys).map(([prov, info]) => (
                  <div
                    key={prov}
                    className="flex items-center justify-between px-4 py-2.5 text-xs"
                  >
                    <div>
                      <span className="font-semibold uppercase">{prov}</span>
                      {config.provider === prov && (
                        <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                          active
                        </span>
                      )}
                      <span className="ml-3 font-mono text-slate-400">
                        {info.masked_key}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteKey(prov)}
                      aria-label={`Remove ${prov} API key`}
                      className="text-rose-400 hover:text-rose-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "model" && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Provider</label>
                  <select
                    value={config.provider}
                    onChange={(e) => {
                      const provider = e.target.value;
                      setConfig({
                        ...config,
                        provider,
                        model:
                          config.provider === provider
                            ? config.model
                            : DEFAULT_MODELS[provider] || "",
                      });
                      setSelectedProvider(provider);
                    }}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                  >
                    {PROVIDERS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Model Name</label>
                  <input
                    type="text"
                    value={config.model}
                    onChange={(e) =>
                      setConfig({ ...config, model: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">
                    Temperature ({config.temperature})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={config.temperature}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        temperature: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Max Tokens</label>
                  <input
                    type="number"
                    value={config.max_tokens}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        max_tokens: parseInt(e.target.value, 10) || 1024,
                      })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Top P</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={config.top_p}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        top_p: parseFloat(e.target.value) || 0.9,
                      })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleSaveModelConfig}
                disabled={keyBusy}
                className="rounded-xl bg-indigo-500 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50"
              >
                {keyBusy ? "Saving..." : "Save configuration"}
              </button>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                <h4 className="font-semibold text-slate-100">
                  Local File Permissions (chmod 0600)
                </h4>
                <p className="text-slate-400">
                  API credentials (<code className="text-slate-200">data/keys.json</code>),
                  plugin toggle states (<code className="text-slate-200">data/plugins.json</code>),
                  and MCP server configurations (<code className="text-slate-200">data/mcp_servers.json</code>)
                  are written atomically with owner-only read/write permissions (<code className="text-slate-200">0600</code>)
                  and excluded from version control.
                </p>
              </div>

              <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4 space-y-2">
                <h4 className="font-semibold text-indigo-200">
                  MCP Command Allow-List & Transport Security
                </h4>
                <ul className="list-disc pl-5 space-y-1 text-slate-300">
                  <li>
                    <strong>Stdio Allow-List:</strong> Only{" "}
                    <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-indigo-300">
                      npx
                    </code>
                    ,{" "}
                    <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-indigo-300">
                      uvx
                    </code>
                    ,{" "}
                    <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-indigo-300">
                      python
                    </code>
                    , and{" "}
                    <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-indigo-300">
                      node
                    </code>{" "}
                    executables are permitted when spawning local stdio MCP servers. Any other binary or path is rejected with HTTP 400.
                  </li>
                  <li>
                    <strong>Mandatory User Consent:</strong> Every tool registered from an MCP server defaults to{" "}
                    <code className="font-mono text-amber-300">requires_consent=True</code> and pauses the agent loop for explicit interactive approval before running.
                  </li>
                  <li>
                    <strong>HTTPS Enforcement:</strong> Remote Streamable HTTP MCP endpoints must use{" "}
                    <code className="font-mono text-emerald-300">https://</code> unless bound to{" "}
                    <code className="font-mono">localhost</code> or{" "}
                    <code className="font-mono">127.0.0.1</code>.
                  </li>
                  <li>
                    <strong>Execution Guardrails:</strong> All tool call arguments are validated against their JSON Schema, capped at 10 KB input size, 4,000 characters output size, and 12 agent turns maximum.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
