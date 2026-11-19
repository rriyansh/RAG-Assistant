// components/SettingsModal.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
  Check,
  Key,
  Loader2,
  Plug,
  Plus,
  Server,
  Shield,
  Sliders,
  Trash2,
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
import { KeyStatusMap, LLMConfig, MCPServer, PluginInfo } from "../lib/types";

export interface SettingsModalProps {
  isOpen?: boolean;
  open?: boolean;
  onClose: () => void;
}

type TabKey = "keys" | "model" | "plugins" | "security";

const PROVIDERS = ["groq", "gemini", "openrouter", "openai", "ollama", "custom"];

export function SettingsModal({ isOpen, open, onClose }: SettingsModalProps) {
  const modalOpen = Boolean(isOpen ?? open);
  const [activeTab, setActiveTab] = useState<TabKey>("plugins");

  const [keys, setKeys] = useState<KeyStatusMap>({});
  const [selectedProvider, setSelectedProvider] = useState<string>("groq");
  const [apiKeyInput, setApiKeyInput] = useState<string>("");
  const [keyStatusMsg, setKeyStatusMsg] = useState<string | null>(null);

  const [config, setConfig] = useState<LLMConfig>({
    provider: "groq",
    model: "llama-3.3-70b-versatile",
    base_url: "",
    temperature: 0.3,
    max_tokens: 1024,
    top_p: 0.9,
  });

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
    if (!modalOpen) return;
    loadAllData();
  }, [modalOpen]);

  async function loadAllData() {
    try {
      const [kData, cData, pData, sData] = await Promise.all([
        fetchKeys().catch(() => ({})),
        fetchConfig().catch(() => config),
        fetchPlugins().catch(() => []),
        fetchMcpServers().catch(() => []),
      ]);
      setKeys(kData);
      setConfig(cData);
      setPlugins(pData);
      setMcpServers(sData);
    } catch {
      // handled per promise
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
    setKeyStatusMsg("Testing & saving key...");
    try {
      const testRes = await testProviderKey({
        provider: selectedProvider,
        api_key: apiKeyInput.trim(),
      });
      await saveProviderKey({
        provider: selectedProvider,
        api_key: apiKeyInput.trim(),
      });
      const updated = await fetchKeys();
      setKeys(updated);
      setApiKeyInput("");
      setKeyStatusMsg(
        testRes.valid
          ? `Saved and verified ${selectedProvider} key.`
          : `Saved key (verification warning: ${testRes.error || "check model"}).`
      );
    } catch (err) {
      setKeyStatusMsg(
        err instanceof Error ? err.message : "Failed to save key."
      );
    }
  }

  async function handleDeleteKey(provider: string) {
    await deleteProviderKey(provider);
    setKeys(await fetchKeys());
  }

  async function handleSaveModelConfig() {
    await updateConfig(config);
    setKeyStatusMsg("Model parameters saved.");
  }

  if (!modalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="flex h-[82vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <h2 className="text-lg font-semibold">Assistant Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6">
          <button
            type="button"
            onClick={() => setActiveTab("plugins")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
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
            onClick={() => setActiveTab("keys")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
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
            onClick={() => setActiveTab("model")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
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
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "security"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Shield className="h-4 w-4" />
            Security
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "plugins" && (
            <div className="space-y-6">
              {pluginError && (
                <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-4 py-2.5 text-xs text-rose-200">
                  {pluginError}
                </div>
              )}

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

              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-indigo-400" />
                  <h3 className="text-sm font-semibold text-slate-200">
                    MCP Connectors
                  </h3>
                </div>

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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p} value={p}>
                      {p.toUpperCase()}
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
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500"
              >
                <Check className="h-3.5 w-3.5" />
                Verify & Save Key
              </button>
              {keyStatusMsg && (
                <p className="text-xs text-indigo-300">{keyStatusMsg}</p>
              )}

              <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950/50 mt-4">
                {Object.entries(keys).map(([prov, info]) => (
                  <div
                    key={prov}
                    className="flex items-center justify-between px-4 py-2.5 text-xs"
                  >
                    <div>
                      <span className="font-semibold uppercase">{prov}</span>
                      <span className="ml-3 font-mono text-slate-400">
                        {info.masked_key}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteKey(prov)}
                      className="text-rose-400 hover:text-rose
