"use client";

import React, { useEffect, useState } from "react";
import {
  Check,
  ImagePlus,
  Key,
  Loader2,
  Plug,
  RotateCcw,
  Shield,
  Sliders,
  Trash2,
  UserRound,
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
  saveProviderKey,
  testProviderKey,
  toggleConnector,
  updateConfig,
} from "../lib/api";
import type {
  ConnectorInfo,
  FontId,
  KeyListResponse,
  KeyStatusMap,
  LLMConfig,
} from "../lib/types";
import {
  DEFAULT_RAG_ASSISTANT_LOGO,
  INBUILT_ASSISTANT_LOGOS,
  INBUILT_USER_PFPS,
} from "../lib/utils";
import { useProfile } from "../hooks/useProfile";

export interface SettingsModalProps {
  isOpen?: boolean;
  open?: boolean;
  onClose: () => void;
}

type TabKey = "profile" | "connectors" | "keys" | "model" | "security";

const PROVIDERS = [
  { id: "groq", label: "Groq" },
  { id: "gemini", label: "Google Gemini" },
  { id: "openrouter", label: "OpenRouter" },
  { id: "openai", label: "OpenAI" },
  { id: "ollama", label: "Ollama" },
  { id: "custom", label: "Custom Endpoint" },
];

const DEFAULT_MODELS: Record<string, string> = {
  groq: "llama-3.3-70b-versatile",
  gemini: "gemini-2.0-flash",
  openrouter: "openrouter/free",
  openai: "gpt-4o-mini",
  ollama: "llama3.2",
  custom: "gpt-4o-mini",
};

const FONT_OPTIONS: Array<{ id: FontId; label: string }> = [
  { id: "open-sans", label: "Open Sans" },
  { id: "system", label: "System Default" },
  { id: "dm-sans", label: "DM Sans" },
  { id: "josefin-sans", label: "Josefin Sans" },
  { id: "fredoka", label: "Fredoka" },
  { id: "outfit", label: "Outfit" },
  { id: "plus-jakarta-sans", label: "Plus Jakarta Sans" },
];

const INBUILT_CONNECTOR_PRESETS: ConnectorInfo[] = [
  {
    id: "gmail",
    name: "Gmail",
    category: "google",
    description: "Search inbox messages, read threads, and send emails via Gmail API or App Password.",
    auth_type: "app_password",
    built_in: false,
    connected: false,
    enabled: false,
    status: "disconnected",
    account_label: "",
    tool_count: 2,
    tools: ["gmail_search_emails", "gmail_send_email"],
    fields: [
      { key: "email", label: "Gmail Address", type: "text", placeholder: "you@gmail.com", required: true },
      { key: "app_password", label: "App Password or OAuth Token", type: "password", placeholder: "16-char password or ya29...", required: true },
    ],
  },
  {
    id: "google_drive",
    name: "Google Drive",
    category: "google",
    description: "Search Drive files, list recent documents, and read Google Docs or plain-text file contents.",
    auth_type: "oauth_token",
    built_in: false,
    connected: false,
    enabled: false,
    status: "disconnected",
    account_label: "",
    tool_count: 2,
    tools: ["gdrive_search_files", "gdrive_read_file"],
    fields: [
      { key: "access_token", label: "OAuth2 Access Token", type: "password", placeholder: "ya29.a0AfB_by...", required: true },
    ],
  },
  {
    id: "github",
    name: "GitHub",
    category: "developer",
    description: "Search repositories, read source files, and inspect or create GitHub issues.",
    auth_type: "api_key",
    built_in: false,
    connected: false,
    enabled: false,
    status: "disconnected",
    account_label: "",
    tool_count: 3,
    tools: ["github_search_repos", "github_get_file", "github_create_issue"],
    fields: [
      { key: "token", label: "Personal Access Token", type: "password", placeholder: "ghp_...", required: true },
    ],
  },
  {
    id: "notion",
    name: "Notion",
    category: "productivity",
    description: "Search workspace pages and databases and read block content using a Notion Internal Integration.",
    auth_type: "api_key",
    built_in: false,
    connected: false,
    enabled: false,
    status: "disconnected",
    account_label: "",
    tool_count: 2,
    tools: ["notion_search_pages", "notion_read_page"],
    fields: [
      { key: "api_key", label: "Internal Integration Secret", type: "password", placeholder: "secret_... or ntn_...", required: true },
    ],
  },
  {
    id: "slack",
    name: "Slack",
    category: "productivity",
    description: "Post messages and alerts to Slack channels via Bot Token or Incoming Webhook.",
    auth_type: "api_key",
    built_in: false,
    connected: false,
    enabled: false,
    status: "disconnected",
    account_label: "",
    tool_count: 1,
    tools: ["slack_post_message"],
    fields: [
      { key: "bot_token", label: "Bot OAuth Token or Webhook URL", type: "password", placeholder: "xoxb-...", required: true },
    ],
  },
  {
    id: "pdf_rag",
    name: "Local PDF Knowledge Base",
    category: "built_in",
    description: "Semantic vector retrieval across local PDF documents indexed in ChromaDB.",
    auth_type: "none",
    built_in: true,
    connected: true,
    enabled: true,
    status: "connected",
    account_label: "Built-in Engine",
    tool_count: 1,
    tools: ["search_pdfs"],
    fields: [],
  },
  {
    id: "web_research",
    name: "Live Web Search",
    category: "built_in",
    description: "Search live web results and extract clean article text from external URLs.",
    auth_type: "none",
    built_in: true,
    connected: true,
    enabled: true,
    status: "connected",
    account_label: "Built-in Engine",
    tool_count: 2,
    tools: ["web_search", "fetch_url"],
    fields: [],
  },
];

