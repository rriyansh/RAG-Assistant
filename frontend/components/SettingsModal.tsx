// components/SettingsModal.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ImagePlus,
  Key,
  Link2,
  Loader2,
  Palette,
  Plug,
  Plus,
  RotateCcw,
  Shield,
  Sliders,
  Trash2,
  Unplug,
  UserRound,
  Webhook,
  X,
} from "lucide-react";
import {
  connectService,
  createCustomConnector,
  deleteProviderKey,
  disconnectService,
  fetchConfig,
  fetchConnectors,
  fetchKeys,
  fetchPlugins,
  saveProviderKey,
  testProviderKey,
  toggleConnector,
  togglePlugin,
  updateConfig,
} from "../lib/api";
import type {
  ConnectorInfo,
  FontId,
  KeyListResponse,
  KeyStatusMap,
  LLMConfig,
  PluginInfo,
} from "../lib/types";
import { Avatar } from "./Avatar";
import { useProfile } from "@/hooks/useProfile";

export interface SettingsModalProps {
  isOpen?: boolean;
  open?: boolean;
  onClose: () => void;
}

type TabKey = "profile" | "connectors" | "keys" | "model" | "security";

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

/** Official Authentic Vector Brand Logos for every Connector */
function ConnectorBrandLogo({ id }: { id: string }) {
  switch (id) {
    case "gmail":
      return (
        <svg viewBox="0 0 48 48" className="h-7 w-7 shrink-0" aria-hidden="true">
          <path
            fill="#4caf50"
            d="M45,16.2l-5,2.75l-5,4.75L35,40h7c1.657,0,3-1.343,3-3V16.2z"
          />
          <path
            fill="#1e88e5"
            d="M3,16.2l3.614,1.71L13,23.7V40H6c-1.657,0-3-1.343-3-3V16.2z"
          />
          <polygon
            fill="#e53935"
            points="35,11.2 24,19.45 13,11.2 12,17 13,23.7 24,31.95 35,23.7 36,17"
          />
          <path
            fill="#c62828"
            d="M3,12.298V16.2l10,7.5V11.2L9.876,8.859C9.132,8.301,8.228,8,7.298,8h0C4.924,8,3,9.924,3,12.298z"
          />
          <path
            fill="#fbc02d"
            d="M45,12.298V16.2l-10,7.5V11.2l3.124-2.341C38.868,8.301,39.772,8,40.702,8h0 C43.076,8,45,9.924,45,12.298z"
          />
        </svg>
      );

    case "google_drive":
      return (
        <svg viewBox="0 0 87.3 78" className="h-7 w-7 shrink-0" aria-hidden="true">
          <path
            fill="#0066da"
            d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z"
          />
          <path
            fill="#00ac47"
            d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z"
          />
          <path
            fill="#ea4335"
            d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z"
          />
          <path
            fill="#00832d"
            d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z"
          />
          <path
            fill="#2684fc"
            d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"
          />
          <path
            fill="#ffba00"
            d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z"
          />
        </svg>
      );

    case "github":
      return (
        <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0 fill-white" aria-hidden="true">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
          />
        </svg>
      );

    case "notion":
      return (
        <svg viewBox="0 0 100 100" className="h-7 w-7 shrink-0" aria-hidden="true">
          <path
            d="M6.017 4.313l55.333 -4.087c6.797 -0.583 8.543 -0.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277 -1.553 6.807 -6.99 7.193L24.467 99.967c-4.08 0.193 -6.023 -0.39 -8.16 -3.113L3.3 79.94c-2.333 -3.113 -3.3 -5.443 -3.3 -8.167V11.113c0 -3.497 1.553 -6.413 6.017 -6.8z"
            fill="#ffffff"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M61.35 0.227l-55.333 4.087C1.553 4.7 0 7.617 0 11.113v60.66c0 2.723 0.967 5.053 3.3 8.167l13.007 16.913c2.137 2.723 4.08 3.307 8.16 3.113l64.257 -3.89c5.433 -0.387 6.99 -2.917 6.99 -7.193V20.64c0 -2.21 -0.873 -2.847 -3.443 -4.733L74.167 3.143c-4.273 -3.107 -6.02 -3.5 -12.817 -2.917zM25.92 19.523c-5.247 0.353 -6.437 0.433 -9.417 -1.99L8.927 11.507c-0.77 -0.78 -0.383 -1.753 1.557 -1.947l53.193 -3.887c4.467 -0.39 6.793 1.167 8.54 2.527l9.123 6.61c0.39 0.197 1.36 1.36 0.193 1.36l-54.933 3.307 -0.68 0.047zM19.803 88.3V30.367c0 -2.53 0.777 -3.697 3.103 -3.893L86 22.78c2.14 -0.193 3.107 1.167 3.107 3.693v57.547c0 2.53 -0.39 4.67 -3.883 4.863l-60.377 3.5c-3.493 0.193 -5.043 -0.97 -5.043 -4.083zm59.6 -54.827c0.387 1.75 0 3.5 -1.75 3.7l-2.91 0.577v42.773c-2.527 1.36 -4.853 2.137 -6.797 2.137 -3.107 0 -3.883 -0.973 -6.21 -3.887l-19.03 -29.94v28.967l6.02 1.363s0 3.5 -4.857 3.5l-13.39 0.777c-0.39 -0.78 0 -2.723 1.357 -3.11l3.497 -0.97v-38.3L30.48 40.667c-0.39 -1.75 0.58 -4.277 3.3 -4.473l14.367 -0.967 19.8 30.327v-26.83l-5.047 -0.58c-0.39 -2.143 1.163 -3.7 3.103 -3.89l13.4 -0.78z"
            fill="#0f172a"
          />
        </svg>
      );

    case "slack":
      return (
        <svg viewBox="0 0 122.8 122.8" className="h-7 w-7 shrink-0" aria-hidden="true">
          <path
            d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z"
            fill="#e01e5a"
          />
          <path
            d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z"
            fill="#36c5f0"
          />
          <path
            d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z"
            fill="#2eb67d"
          />
          <path
            d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z"
            fill="#ecb22e"
          />
        </svg>
      );

    case "pdf_rag":
      return (
        <svg viewBox="0 0 48 48" className="h-7 w-7 shrink-0" aria-hidden="true">
          <path
            fill="#ef4444"
            d="M12 6h18l10 10v24c0 2.2-1.8 4-4 4H12c-2.2 0-4-1.8-4-4V10c0-2.2 1.8-4 4-4z"
          />
          <path fill="#fca5a5" d="M30 6v10h10z" />
          <text
            x="24"
            y="34"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="11"
            fontWeight="bold"
            fontFamily="monospace"
          >
            PDF
          </text>
        </svg>
      );

    case "web_research":
      return (
        <svg viewBox="0 0 48 48" className="h-7 w-7 shrink-0" aria-hidden="true">
          <circle cx="24" cy="24" r="19" fill="#0284c7" />
          <path
            fill="none"
            stroke="#e0f2fe"
            strokeWidth="2.5"
            d="M24 5c5 5 8 11.7 8 19s-3 14-8 19M24 5c-5 5-8 11.7-8 19s3 14 8 19M6 18h36M6 30h36"
          />
        </svg>
      );

    default:
      return (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300">
          <Webhook className="h-4 w-4" />
        </div>
      );
  }
}

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

  // Connectors & Tools state
  const [connectors, setConnectors] = useState<ConnectorInfo[]>([]);
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [activeConnectorFormId, setActiveConnectorFormId] = useState<string | null>(null);
  const [connectorCredentials, setConnectorCredentials] = useState<Record<string, string>>({});
  const [connectorBusyId, setConnectorBusyId] = useState<string | null>(null);
  const [connectorError, setConnectorError] = useState<string | null>(null);
  const [connectorSuccess, setConnectorSuccess] = useState<string | null>(null);
  const [showToolsBreakdown, setShowToolsBreakdown] = useState<boolean>(false);

  // Custom Webhook Connector form state
  const [showCustomForm, setShowCustomForm] = useState<boolean>(false);
  const [customId, setCustomId] = useState<string>("");
  const [customName, setCustomName] = useState<string>("");
  const [customDesc, setCustomDesc] = useState<string>("");
  const [customUrl, setCustomUrl] = useState<string>("");
  const [customMethod, setCustomMethod] = useState<"POST" | "GET">("POST");
  const [customApiKey, setCustomApiKey] = useState<string>("");

  useEffect(() => {
    if (!modalVisible) return;
    loadAllData();
  }, [modalVisible]);

  async function loadAllData() {
    try {
      const [kData, cData, connData, pData] = await Promise.all([
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
        fetchConnectors().catch(() => []),
        fetchPlugins().catch(() => []),
      ]);
      setKeys(kData.keys);
      const activeProvider =
        cData.provider ||
        kData.active_provider ||
        Object.keys(kData.keys)[0] ||
        "groq";
      setSelectedProvider(activeProvider);
      setConfig({ ...cData, provider: activeProvider });
      setConnectors(connData);
      setPlugins(pData);
    } catch {
      // Handled per-fetch
    }
  }

  async function refreshConnectorsAndTools() {
    const [connData, pData] = await Promise.all([
      fetchConnectors().catch(() => []),
      fetchPlugins().catch(() => []),
    ]);
    setConnectors(connData);
    setPlugins(pData);
  }

  async function handleConnectService(e: React.FormEvent, connectorId: string) {
    e.preventDefault();
    setConnectorError(null);
    setConnectorSuccess(null);
    setConnectorBusyId(connectorId);
    try {
      const connected = await connectService(connectorId, connectorCredentials);
      setConnectorCredentials({});
      setActiveConnectorFormId(null);
      setConnectorSuccess(
        `Connected ${connected.name} (${connected.account_label || "active"}).`
      );
      await refreshConnectorsAndTools();
    } catch (err) {
      setConnectorError(
        err instanceof Error ? err.message : `Failed to connect ${connectorId}.`
      );
    } finally {
      setConnectorBusyId(null);
    }
  }

  async function handleToggleConnector(connectorId: string, enabled: boolean) {
    setConnectorError(null);
    setConnectorBusyId(connectorId);
    try {
      await toggleConnector(connectorId, enabled);
      await refreshConnectorsAndTools();
    } catch (err) {
      setConnectorError(
        err instanceof Error ? err.message : "Failed to toggle connector."
      );
    } finally {
      setConnectorBusyId(null);
    }
  }

  async function handleDisconnectService(connectorId: string, name: string) {
    setConnectorError(null);
    setConnectorSuccess(null);
    setConnectorBusyId(connectorId);
    try {
      await disconnectService(connectorId);
      setConnectorSuccess(`Disconnected ${name}.`);
      await refreshConnectorsAndTools();
    } catch (err) {
      setConnectorError(
        err instanceof Error ? err.message : `Failed to disconnect ${name}.`
      );
    } finally {
      setConnectorBusyId(null);
    }
  }

  async function handleCreateCustomConnector(e: React.FormEvent) {
    e.preventDefault();
    if (!customId.trim() || !customName.trim() || !customUrl.trim()) return;
    setConnectorError(null);
    setConnectorSuccess(null);
    setConnectorBusyId("custom_new");
    try {
      const created = await createCustomConnector({
        id: customId.trim(),
        name: customName.trim(),
        description:
          customDesc.trim() || `Custom REST connector for ${customName.trim()}`,
        endpoint_url: customUrl.trim(),
        method: customMethod,
        api_key: customApiKey.trim(),
      });
      setCustomId("");
      setCustomName("");
      setCustomDesc("");
      setCustomUrl("");
      setCustomApiKey("");
      setShowCustomForm(false);
      setConnectorSuccess(`Added custom connector "${created.name}".`);
      await refreshConnectorsAndTools();
    } catch (err) {
      setConnectorError(
        err instanceof Error ? err.message : "Failed to create custom connector."
      );
    } finally {
      setConnectorBusyId(null);
    }
  }

  async function handleTogglePlugin(name: string, enabled: boolean) {
    setConnectorError(null);
    try {
      await togglePlugin(name, enabled);
      await refreshConnectorsAndTools();
    } catch (err) {
      setConnectorError(
        err instanceof Error ? err.message : "Failed to toggle tool."
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
        base_url:
          config.provider === selectedProvider ? config.base_url : undefined,
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
      setKeyStatusMsg(
        `Verified ${selectedProvider}; it is now active for chat.`
      );
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
        err instanceof Error
          ? err.message
          : "Failed to save model configuration."
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

  const connectedCount = connectors.filter((c) => c.connected && c.enabled).length;

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
        className="flex h-[min(88vh,800px)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950 text-slate-100 shadow-2xl shadow-black/60"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-7">
          <div>
            <h2
              id="settings-title"
              className="text-lg font-semibold tracking-tight"
            >
              Assistant Settings
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Personalize your assistant and manage service connectors (Gmail, Google Drive, GitHub, Notion, Slack).
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
            aria-selected={activeTab === "connectors"}
            onClick={() => setActiveTab("connectors")}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-xs font-medium transition-colors sm:px-4 ${
              activeTab === "connectors"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Plug className="h-4 w-4" />
            Connectors
            <span className="rounded-full bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300">
              {connectedCount}
            </span>
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
                <p
                  role="alert"
                  className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-200"
                >
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
                      onChange={(event) =>
                        updateProfile({ name: event.target.value })
                      }
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
                      onChange={(event) =>
                        updateProfile({ assistantName: event.target.value })
                      }
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-400/70"
                    />
                  </label>
                  <label className="text-xs text-slate-400">
                    Welcome headline
                    <input
                      value={profile.headline}
                      maxLength={100}
                      onChange={(event) =>
                        updateProfile({ headline: event.target.value })
                      }
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-indigo-400/70"
                    />
                  </label>
                  <label className="text-xs text-slate-400 sm:col-span-2">
                    Welcome message
                    <textarea
                      value={profile.bodyText}
                      maxLength={240}
                      rows={2}
                      onChange={(event) =>
                        updateProfile({ bodyText: event.target.value })
                      }
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
                          await handleProfileImage(
                            input.files?.[0],
                            "assistant"
                          );
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
                      const font = FONT_OPTIONS.find(
                        (option) => option.id === event.target.value
                      )?.id;
                      if (font) updateProfile({ font });
                    }}
                    className="mt-1.5 block w-full min-w-56 rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-400/70"
                  >
                    {FONT_OPTIONS.map((font) => (
                      <option key={font.id} value={font.id}>
                        {font.label}
                      </option>
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

          {activeTab === "connectors" && (
            <div className="space-y-6">
              {/* Top Banner */}
              <div className="flex flex-col justify-between gap-3 rounded-2xl border border-indigo-400/20 bg-gradient-to-br from-indigo-500/10 via-slate-900 to-slate-950 p-4 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    App & Service Connectors
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Connect Gmail, Google Drive, GitHub, Notion, Slack, or custom REST APIs directly to the assistant&apos;s tool-calling loop.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustomForm((prev) => !prev)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo-500 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-950/40 transition hover:bg-indigo-400"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Custom Webhook Connector
                </button>
              </div>

              {connectorError && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-2.5 text-xs text-rose-200">
                  {connectorError}
                </div>
              )}

              {connectorSuccess && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-4 py-2.5 text-xs text-emerald-200">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{connectorSuccess}</span>
                </div>
              )}

              {/* Custom Webhook Connector Form */}
              {showCustomForm && (
                <form
                  onSubmit={handleCreateCustomConnector}
                  className="space-y-3 rounded-2xl border border-indigo-500/30 bg-slate-900/70 p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-300">
                      New Custom REST / Webhook Connector
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCustomForm(false)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-[11px] text-slate-400">
                        Connector ID
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. crm_lookup"
                        value={customId}
                        onChange={(e) => setCustomId(e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-slate-400">
                        Display Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Internal CRM"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-slate-400">
                        HTTP Method
                      </label>
                      <select
                        value={customMethod}
                        onChange={(e) =>
                          setCustomMethod(e.target.value as "POST" | "GET")
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100"
                      >
                        <option value="POST">POST (JSON payload)</option>
                        <option value="GET">GET (Query string)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[11px] text-slate-400">
                        Endpoint URL (https:// or http://localhost)
                      </label>
                      <input
                        type="url"
                        required
                        placeholder="https://api.example.com/v1/query"
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-slate-400">
                        Bearer API Key (Optional)
                      </label>
                      <input
                        type="password"
                        placeholder="Optional Authorization Bearer token"
                        value={customApiKey}
                        onChange={(e) => setCustomApiKey(e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] text-slate-400">
                      Tool Description (Guides the LLM on when to invoke this connector)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Look up customer order status and ticket history from our CRM."
                      value={customDesc}
                      onChange={(e) => setCustomDesc(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={connectorBusyId === "custom_new"}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {connectorBusyId === "custom_new" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Link2 className="h-3.5 w-3.5" />
                    )}
                    Save & Connect Webhook
                  </button>
                </form>
              )}

              {/* Connectors Grid */}
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                {connectors.map((conn) => {
                  const isConfiguring = activeConnectorFormId === conn.id;
                  const isBusy = connectorBusyId === conn.id;

                  return (
                    <div
                      key={conn.id}
                      className={`flex flex-col justify-between rounded-2xl border p-4 transition ${
                        conn.connected && conn.enabled
                          ? "border-indigo-500/35 bg-slate-900/75"
                          : "border-white/10 bg-white/[0.02]"
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-950 p-2 shadow-inner">
                              <ConnectorBrandLogo id={conn.id} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-semibold text-slate-100">
                                  {conn.name}
                                </h4>
                                {conn.connected ? (
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                      conn.enabled
                                        ? "bg-emerald-500/20 text-emerald-300"
                                        : "bg-amber-500/20 text-amber-300"
                                    }`}
                                  >
                                    {conn.enabled ? "Connected" : "Paused"}
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                                    Not connected
                                  </span>
                                )}
                              </div>
                              {conn.account_label && (
                                <p className="mt-0.5 truncate max-w-[210px] font-mono text-[11px] text-indigo-300">
                                  {conn.account_label}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Enable / Disable Switch when connected */}
                          {conn.connected && (
                            <label
                              className="relative inline-flex cursor-pointer items-center"
                              title={
                                conn.enabled
                                  ? "Disable connector tools"
                                  : "Enable connector tools"
                              }
                            >
                              <input
                                type="checkbox"
                                className="peer sr-only"
                                checked={conn.enabled}
                                disabled={isBusy}
                                onChange={(e) =>
                                  handleToggleConnector(conn.id, e.target.checked)
                                }
                              />
                              <div className="h-5 w-9 rounded-full bg-slate-700 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-indigo-500 peer-checked:after:translate-x-full" />
                            </label>
                          )}
                        </div>

                        <p className="text-xs leading-relaxed text-slate-400">
                          {conn.description}
                        </p>

                        {/* Tool badges */}
                        <div className="flex flex-wrap gap-1.5">
                          {conn.tools.map((tName) => (
                            <span
                              key={tName}
                              className="rounded-md border border-slate-800 bg-slate-950/90 px-2 py-0.5 font-mono text-[10px] text-slate-300"
                            >
                              {tName}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Action Footer / Configuration Form */}
                      <div className="mt-4 border-t border-white/5 pt-3">
                        {!conn.built_in && !conn.connected && !isConfiguring && (
                          <button
                            type="button"
                            onClick={() => {
                              setConnectorError(null);
                              setConnectorCredentials({});
                              setActiveConnectorFormId(conn.id);
                            }}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-200 transition hover:bg-indigo-500/20"
                          >
                            <Link2 className="h-3.5 w-3.5" />
                            Connect {conn.name}
                          </button>
                        )}

                        {!conn.built_in && conn.connected && !isConfiguring && (
                          <div className="flex items-center justify-between gap-2">
                            {conn.fields.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setConnectorError(null);
                                  setConnectorCredentials({});
                                  setActiveConnectorFormId(conn.id);
                                }}
                                className="text-[11px] text-slate-400 hover:text-slate-200"
                              >
                                Update credentials
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                handleDisconnectService(conn.id, conn.name)
                              }
                              className="ml-auto inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium text-rose-400 hover:bg-rose-950/50 hover:text-rose-300"
                            >
                              <Unplug className="h-3.5 w-3.5" />
                              Disconnect
                            </button>
                          </div>
                        )}

                        {conn.built_in && (
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>Native RAG Engine</span>
                            <span>{conn.tool_count} active tool(s)</span>
                          </div>
                        )}

                        {/* Inline Credential Form */}
                        {isConfiguring && (
                          <form
                            onSubmit={(e) => handleConnectService(e, conn.id)}
                            className="mt-2 space-y-2.5 rounded-xl border border-slate-800 bg-slate-950 p-3"
                          >
                            {conn.fields.map((field) => (
                              <div key={field.key}>
                                <label className="mb-1 block text-[11px] font-medium text-slate-300">
                                  {field.label}
                                </label>
                                <input
                                  type={field.type === "password" ? "password" : "text"}
                                  required={field.required}
                                  placeholder={field.placeholder}
                                  value={connectorCredentials[field.key] || ""}
                                  onChange={(e) =>
                                    setConnectorCredentials((prev) => ({
                                      ...prev,
                                      [field.key]: e.target.value,
                                    }))
                                  }
                                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                                />
                                {field.helper_text && (
                                  <p className="mt-1 text-[10px] text-slate-500">
                                    {field.helper_text}
                                  </p>
                                )}
                              </div>
                            ))}
                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setActiveConnectorFormId(null)}
                                className="rounded-lg px-2.5 py-1 text-xs text-slate-400 hover:text-white"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={isBusy}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                              >
                                {isBusy ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                                Verify & Connect
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Granular Agent Tool Permissions Accordion */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60">
                <button
                  type="button"
                  onClick={() => setShowToolsBreakdown((prev) => !prev)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-xs font-semibold text-slate-300 hover:text-white"
                >
                  <span>
                    Granular Agent Tools ({plugins.filter((p) => p.enabled).length} of{" "}
                    {plugins.length} enabled)
                  </span>
                  {showToolsBreakdown ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </button>
                {showToolsBreakdown && (
                  <div className="divide-y divide-slate-800 border-t border-slate-800">
                    {plugins.map((plugin) => (
                      <div
                        key={plugin.name}
                        className="flex items-center justify-between px-4 py-2.5"
                      >
                        <div className="pr-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-slate-100">
                              {plugin.name}
                            </span>
                            {plugin.requires_consent && (
                              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300">
                                requires consent
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400">
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
                    ))}
                  </div>
                )}
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 sm:col-span-2"
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
                <p
                  role="status"
                  aria-live="polite"
                  className="text-xs text-indigo-200"
                >
                  {keyStatusMsg}
                </p>
              )}

              <div className="mt-4 divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950/50">
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-slate-400">Provider</label>
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
                  <label className="mb-1 block text-slate-400">Model Name</label>
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
                  <label className="mb-1 block text-slate-400">
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
                  <label className="mb-1 block text-slate-400">Max Tokens</label>
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
                  <label className="mb-1 block text-slate-400">Top P</label>
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
            <div className="space-y-4 text-xs leading-relaxed text-slate-300">
              <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <h4 className="font-semibold text-slate-100">
                  Owner-Only Credential Storage (chmod 0600)
                </h4>
                <p className="text-slate-400">
                  LLM API keys (<code className="text-slate-200">data/keys.json</code>),
                  connector tokens (<code className="text-slate-200">data/connectors.json</code>),
                  and tool states (<code className="text-slate-200">data/plugins.json</code>)
                  are written atomically with strict <code className="text-slate-200">0600</code> permissions and excluded from Git.
                </p>
              </div>

              <div className="space-y-2 rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4">
                <h4 className="font-semibold text-indigo-200">
                  Connector Architecture & Consent Guardrails
                </h4>
                <ul className="list-disc space-y-1.5 pl-5 text-slate-300">
                  <li>
                    <strong>Interactive User Consent:</strong> Any write or external action tool—such as{" "}
                    <code className="font-mono text-amber-300">gmail_send_email</code>,{" "}
                    <code className="font-mono text-amber-300">github_create_issue</code>,{" "}
                    <code className="font-mono text-amber-300">slack_post_message</code>, or custom webhook invocations—pauses the agent loop and prompts you for explicit approval in the chat stream before executing.
                  </li>
                  <li>
                    <strong>Live Credential Verification:</strong> Connectors verify OAuth tokens, App Passwords, and API keys against official endpoints (<code className="font-mono text-emerald-300">gmail.googleapis.com</code>, <code className="font-mono text-emerald-300">www.googleapis.com/drive/v3</code>, <code className="font-mono text-emerald-300">api.github.com</code>, <code className="font-mono text-emerald-300">api.notion.com</code>, <code className="font-mono text-emerald-300">slack.com/api</code>) before saving.
                  </li>
                  <li>
                    <strong>HTTPS & Schema Enforcement:</strong> Custom webhook connectors require <code className="font-mono text-emerald-300">https://</code> (or localhost), and all tool arguments are validated against JSON Schema with a 10 KB input cap, 4,000-character output cap, and 12-turn limit.
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