function ConnectorBrandLogo({ id }: { id: string }) {
  switch (id) {
    case "gmail":
      return (
        <svg viewBox="0 0 48 48" className="h-7 w-7 shrink-0">
          <path fill="#4caf50" d="M45,16.2l-5,2.75l-5,4.75L35,40h7c1.657,0,3-1.343,3-3V16.2z" />
          <path fill="#1e88e5" d="M3,16.2l3.614,1.71L13,23.7V40H6c-1.657,0-3-1.343-3-3V16.2z" />
          <polygon fill="#e53935" points="35,11.2 24,19.45 13,11.2 12,17 13,23.7 24,31.95 35,23.7 36,17" />
          <path fill="#c62828" d="M3,12.298V16.2l10,7.5V11.2L9.876,8.859C9.132,8.301,8.228,8,7.298,8C4.924,8,3,9.924,3,12.298z" />
          <path fill="#fbc02d" d="M45,12.298V16.2l-10,7.5V11.2l3.124-2.341C38.868,8.301,39.772,8,40.702,8C43.076,8,45,9.924,45,12.298z" />
        </svg>
      );
    case "google_drive":
      return (
        <svg viewBox="0 0 87.3 78" className="h-7 w-7 shrink-0">
          <path fill="#0066da" d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" />
          <path fill="#00ac47" d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" />
          <path fill="#ea4335" d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" />
          <path fill="#00832d" d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" />
          <path fill="#2684fc" d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" />
          <path fill="#ffba00" d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" />
        </svg>
      );
    case "github":
      return (
        <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0 fill-[#f4f3f8]">
          <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
        </svg>
      );
    case "notion":
      return (
        <svg viewBox="0 0 100 100" className="h-7 w-7 shrink-0">
          <rect width="100" height="100" rx="20" fill="#f4f3f8" />
          <path d="M28 24h14l24 38V24h10v52H62L38 38v38H28V24z" fill="#0c0c0e" />
        </svg>
      );
    case "slack":
      return (
        <svg viewBox="0 0 122.8 122.8" className="h-7 w-7 shrink-0">
          <path d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z" fill="#e01e5a" />
          <path d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z" fill="#36c5f0" />
          <path d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z" fill="#2eb67d" />
          <path d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z" fill="#ecb22e" />
        </svg>
      );
    case "pdf_rag":
      return (
        <svg viewBox="0 0 48 48" className="h-7 w-7 shrink-0">
          <rect x="6" y="4" width="36" height="40" rx="8" fill="#f4f3f8" />
          <text x="24" y="29" textAnchor="middle" fill="#0c0c0e" fontSize="12" fontWeight="bold" fontFamily="sans-serif">
            PDF
          </text>
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 48 48" className="h-7 w-7 shrink-0">
          <circle cx="24" cy="24" r="18" stroke="#f4f3f8" strokeWidth="3" fill="none" />
          <path d="M12 24h24M24 12v24" stroke="#f4f3f8" strokeWidth="3" />
        </svg>
      );
  }
}

function ProviderBrandLogo({ provider }: { provider: string }) {
  switch (provider) {
    case "groq":
      return (
        <svg viewBox="0 0 40 40" className="h-5 w-5 shrink-0">
          <rect width="40" height="40" rx="10" fill="#f55036" />
          <path d="M20 11a9 9 0 109 9h-6v4h2.5a5 5 0 11-5.5-7.9V11z" fill="#ffffff" />
        </svg>
      );
    case "gemini":
      return (
        <svg viewBox="0 0 40 40" className="h-5 w-5 shrink-0">
          <path d="M20 4C21.5 14 26 18.5 36 20C26 21.5 21.5 26 20 36C18.5 26 14 21.5 4 20C14 18.5 18.5 14 20 4Z" fill="#f4f3f8" />
        </svg>
      );
    case "openai":
      return (
        <svg viewBox="0 0 40 40" className="h-5 w-5 shrink-0">
          <circle cx="20" cy="20" r="16" stroke="#f4f3f8" strokeWidth="2.5" fill="none" />
          <polygon points="20,9 29,15 29,25 20,31 11,25 11,15" stroke="#f4f3f8" strokeWidth="2" fill="none" />
        </svg>
      );
    case "openrouter":
      return (
        <svg viewBox="0 0 40 40" className="h-5 w-5 shrink-0">
          <rect width="40" height="40" rx="10" fill="#1c1c21" />
          <path d="M10 20h12l-4-5m4 5l-4 5M24 14h6v12h-6" stroke="#f4f3f8" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </svg>
      );
    case "ollama":
      return (
        <svg viewBox="0 0 40 40" className="h-5 w-5 shrink-0">
          <rect width="40" height="40" rx="10" fill="#f4f3f8" />
          <circle cx="15" cy="18" r="2.5" fill="#0c0c0e" />
          <circle cx="25" cy="18" r="2.5" fill="#0c0c0e" />
          <path d="M15 26c2 2 8 2 10 0" stroke="#0c0c0e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 40 40" className="h-5 w-5 shrink-0">
          <rect width="40" height="40" rx="10" fill="#1c1c21" />
          <circle cx="20" cy="20" r="7" stroke="#f4f3f8" strokeWidth="2.5" fill="none" />
        </svg>
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
    setAssistantLogoFromFile,
  } = useProfile();
  const [profileError, setProfileError] = useState<string | null>(null);

  const [keys, setKeys] = useState<KeyStatusMap>({});
  const [selectedProvider, setSelectedProvider] = useState<string>("groq");
  const [apiKeyInput, setApiKeyInput] = useState<string>("");
  const [keyStatusMsg, setKeyStatusMsg] = useState<string | null>(null);
  const [keyBusy, setKeyBusy] = useState<boolean>(false);

  const [config, setConfig] = useState<LLMConfig>({
    provider: "groq",
    model: "llama-3.3-70b-versatile",
    base_url: "",
    temperature: 0.3,
    max_tokens: 1024,
    top_p: 0.9,
  });

  const [connectors, setConnectors] = useState<ConnectorInfo[]>(INBUILT_CONNECTOR_PRESETS);
  const [activeConnectorFormId, setActiveConnectorFormId] = useState<string | null>(null);
  const [connectorCredentials, setConnectorCredentials] = useState<Record<string, string>>({});
  const [connectorBusyId, setConnectorBusyId] = useState<string | null>(null);
  const [connectorError, setConnectorError] = useState<string | null>(null);

  const [showCustomForm, setShowCustomForm] = useState<boolean>(false);
  const [customId, setCustomId] = useState<string>("");
  const [customName, setCustomName] = useState<string>("");
  const [customDesc, setCustomDesc] = useState<string>("");
  const [customUrl, setCustomUrl] = useState<string>("");
  const [customMethod, setCustomMethod] = useState<"POST" | "GET">("POST");
  const [customApiKey, setCustomApiKey] = useState<string>("");

  const [securitySection, setSecuritySection] = useState<"overview" | "privacy" | "terms">("overview");

  useEffect(() => {
    if (!modalVisible) return;
    loadAllData();
  }, [modalVisible]);

  async function loadAllData() {
    try {
      const [kData, cData, connData] = await Promise.all([
        fetchKeys().catch((): KeyListResponse => ({ keys: {}, active_provider: "" })),
        fetchConfig().catch(() => ({
          provider: "groq",
          model: "llama-3.3-70b-versatile",
          base_url: "",
          temperature: 0.3,
          max_tokens: 1024,
          top_p: 0.9,
        })),
        fetchConnectors().catch(() => []),
      ]);
      setKeys(kData.keys);
      const activeProvider =
        cData.provider || kData.active_provider || Object.keys(kData.keys)[0] || "groq";
      setSelectedProvider(activeProvider);
      setConfig({ ...cData, provider: activeProvider });
      if (connData.length > 0) {
        setConnectors(connData);
      }
    } catch {}
  }

  async function handleConnectService(e: React.FormEvent, connectorId: string) {
    e.preventDefault();
    setConnectorError(null);
    setConnectorBusyId(connectorId);
    try {
      await connectService(connectorId, connectorCredentials);
      setConnectorCredentials({});
      setActiveConnectorFormId(null);
      const updated = await fetchConnectors().catch(() => []);
      if (updated.length > 0) setConnectors(updated);
    } catch (err) {
      setConnectorError(err instanceof Error ? err.message : "Connection failed.");
    } finally {
      setConnectorBusyId(null);
    }
  }

  async function handleToggleConnector(connectorId: string, enabled: boolean) {
    setConnectorError(null);
    setConnectorBusyId(connectorId);
    try {
      await toggleConnector(connectorId, enabled);
      const updated = await fetchConnectors().catch(() => []);
      if (updated.length > 0) setConnectors(updated);
    } catch (err) {
      setConnectorError(err instanceof Error ? err.message : "Toggle failed.");
    } finally {
      setConnectorBusyId(null);
    }
  }

  async function handleDisconnectService(connectorId: string) {
    setConnectorError(null);
    setConnectorBusyId(connectorId);
    try {
      await disconnectService(connectorId);
      const updated = await fetchConnectors().catch(() => []);
      if (updated.length > 0) setConnectors(updated);
    } catch (err) {
      setConnectorError(err instanceof Error ? err.message : "Disconnect failed.");
    } finally {
      setConnectorBusyId(null);
    }
  }

  async function handleCreateCustomConnector(e: React.FormEvent) {
    e.preventDefault();
    if (!customId.trim() || !customName.trim() || !customUrl.trim()) return;
    setConnectorError(null);
    setConnectorBusyId("custom_new");
    try {
      await createCustomConnector({
        id: customId.trim(),
        name: customName.trim(),
        description: customDesc.trim() || `Custom REST endpoint (${customUrl.trim()})`,
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
      const updated = await fetchConnectors().catch(() => []);
      if (updated.length > 0) setConnectors(updated);
    } catch (err) {
      setConnectorError(err instanceof Error ? err.message : "Could not add custom connector.");
    } finally {
      setConnectorBusyId(null);
    }
  }

  async function handleSaveKey() {
    if (!apiKeyInput.trim()) return;
    setKeyBusy(true);
    setKeyStatusMsg("Verifying API key...");
    try {
      const testRes = await testProviderKey({
        provider: selectedProvider,
        api_key: apiKeyInput.trim(),
        model: config.provider === selectedProvider ? config.model : undefined,
        base_url: config.provider === selectedProvider ? config.base_url : undefined,
      });
      if (!testRes.valid) {
        setKeyStatusMsg(`Verification failed: ${testRes.error || "Invalid key."}`);
        return;
      }

      const activeModel =
        testRes.model || DEFAULT_MODELS[selectedProvider] || config.model;
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
      };
      await updateConfig(nextConfig);
      setConfig(nextConfig);
      const updated = await fetchKeys();
      setKeys(updated.keys);
      setApiKeyInput("");
      setKeyStatusMsg(`Verified and activated ${selectedProvider}.`);
    } catch (err) {
      setKeyStatusMsg(err instanceof Error ? err.message : "Failed to save key.");
    } finally {
      setKeyBusy(false);
    }
  }

  async function handleDeleteKey(provider: string) {
    try {
      await deleteProviderKey(provider);
      const updated = await fetchKeys();
      setKeys(updated.keys);
    } catch {}
  }

  async function handleSaveModelConfig() {
    setKeyBusy(true);
    try {
      await updateConfig(config);
      setSelectedProvider(config.provider);
      setKeyStatusMsg("Model settings saved.");
    } catch (err) {
      setKeyStatusMsg(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setKeyBusy(false);
    }
  }

  if (!modalVisible) return null;

  const currentAvatar = profile.avatarDataUrl || INBUILT_USER_PFPS[0].url;
  const currentLogo = profile.assistantLogo || DEFAULT_RAG_ASSISTANT_LOGO;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c0c0e]/80 p-3 backdrop-blur-md sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex h-[min(88vh,800px)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-[#e6e4f0]/15 bg-[#141417] text-[#f4f3f8] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#e6e4f0]/10 px-6 py-4">
          <h2 className="text-base font-semibold tracking-tight text-[#f4f3f8]">
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#e6e4f0]/15 p-1.5 text-[#e6e4f0]/70 transition hover:bg-[#1c1c21] hover:text-[#f4f3f8]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-[#e6e4f0]/10 bg-[#0c0c0e] px-4">
          {(
            [
              { id: "profile", label: "Profile", icon: UserRound },
              { id: "connectors", label: "Connectors", icon: Plug },
              { id: "keys", label: "API Keys", icon: Key },
              { id: "model", label: "Model", icon: Sliders },
              { id: "security", label: "Security & Legal", icon: Shield },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-xs font-medium transition ${
                  active
                    ? "border-[#f4f3f8] text-[#f4f3f8]"
                    : "border-transparent text-[#e6e4f0]/60 hover:text-[#f4f3f8]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "profile" && (
            <div className="mx-auto max-w-3xl space-y-6">
              {profileError && (
                <p className="rounded-xl border border-[#e6e4f0]/20 bg-[#1c1c21] px-4 py-2 text-xs text-[#f4f3f8]">
                  {profileError}
                </p>
              )}

              <section className="rounded-2xl border border-[#e6e4f0]/12 bg-[#0c0c0e] p-5 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#e6e4f0]/70">
                  User Profile
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-xs text-[#e6e4f0]/80">
                    Name
                    <input
                      value={profile.name}
                      placeholder=""
                      maxLength={60}
                      onChange={(e) => updateProfile({ name: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-[#e6e4f0]/15 bg-[#141417] px-3.5 py-2 text-sm text-[#f4f3f8] outline-none focus:border-[#f4f3f8]"
                    />
                  </label>

                  <div className="flex items-end gap-3">
                    <img
                      src={currentAvatar}
                      alt="Avatar"
                      className="h-10 w-10 rounded-xl border border-[#e6e4f0]/20 object-cover"
                    />
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          try {
                            await setAvatarFromFile(f);
                          } catch (err) {
                            setProfileError(
                              err instanceof Error ? err.message : "Upload failed"
                            );
                          }
                        }}
                      />
                      <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#e6e4f0]/15 bg-[#141417] px-3 py-2 text-xs text-[#f4f3f8] hover:border-[#f4f3f8]">
                        <ImagePlus className="h-3.5 w-3.5" /> Custom Avatar
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <span className="block text-xs text-[#e6e4f0]/80 mb-2">
                    Inbuilt PFP
                  </span>
                  <div className="grid grid-cols-6 gap-2.5">
                    {INBUILT_USER_PFPS.map((pfp) => (
                      <button
                        key={pfp.id}
                        type="button"
                        onClick={() => updateProfile({ avatarDataUrl: pfp.url })}
                        className={`flex flex-col items-center gap-1 rounded-xl border p-2 transition ${
                          currentAvatar === pfp.url
                            ? "border-[#f4f3f8] bg-[#1c1c21]"
                            : "border-[#e6e4f0]/10 bg-[#141417] hover:border-[#e6e4f0]/30"
                        }`}
                      >
                        <img
                          src={pfp.url}
                          alt={pfp.label}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                        <span className="text-[10px] text-[#e6e4f0]/80">
                          {pfp.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-[#e6e4f0]/12 bg-[#0c0c0e] p-5 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#e6e4f0]/70">
                  Assistant Identity
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-xs text-[#e6e4f0]/80">
                    Assistant Name
                    <input
                      value={profile.assistantName}
                      maxLength={60}
                      onChange={(e) =>
                        updateProfile({ assistantName: e.target.value })
                      }
                      className="mt-1.5 w-full rounded-xl border border-[#e6e4f0]/15 bg-[#141417] px-3.5 py-2 text-sm text-[#f4f3f8] outline-none focus:border-[#f4f3f8]"
                    />
                  </label>
                  <label className="text-xs text-[#e6e4f0]/80">
                    Welcome Headline
                    <input
                      value={profile.headline}
                      maxLength={100}
                      onChange={(e) => updateProfile({ headline: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-[#e6e4f0]/15 bg-[#141417] px-3.5 py-2 text-sm text-[#f4f3f8] outline-none focus:border-[#f4f3f8]"
                    />
                  </label>
                  <label className="text-xs text-[#e6e4f0]/80 sm:col-span-2">
                    Welcome Message
                    <textarea
                      value={profile.bodyText}
                      maxLength={240}
                      rows={2}
                      onChange={(e) => updateProfile({ bodyText: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-[#e6e4f0]/15 bg-[#141417] px-3.5 py-2 text-sm text-[#f4f3f8] outline-none focus:border-[#f4f3f8]"
                    />
                  </label>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-[#e6e4f0]/80">
                      Assistant Logo
                    </span>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (f) await setAssistantLogoFromFile(f);
                        }}
                      />
                      <span className="inline-flex items-center gap-1 text-xs text-[#e6e4f0]/80 hover:text-[#f4f3f8]">
                        <ImagePlus className="h-3.5 w-3.5" /> Upload Custom Logo
                      </span>
                    </label>
                  </div>
                  <div className="grid grid-cols-4 gap-2.5">
                    {INBUILT_ASSISTANT_LOGOS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => updateProfile({ assistantLogo: item.url })}
                        className={`flex items-center gap-2.5 rounded-xl border p-2.5 transition ${
                          currentLogo === item.url
                            ? "border-[#f4f3f8] bg-[#1c1c21]"
                            : "border-[#e6e4f0]/10 bg-[#141417] hover:border-[#e6e4f0]/30"
                        }`}
                      >
                        <img
                          src={item.url}
                          alt={item.label}
                          className="h-9 w-9 rounded-lg object-contain"
                        />
                        <span className="text-xs font-medium text-[#f4f3f8]">
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="flex flex-col gap-3 rounded-2xl border border-[#e6e4f0]/12 bg-[#0c0c0e] p-5 sm:flex-row sm:items-end sm:justify-between">
                <label className="text-xs text-[#e6e4f0]/80">
                  Interface Font
                  <select
                    value={profile.font}
                    onChange={(e) => {
                      const f = FONT_OPTIONS.find((o) => o.id === e.target.value)?.id;
                      if (f) updateProfile({ font: f });
                    }}
                    className="mt-1.5 block w-full min-w-56 rounded-xl border border-[#e6e4f0]/15 bg-[#141417] px-3.5 py-2 text-sm text-[#f4f3f8] outline-none"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={resetProfile}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#e6e4f0]/15 bg-[#141417] px-4 py-2 text-xs text-[#e6e4f0] hover:border-[#f4f3f8]"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </button>
              </section>
            </div>
          )}

          {activeTab === "connectors" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between rounded-2xl border border-[#e6e4f0]/12 bg-[#0c0c0e] px-5 py-3.5">
                <div>
                  <h3 className="text-sm font-semibold text-[#f4f3f8]">
                    Workspace Connectors
                  </h3>
                  <p className="text-xs text-[#e6e4f0]/65">
                    Connect external services to enable direct search and execution tools.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustomForm((prev) => !prev)}
                  className="rounded-xl bg-[#f4f3f8] px-3.5 py-1.5 text-xs font-semibold text-[#0c0c0e] shadow-[0_3px_0_0_#bdb9ce] transition active:translate-y-[1px]"
                >
                  {showCustomForm ? "Close" : "Custom Web Connector"}
                </button>
              </div>

              {connectorError && (
                <div className="rounded-xl border border-[#e6e4f0]/20 bg-[#1c1c21] px-4 py-2.5 text-xs text-[#f4f3f8]">
                  {connectorError}
                </div>
              )}

              {showCustomForm && (
                <form
                  onSubmit={handleCreateCustomConnector}
                  className="rounded-2xl border border-[#e6e4f0]/15 bg-[#0c0c0e] p-4 space-y-3"
                >
                  <div className="text-xs font-semibold text-[#f4f3f8]">
                    Compact Custom Web Connector
                  </div>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-4">
                    <input
                      type="text"
                      required
                      placeholder="ID (e.g. crm_api)"
                      value={customId}
                      onChange={(e) => setCustomId(e.target.value)}
                      className="rounded-xl border border-[#e6e4f0]/15 bg-[#141417] px-3 py-1.5 text-xs text-[#f4f3f8] outline-none"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Name (e.g. CRM)"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="rounded-xl border border-[#e6e4f0]/15 bg-[#141417] px-3 py-1.5 text-xs text-[#f4f3f8] outline-none"
                    />
                    <select
                      value={customMethod}
                      onChange={(e) => setCustomMethod(e.target.value as "POST" | "GET")}
                      className="rounded-xl border border-[#e6e4f0]/15 bg-[#141417] px-3 py-1.5 text-xs text-[#f4f3f8] outline-none"
                    >
                      <option value="POST">POST</option>
                      <option value="GET">GET</option>
                    </select>
                    <input
                      type="password"
                      placeholder="Bearer Key (Optional)"
                      value={customApiKey}
                      onChange={(e) => setCustomApiKey(e.target.value)}
                      className="rounded-xl border border-[#e6e4f0]/15 bg-[#141417] px-3 py-1.5 text-xs text-[#f4f3f8] outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1.2fr_1.5fr_auto]">
                    <input
                      type="url"
                      required
                      placeholder="https://api.example.com/webhook"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      className="rounded-xl border border-[#e6e4f0]/15 bg-[#141417] px-3 py-1.5 text-xs text-[#f4f3f8] outline-none"
                    />
                    <input
                      type="text"
                      required
                      placeholder="What does this connector do?"
                      value={customDesc}
                      onChange={(e) => setCustomDesc(e.target.value)}
                      className="rounded-xl border border-[#e6e4f0]/15 bg-[#141417] px-3 py-1.5 text-xs text-[#f4f3f8] outline-none"
                    />
                    <button
                      type="submit"
                      disabled={connectorBusyId === "custom_new"}
                      className="rounded-xl bg-[#f4f3f8] px-4 py-1.5 text-xs font-semibold text-[#0c0c0e] shadow-[0_3px_0_0_#bdb9ce] active:translate-y-[1px]"
                    >
                      Connect
                    </button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {connectors.map((conn) => {
                  const isConfiguring = activeConnectorFormId === conn.id;
                  const isBusy = connectorBusyId === conn.id;

                  return (
                    <div
                      key={conn.id}
                      className="flex flex-col justify-between rounded-2xl border border-[#e6e4f0]/12 bg-[#0c0c0e] p-4 transition hover:border-[#e6e4f0]/25"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3.5">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#e6e4f0]/15 bg-[#141417] p-2">
                            <ConnectorBrandLogo id={conn.id} />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-sm font-semibold text-[#f4f3f8]">
                              {conn.name}
                            </h4>
                            <p className="text-xs leading-relaxed text-[#e6e4f0]/70">
                              {conn.description}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {conn.built_in ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleConnector(conn.id, !conn.enabled)
                              }
                              className={`rounded-xl px-4 py-1.5 text-xs font-semibold transition ${
                                conn.enabled
                                  ? "border border-[#e6e4f0]/25 bg-[#1c1c21] text-[#f4f3f8]"
                                  : "bg-[#f4f3f8] text-[#0c0c0e] shadow-[0_3px_0_0_#bdb9ce]"
                              }`}
                            >
                              {conn.enabled ? "Active" : "Connect"}
                            </button>
                          ) : conn.connected ? (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleDisconnectService(conn.id)}
                              className="rounded-xl border border-[#e6e4f0]/25 bg-[#1c1c21] px-4 py-1.5 text-xs font-semibold text-[#f4f3f8] hover:bg-[#141417]"
                            >
                              Connected
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setConnectorError(null);
                                setConnectorCredentials({});
                                setActiveConnectorFormId(
                                  isConfiguring ? null : conn.id
                                );
                              }}
                              className="rounded-xl bg-[#f4f3f8] px-4 py-1.5 text-xs font-semibold text-[#0c0c0e] shadow-[0_3px_0_0_#bdb9ce] transition active:translate-y-[1px] active:shadow-[0_1px_0_0_#bdb9ce]"
                            >
                              Connect
                            </button>
                          )}
                        </div>
                      </div>

                      {isConfiguring && (
                        <form
                          onSubmit={(e) => handleConnectService(e, conn.id)}
                          className="mt-3 space-y-2.5 border-t border-[#e6e4f0]/10 pt-3"
                        >
                          {conn.fields.map((field) => (
                            <div key={field.key}>
                              <label className="mb-1 block text-[11px] text-[#e6e4f0]/75">
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
                                className="w-full rounded-xl border border-[#e6e4f0]/15 bg-[#141417] px-3 py-1.5 text-xs text-[#f4f3f8] outline-none"
                              />
                            </div>
                          ))}
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setActiveConnectorFormId(null)}
                              className="rounded-xl px-3 py-1 text-xs text-[#e6e4f0]/70"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isBusy}
                              className="rounded-xl bg-[#f4f3f8] px-4 py-1.5 text-xs font-semibold text-[#0c0c0e] shadow-[0_3px_0_0_#bdb9ce]"
                            >
                              {isBusy ? "Verifying..." : "Connect"}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "keys" && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {PROVIDERS.map((p) => {
                  const isSelected = selectedProvider === p.id;
                  const isConfigured = Boolean(keys[p.id]?.configured);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProvider(p.id)}
                      className={`flex items-center justify-between rounded-2xl border p-3 text-left transition ${
                        isSelected
                          ? "border-[#f4f3f8] bg-[#1c1c21]"
                          : "border-[#e6e4f0]/12 bg-[#0c0c0e] hover:border-[#e6e4f0]/30"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <ProviderBrandLogo provider={p.id} />
                        <span className="text-xs font-semibold text-[#f4f3f8]">
                          {p.label}
                        </span>
                      </div>
                      {isConfigured && (
                        <span className="rounded-full bg-[#f4f3f8] px-2 py-0.5 text-[10px] font-bold text-[#0c0c0e]">
                          Ready
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-[#e6e4f0]/12 bg-[#0c0c0e] p-4 space-y-3">
                <div className="flex items-center gap-2.5">
                  <ProviderBrandLogo provider={selectedProvider} />
                  <span className="text-xs font-semibold text-[#f4f3f8]">
                    Configure{" "}
                    {PROVIDERS.find((p) => p.id === selectedProvider)?.label} API Key
                  </span>
                </div>
                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <input
                    type="password"
                    placeholder="Enter API Key..."
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="flex-1 rounded-xl border border-[#e6e4f0]/15 bg-[#141417] px-3.5 py-2 text-xs text-[#f4f3f8] outline-none focus:border-[#f4f3f8]"
                  />
                  <button
                    type="button"
                    onClick={handleSaveKey}
                    disabled={keyBusy || !apiKeyInput.trim()}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#f4f3f8] px-5 py-2 text-xs font-semibold text-[#0c0c0e] shadow-[0_3px_0_0_#bdb9ce] disabled:opacity-50"
                  >
                    {keyBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    Verify & Activate
                  </button>
                </div>
                {keyStatusMsg && (
                  <p className="text-xs text-[#e6e4f0]/80">{keyStatusMsg}</p>
                )}
              </div>

              <div className="divide-y divide-[#e6e4f0]/10 rounded-2xl border border-[#e6e4f0]/12 bg-[#0c0c0e]">
                {Object.entries(keys).map(([prov, info]) => (
                  <div
                    key={prov}
                    className="flex items-center justify-between px-4 py-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <ProviderBrandLogo provider={prov} />
                      <span className="font-semibold uppercase text-[#f4f3f8]">
                        {prov}
                      </span>
                      {config.provider === prov && (
                        <span className="rounded-full bg-[#f4f3f8] px-2 py-0.5 text-[10px] font-semibold text-[#0c0c0e]">
                          Active
                        </span>
                      )}
                      <span className="font-mono text-[#e6e4f0]/60">
                        {info.masked_key}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteKey(prov)}
                      className="text-[#e6e4f0]/60 hover:text-[#f4f3f8]"
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
                  <label className="mb-1 block text-[#e6e4f0]/75">Provider</label>
                  <select
                    value={config.provider}
                    onChange={(e) => {
                      const provider = e.target.value;
                      setConfig({
                        ...config,
                        provider,
                        model: DEFAULT_MODELS[provider] || config.model,
                      });
                      setSelectedProvider(provider);
                    }}
                    className="w-full rounded-xl border border-[#e6e4f0]/15 bg-[#0c0c0e] px-3.5 py-2 text-[#f4f3f8]"
                  >
                    {PROVIDERS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[#e6e4f0]/75">Model Name</label>
                  <input
                    type="text"
                    value={config.model}
                    onChange={(e) =>
                      setConfig({ ...config, model: e.target.value })
                    }
                    className="w-full rounded-xl border border-[#e6e4f0]/15 bg-[#0c0c0e] px-3.5 py-2 text-[#f4f3f8]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-[#e6e4f0]/75">
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
                    className="w-full rounded-xl border border-[#e6e4f0]/15 bg-[#0c0c0e] px-3 py-2 text-[#f4f3f8]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[#e6e4f0]/75">Max Tokens</label>
                  <input
                    type="number"
                    value={config.max_tokens}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        max_tokens: parseInt(e.target.value, 10) || 1024,
                      })
                    }
                    className="w-full rounded-xl border border-[#e6e4f0]/15 bg-[#0c0c0e] px-3 py-2 text-[#f4f3f8]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[#e6e4f0]/75">Top P</label>
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
                    className="w-full rounded-xl border border-[#e6e4f0]/15 bg-[#0c0c0e] px-3 py-2 text-[#f4f3f8]"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleSaveModelConfig}
                disabled={keyBusy}
                className="rounded-xl bg-[#f4f3f8] px-5 py-2 text-xs font-semibold text-[#0c0c0e] shadow-[0_3px_0_0_#bdb9ce]"
              >
                {keyBusy ? "Saving..." : "Save Configuration"}
              </button>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-5 text-xs leading-relaxed text-[#e6e4f0]/85">
              <div className="flex gap-2">
                {(
                  [
                    { id: "overview", label: "Security Architecture" },
                    { id: "privacy", label: "Privacy Policy" },
                    { id: "terms", label: "Terms & Conditions" },
                  ] as const
                ).map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSecuritySection(sub.id)}
                    className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                      securitySection === sub.id
                        ? "bg-[#f4f3f8] text-[#0c0c0e]"
                        : "border border-[#e6e4f0]/15 bg-[#0c0c0e] text-[#e6e4f0]/75"
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>

              {securitySection === "overview" && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[#e6e4f0]/12 bg-[#0c0c0e] p-5 space-y-2">
                    <h4 className="text-sm font-semibold text-[#f4f3f8]">
                      1. Local Credential Isolation (chmod 0600)
                    </h4>
                    <p>
                      All API keys (<code>data/keys.json</code>), connector OAuth tokens (<code>data/connectors.json</code>), and tool permissions (<code>data/plugins.json</code>) are stored exclusively on your local filesystem using atomic temp-file writes locked to owner-only read/write permissions (<code>0600</code>).
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#e6e4f0]/12 bg-[#0c0c0e] p-5 space-y-2">
                    <h4 className="text-sm font-semibold text-[#f4f3f8]">
                      2. Interactive Tool Execution Consent
                    </h4>
                    <p>
                      Write-capable connector operations—including sending emails via Gmail, creating GitHub issues, posting Slack messages, and invoking custom REST webhooks—are flagged with <code>requires_consent=True</code>. The agent loop halts prior to execution and requires explicit one-click user approval inside the chat stream.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#e6e4f0]/12 bg-[#0c0c0e] p-5 space-y-2">
                    <h4 className="text-sm font-semibold text-[#f4f3f8]">
                      3. Schema Validation & Payload Bounds
                    </h4>
                    <p>
                      Every LLM tool invocation is validated against its strict JSON Schema definition before execution. Input argument payloads are capped at 10 KB, tool outputs are truncated to 4,000 characters, and the reasoning loop is bounded to 12 maximum turns per request.
                    </p>
                  </div>
                </div>
              )}

              {securitySection === "privacy" && (
                <div className="rounded-2xl border border-[#e6e4f0]/12 bg-[#0c0c0e] p-5 space-y-3">
                  <h4 className="text-sm font-semibold text-[#f4f3f8]">
                    Privacy Policy
                  </h4>
                  <p>
                    <strong>Local-First Data Residency:</strong> Your indexed PDF documents, ChromaDB vector embeddings, profile preferences, and service credentials remain stored on your local machine. No telemetry or analytics tracking is embedded in this application.
                  </p>
                  <p>
                    <strong>Third-Party API Transmission:</strong> Prompts and retrieved context snippets are transmitted solely to the LLM provider (Groq, Google Gemini, OpenRouter, OpenAI, Ollama, or Custom Endpoint) and workspace connectors (Gmail, Google Drive, GitHub, Notion, Slack) that you explicitly configure and enable.
                  </p>
                  <p>
                    <strong>Credential Revocation:</strong> Disconnecting a connector or deleting an API key immediately purges the credential from <code>data/connectors.json</code> or <code>data/keys.json</code> and unregisters associated tools from memory.
                  </p>
                </div>
              )}

              {securitySection === "terms" && (
                <div className="rounded-2xl border border-[#e6e4f0]/12 bg-[#0c0c0e] p-5 space-y-3">
                  <h4 className="text-sm font-semibold text-[#f4f3f8]">
                    Terms & Conditions
                  </h4>
                  <p>
                    <strong>1. Authorized Usage:</strong> You are responsible for ensuring that any API keys, OAuth tokens, and custom webhook endpoints connected to the assistant comply with the terms of service of their respective platforms.
                  </p>
                  <p>
                    <strong>2. Verification of Generated Code & Documents:</strong> The assistant can synthesize source code (Python, C, C++, JavaScript, TypeScript, SQL) and exportable documents (PDF, DOC, TXT). All generated artifacts and citations should be reviewed before deployment in production environments.
                  </p>
                  <p>
                    <strong>3. User-Approved Actions:</strong> By approving a consent prompt in the chat interface, you authorize the assistant to execute the displayed tool call with the shown JSON arguments on your connected account.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
