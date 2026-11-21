"use client";


import { InstallApp } from "./InstallApp";
import { languages, normalizeLocale, ui } from "../lib/locales";
import directory from "../lib/connectorDirectory.json";
import { WorkspacePolicy } from "./WorkspacePolicy";
import { FONT_OPTIONS } from "../lib/fonts";
import React, { useEffect, useState } from "react";
import {
  ArrowLeft, ChevronRight, Bell, Globe, LayoutGrid, Monitor, Search, Smartphone, Sparkles, Zap, Database, Brain,
  Check,
  ImagePlus,
  Key,
  Loader2,
  Plug,
  RotateCcw,
  Shield,
  Sliders,
  Trash2,
  X,
} from "lucide-react";
import {
  connectService,
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
  detectProviderFromKeyString,
  INBUILT_ASSISTANT_LOGOS,
  INBUILT_USER_PFPS,
} from "../lib/utils";
import { useProfile } from "../hooks/useProfile";

export interface SettingsModalProps {
  conversationMode: "chat" | "agent";
  isOpen?: boolean;
  open?: boolean;
  onClose: () => void;
  onOpenOnboarding: () => void;
  startInConnectors: boolean;
  connectorNotice?: string;
  onUseConnector: (prompt: string, connector: ConnectorInfo) => void;
  profileState: ReturnType<typeof useProfile>;
}

type TabKey = "appearance" | "haptics" | "notifications" | "widget" | "action" | "language" | "customize" | "tools" | "behavior" | "privacy" | "memory" | "premium" | "profile" | "connectors" | "keys" | "model" | "security";

const PROVIDERS = [
  { id: "nvidia", label: "NVIDIA NIM" },
  { id: "grok", label: "xAI Grok" },
  { id: "deepseek", label: "DeepSeek" },
  { id: "qwen", label: "Qwen (Alibaba)" },
  { id: "groq", label: "Groq" },
  { id: "gemini", label: "Google Gemini" },
  { id: "openai", label: "OpenAI" },
  { id: "openrouter", label: "OpenRouter" },
  { id: "anthropic", label: "Anthropic Claude" },
  { id: "mistral", label: "Mistral AI" },
  { id: "ollama", label: "Ollama (Local)" },
  { id: "custom", label: "Custom Endpoint" },
];

const DEFAULT_MODELS: Record<string, string> = {
  nvidia: "meta/llama-3.3-70b-instruct",
  grok: "grok-2-latest",
  deepseek: "deepseek-chat",
  qwen: "qwen-plus",
  groq: "llama-3.3-70b-versatile",
  gemini: "gemini-2.0-flash",
  openrouter: "openrouter/free",
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-sonnet-latest",
  mistral: "mistral-large-latest",
  ollama: "llama3.2",
  custom: "gpt-4o-mini",
};

const CONNECTOR_CATEGORIES: Array<{ id: string; title: string }> = [
  { id: "developer", title: "Developers & Tools" },
  { id: "workspace", title: "Productivity & Workspace" },
  { id: "communication", title: "Communication & Meetings" },
  { id: "operations", title: "Sales, Marketing & Billing" },
  { id: "built_in", title: "Search & Knowledge" },

];

const brandedConnectors = new Set([
  "figma", "linear", "jira", "docker", "discord", "dropbox", "confluence", "salesforce", "postgres", "mongodb", "snowflake", "trello",
  "airtable",
  "asana",
  "bitbucket",
  "brevo",
  "circleci",
  "clickup",
  "cloudflare",
  "digitalocean",
  "fly",
  "github",
  "gitlab",
  "gmail",
  "mailerlite",
  "google_calendar",
  "google_drive",
  "google_tasks",
  "hubspot",
  "huggingface",
  "ms_teams",
  "netlify",
  "notion",
  "onedrive",
  "outlook",
  "postman",
  "render",
  "sentry",
  "slack",
  "stripe",
  "supabase",
  "vercel",
  "zoom",
]);

function connectorPrompt(connector: ConnectorInfo): string {
  const examples: Record<string, string> = {
    github: "Use GitHub to search repositories for ",
    gmail: "Use Gmail to summarize my five most recent messages.",
    google_drive: "Use Google Drive to find documents about ",
    notion: "Use Notion to find pages about ",
    slack: "Draft a Slack update for my review about ",
    pdf_rag: "Search my indexed PDFs for ",
    web_research: "Search the web for ",
  };
  return examples[connector.id] ?? (connector.category === "custom"
    ? `Use the ${connector.name} connector to `
    : `Use ${connector.name}. ${connector.description}`);
}

function ConnectorBrandLogo({ id }: { id: string }) {
  if (brandedConnectors.has(id)) {
    const src = `/connectors/${id}.svg`;
    return <img src={src} alt="" className="h-7 w-7 object-contain" />;
  }
  return <Plug aria-hidden className="h-5 w-5" />;
}

function ProviderBrandLogo({ provider }: { provider: string }) {
  if (provider === "custom") return <Plug aria-hidden className="h-5 w-5 shrink-0" />;
  const icon = provider === "anthropic" ? "claude" : provider;
  return <img src={`/providers/${icon}.svg`} alt="" className="h-6 w-6 shrink-0 rounded bg-white p-0.5 object-contain" />;
}

export function SettingsModal({ startInConnectors, connectorNotice, conversationMode, isOpen, open, onClose, profileState, onUseConnector, onOpenOnboarding }: SettingsModalProps) {
  const modalVisible = Boolean(isOpen ?? open);
  const [localeCode, setLocaleCode] = useState("");
  const [localeError, setLocaleError] = useState("");
  const [settingsQuery, setSettingsQuery] = useState("");
  const [activeTab, showTab] = useState<TabKey | null>(null);
  const {
    profile,
    update: updateProfile,
    reset: resetProfile,
    setAvatarFromFile,
    setAssistantLogoFromFile,
  } = profileState;
  const labels = ui(profile.locale);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [hostedReady, setHostedReady] = useState(false);
  const [keyMode, setKeyMode] = useState<"agent" | "chat">(conversationMode);
  useEffect(() => { if (modalVisible) setKeyMode(conversationMode); }, [modalVisible, conversationMode]);
  const loadVersion = React.useRef(0);
  const [keys, setKeys] = useState<KeyStatusMap>({});
  const [selectedProvider, setSelectedProvider] = useState<string>("nvidia");
  const [detectedProvider, setDetectedProvider] = useState<string | null>(null);
  const [customUrl, setCustomUrl] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState<string>("");
  const [keyStatusMsg, setKeyStatusMsg] = useState<string | null>(null);
  const [keyBusy, setKeyBusy] = useState<boolean>(false);

  const [config, setConfig] = useState<LLMConfig>({
    provider: "nvidia",
    model: "meta/llama-3.3-70b-instruct",
    base_url: "",
    temperature: 0.3,
    max_tokens: 1024,
    top_p: 0.9,
  });

  function setActiveTab(tab: TabKey | null) {
    if (tab === activeTab) return;
    if (tab === null && history.state?.resoSettingsDepth > 1) { history.back(); return; }
    const depth = Number(history.state?.resoSettingsDepth || 1) + 1;
    history.pushState({ ...history.state, resoSettingsDepth: depth, resoSettingsTab: tab }, "");
    showTab(tab);
  }
  function closeSheet() {
    const depth = Number(history.state?.resoSettingsDepth || 0);
    if (depth) history.go(-depth);
    else onClose();
  }
  const closeRef = React.useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!modalVisible) {
      showTab(null);
      const depth = Number(history.state?.resoSettingsDepth || 0);
      if (depth) history.go(-depth);
      return;
    }
    if (!history.state?.resoSettingsDepth) history.pushState({ ...history.state, resoSettingsDepth: 1, resoSettingsTab: null }, "");
    if (startInConnectors && history.state?.resoSettingsDepth === 1) history.pushState({ ...history.state, resoSettingsDepth: 2, resoSettingsTab: "connectors" }, "");
    showTab(startInConnectors ? "connectors" : null);
    const pop = (event: PopStateEvent) => {
      if (!event.state?.resoSettingsDepth) closeRef.current();
      else showTab(event.state.resoSettingsTab ?? null);
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, [modalVisible, startInConnectors]);
  const [connectorSearch, setConnectorSearch] = useState("");
  const [catalogUnavailable, setCatalogUnavailable] = useState(false);
  const [connectors, setConnectors] = useState<ConnectorInfo[]>(() => directory.map(([id, name, category, description]) => ({
    id: id!, name: name!, category: category!, description: description!, auth_type: "", built_in: false,
    connected: false, enabled: false, status: "unavailable", account_label: "", tool_count: 0, tools: [], fields: [],
  })));
  const [activeConnectorFormId, setActiveConnectorFormId] = useState<string | null>(null);
  const [connectorCredentials, setConnectorCredentials] = useState<Record<string, string>>({});
  const [connectorBusyId, setConnectorBusyId] = useState<string | null>(null);
  const [connectorError, setConnectorError] = useState<string | null>(null);



  const [securitySection, setSecuritySection] = useState<"overview" | "privacy" | "terms">("overview");

  useEffect(() => {
    if (!modalVisible) return;
    loadAllData();
  }, [modalVisible, keyMode]);

  async function loadAllData() {
    const version = ++loadVersion.current;
    try {
      const [kData, cData, connData] = await Promise.all([
        fetchKeys(keyMode).catch((): KeyListResponse => ({ keys: {}, active_provider: "" })),
        fetchConfig(keyMode).catch(() => ({
          provider: "nvidia",
          model: "meta/llama-3.3-70b-instruct",
          base_url: "",
          temperature: 0.3,
          max_tokens: 1024,
          top_p: 0.9,
        })),
        fetchConnectors().catch(() => null),
      ]);
      if (version !== loadVersion.current) return;
      setKeys(kData.keys);
      setHostedReady(Boolean(kData.hosted_ready));
      const activeProvider =
        cData.provider || kData.active_provider || Object.keys(kData.keys)[0] || "nvidia";
      setSelectedProvider(activeProvider);
      setCustomUrl(activeProvider === "custom" ? cData.base_url || "" : "");
      setCustomModel(activeProvider === "custom" ? cData.model : "");
      setConfig({ ...cData, provider: activeProvider });
      setCatalogUnavailable(connData === null);
      if (connData) setConnectors(connData);
    } catch {}
  }

  async function openConnector(service: ConnectorInfo) {
    setConnectorError(null);
    setConnectorCredentials({});
    setActiveConnectorFormId(null);
    let current = service;
    if (service.status === "unavailable" || catalogUnavailable) {
      setConnectorBusyId(service.id);
      try {
        const live = await fetchConnectors();
        const match = live.find(item => item.id === service.id);
        if (!match) throw new Error();
        setConnectors(live);
        setCatalogUnavailable(false);
        current = match;
      } catch {
        setConnectorError(`Could not open ${service.name}. Please try again.`);
        return;
      } finally {
        setConnectorBusyId(null);
      }
    }
    if (current.built_in) await handleToggleConnector(current.id, !current.enabled);
    else if (!current.connected && activeConnectorFormId !== current.id) setActiveConnectorFormId(current.id);
  }

  function handleKeyInputChange(raw: string) {
    setApiKeyInput(raw);
    const autoDetected = selectedProvider === "custom" ? null : detectProviderFromKeyString(raw);
    setDetectedProvider(autoDetected);
    if (autoDetected) {
      setSelectedProvider(autoDetected);
    }
  }

  async function handleConnectService(e: React.FormEvent, connectorId: string) {
    e.preventDefault();
    setConnectorError(null);
    setConnectorBusyId(connectorId);
    try {
      await connectService(connectorId, connectorCredentials);
      setConnectorCredentials({});
      setActiveConnectorFormId(null);
      await loadAllData();
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
      await loadAllData();
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
      await loadAllData();
    } catch (err) {
      setConnectorError(err instanceof Error ? err.message : "Disconnect failed.");
    } finally {
      setConnectorBusyId(null);
    }
  }

  async function handleSaveKey(verify = true) {
    if (!apiKeyInput.trim()) return;
    const targetProvider = detectedProvider || selectedProvider;
    setKeyBusy(true);
    setKeyStatusMsg(`Verifying ${targetProvider.toUpperCase()} API key...`);
    try {
      const endpoint = targetProvider === "custom" ? customUrl.trim() : "";
      const model = targetProvider === "custom" ? customModel.trim() :
        config.provider === targetProvider ? config.model : DEFAULT_MODELS[targetProvider];
      if (targetProvider === "custom" && (!endpoint || !model)) {
        setKeyStatusMsg("Enter the endpoint URL and the model ID supplied by your provider.");
        return;
      }
      const testRes = verify ? await testProviderKey({
        provider: targetProvider,
        api_key: apiKeyInput.trim(),
        model,
        base_url: endpoint,
      }) : { valid: true, model, error: undefined };
      if (!testRes.valid) {
        setKeyStatusMsg(`Verification failed: ${testRes.error || "Invalid key."}`);
        return;
      }

      const activeModel =
        testRes.model || DEFAULT_MODELS[targetProvider] || config.model;
      await saveProviderKey({
        provider: targetProvider,
        api_key: apiKeyInput.trim(),
        model: activeModel,
        base_url: endpoint,
      }, keyMode);
      const nextConfig = {
        ...config,
        provider: targetProvider,
        hosted: false,
        base_url: endpoint,
        model: activeModel,
      };
      await updateConfig(nextConfig, keyMode);
      setConfig(nextConfig);
      setSelectedProvider(targetProvider);
      const updated = await fetchKeys(keyMode);
      setKeys(updated.keys);
      setApiKeyInput("");
      setDetectedProvider(null);
      setKeyStatusMsg(`${verify ? "Verified" : "Saved without verification"} and activated ${targetProvider.toUpperCase()}.`);
    } catch (err) {
      setKeyStatusMsg(err instanceof Error ? err.message : "Failed to save key.");
    } finally {
      setKeyBusy(false);
    }
  }

  async function handleActivateFreeNvidia() {
    setKeyBusy(true);
    try {
      const nextConfig = {
        ...config,
        provider: "nvidia",
        hosted: true,
        base_url: "",
        model: DEFAULT_MODELS.nvidia!,
      };
      await updateConfig(nextConfig, keyMode);
      setConfig(nextConfig);
      setSelectedProvider("nvidia");
      setKeyStatusMsg("Activated built-in Free NVIDIA NIM tier.");
    } catch (err) {
      setKeyStatusMsg(err instanceof Error ? err.message : "Could not activate free tier.");
    } finally {
      setKeyBusy(false);
    }
  }

  async function handleDeleteKey(provider: string) {
    try {
      await deleteProviderKey(provider, keyMode);
      const updated = await fetchKeys(keyMode);
      setKeys(updated.keys);
    } catch {}
  }

  async function handleSaveModelConfig() {
    setKeyBusy(true);
    try {
      await updateConfig(config, keyMode);
      setSelectedProvider(config.provider);
      setKeyStatusMsg("Model settings saved.");
    } catch (err) {
      setKeyStatusMsg(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setKeyBusy(false);
    }
  }

  const query = connectorSearch.trim().toLowerCase();
  const matches = connectors.filter(item =>
    [item.name, item.description, item.id].some(value => value.toLowerCase().includes(query))
  );
  if (!modalVisible) return null;

  const currentAvatar = profile.avatarDataUrl || INBUILT_USER_PFPS[0]!.url;
  const currentLogo = profile.assistantLogo ?? "";

  return (
    <div
      className="settings-overlay fixed inset-0 z-50 flex items-center justify-center bg-[#0c0c0e]/80 p-2 backdrop-blur-md sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeSheet();
      }}
    >
      <div
        data-settings-home={activeTab === null ? "" : undefined}
        data-connector-sheet={activeTab === "connectors" ? "" : undefined}
        role="dialog"
        aria-modal="true" aria-labelledby="workspace-settings-title"
        className="settings-dialog flex h-[min(94dvh,820px)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-[#e6e4f0]/15 bg-[#141417] text-[#f4f3f8] shadow-2xl"
      >
        <div className="settings-heading flex items-center justify-between border-b border-[#e6e4f0]/10 px-5 py-4 sm:px-6">
          {activeTab && <button type="button" className="sheet-back" aria-label="Previous settings page" onClick={() => history.back()}><ArrowLeft size={20} /></button>}
          <h2 id="workspace-settings-title" className="text-base font-semibold tracking-tight">
            {activeTab === "connectors" ? "Add connector" : labels.settings}
          </h2>
          <button
            type="button" aria-label="Close settings"
            onClick={closeSheet}
            className="rounded-xl border border-[#e6e4f0]/15 p-1.5 text-[#e6e4f0]/70 transition hover:bg-[#1c1c21] hover:text-[#f4f3f8]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div key={activeTab ?? "menu"} className="settings-content min-h-0 min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === null ? <nav aria-label="Workspace settings" className="space-y-5">
            {!settingsQuery && <div className="settings-group"><button type="button" onClick={() => setActiveTab("profile")}>
              <img src={currentAvatar} alt="" width={44} height={44} className="my-3 rounded-full" />
              <span><strong>{profile.name || "Your profile"}</strong><small className="block opacity-75">{profile.username ? `@${profile.username}` : "Edit profile"}</small></span><ChevronRight aria-hidden size={17} className="ml-auto" />
            </button></div>}
            {([
              ["Subscription", [["premium", "Premium", Sparkles]]],
              ["App", [["appearance", "Appearance", Monitor], ["haptics", "Haptics", Smartphone], ["notifications", "Notifications", Bell], ["widget", "Widget", LayoutGrid], ["action", "Configure Action Button", Zap], ["language", labels.appLanguage, Globe]]],
              ["AI Assistant", [["customize", "Customize Assistant", Sliders], ["tools", "Connectors & Tools", Plug], ["behavior", "Behavior & Autonomy", Brain], ["privacy", "Privacy & Safety", Shield], ["memory", "Data & Memory", Database], ["keys", "API Keys", Key], ["model", "Model", Sliders]]],
            ] as const).map(([group, rows]) => {
              const matches = rows.filter(([, title]) => title.toLowerCase().includes(settingsQuery.trim().toLowerCase()));
              return matches.length > 0 && <section key={group}><h3 className="mb-2 pl-3 text-sm font-semibold opacity-75">{group}</h3><div className="settings-group">
                {matches.map(([id, title, Icon]) => <button key={title} type="button" onClick={() => setActiveTab(id)}><Icon size={19} aria-hidden="true" />{title}<ChevronRight aria-hidden size={17} className="ml-auto" /></button>)}
              </div></section>;
            })}
            <div className="sticky bottom-0 py-2"><Search size={18} aria-hidden="true" className="pointer-events-none absolute left-4 top-6" /><input type="search" aria-label={labels.searchSettings} placeholder={labels.searchSettings} value={settingsQuery} onChange={e => setSettingsQuery(e.target.value)} className="settings-home-search w-full rounded-full border border-current/20 pl-11 pr-5 py-3 shadow" /></div>
          </nav> : null}
          <div className="preferences-panel">
          {activeTab === "premium" && <><h3>Premium</h3><p>Early access to new features</p><a className="underline underline-offset-4" href="/api/billing/checkout">Continue to Stripe checkout</a><p>Pricing and billing terms appear at checkout. Early access is provisioned by the deployment operator.</p></>}
          {activeTab === "appearance" && <><h3>Appearance</h3><label>Theme<select value={profile.theme ?? "system"} onChange={e => updateProfile({theme: e.target.value as typeof profile.theme})}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label><label>Interface font<select value={profile.font} onChange={e => updateProfile({font: e.target.value as typeof profile.font})}>{FONT_OPTIONS.map(font => <option key={font.id} value={font.id}>{font.label}</option>)}</select></label></>}
          {activeTab === "haptics" && <><h3>Haptics</h3><label><input type="checkbox" checked={!!profile.haptics} onChange={e => { updateProfile({haptics:e.target.checked}); if (e.target.checked) navigator.vibrate?.(20); }} /> Vibrate when sending on supported devices</label></>}
          {activeTab === "notifications" && <><h3>Notifications</h3><label><input type="checkbox" checked={!!profile.notifications} onChange={async e => { if (!e.target.checked) return updateProfile({notifications:false}); if (typeof Notification === "undefined") return setProfileError("This browser does not support notifications."); try { const granted = await Notification.requestPermission() === "granted"; updateProfile({notifications:granted}); setProfileError(granted ? null : "Allow notifications in your browser settings."); } catch { setProfileError("Notifications are unavailable in this browser."); } }} /> Notify when a reply is ready in a background tab</label>{profileError && <p role="status">{profileError}</p>}</>}
          {activeTab === "widget" && <><h3>Widget</h3><label><input type="checkbox" checked={!!profile.workspaceShortcut} onChange={e => updateProfile({workspaceShortcut:e.target.checked})} /> Show the workspace shortcut above the composer</label><p>This is an in-app shortcut.</p><h3>Install Reso Agent</h3><InstallApp /></>}
          {activeTab === "action" && <><h3>Configure Action Button</h3><label>Open<select value={profile.actionButton ?? "settings"} onChange={e => updateProfile({actionButton:e.target.value as typeof profile.actionButton})}><option value="settings">Settings</option><option value="connectors">Connectors</option></select></label></>}
          {activeTab === "language" && <><h3>{labels.appLanguage}</h3><label>{labels.appLanguage}<select value={languages.some(({id}) => id === profile.locale) || !profile.locale ? profile.locale ?? "en" : "custom"} onChange={e => { if (e.target.value !== "custom") updateProfile({locale:e.target.value}); }}>{languages.map(({id,label}) => <option key={id} value={id} lang={id}>{label}</option>)}{profile.locale && !languages.some(({id}) => id === profile.locale) && <option value="custom">{profile.locale}</option>}</select></label>
          <form className="flex flex-wrap items-end gap-2" onSubmit={e => { e.preventDefault(); const code = normalizeLocale(localeCode); if (!code) { setLocaleError("Enter a valid language tag, such as fr, pt-BR or zh-Hant."); return; } updateProfile({locale:code}); setLocaleError(""); }}>
            <label>Other reply language<input maxLength={40} placeholder="e.g. pt-BR" value={localeCode} onChange={e => setLocaleCode(e.target.value)} /></label><button type="submit">Apply</button>
          </form>{localeError && <p role="alert">{localeError}</p>}<p>Core UI labels are translated in the listed languages. Other language tags apply to assistant replies, subject to model support.</p></>}
          {activeTab === "customize" && <><h3>Customize Assistant</h3><button onClick={() => setActiveTab("profile")}>Assistant Name &amp; Avatar</button><label>Persona &amp; Tone<select value={profile.tone ?? "formal"} onChange={e => updateProfile({tone:e.target.value as typeof profile.tone})}><option value="formal">Formal</option><option value="casual">Casual</option><option value="technical">Technical</option></select></label><label>System Instructions<textarea rows={5} maxLength={2000} value={profile.instructions ?? ""} onChange={e => updateProfile({instructions:e.target.value})} /></label></>}
          {activeTab === "tools" && <><h3>Connectors &amp; Tools</h3><button onClick={() => setActiveTab("connectors")}>Manage connectors and Web Search availability</button><label><input type="checkbox" checked={!!profile.webSearchDefault} onChange={e => updateProfile({webSearchDefault:e.target.checked})} /> Start new sessions with Web Search enabled</label><p>Code execution and device file access are unavailable in this deployment. Connected services have their own access controls.</p></>}
          {activeTab === "behavior" && <><h3>Behavior &amp; Autonomy</h3><p>Agent can use available read tools. External write tools require human approval.</p><p>Full automation and daily action caps are unavailable.</p></>}
          {activeTab === "privacy" && <><h3>Privacy &amp; Safety</h3><p>Model provider filters apply. Reso does not offer filter overrides, automatic PII masking, or a configurable prompt-injection filter.</p><button onClick={() => setActiveTab("security")}>Read Security, Privacy &amp; Terms</button></>}
          {activeTab === "memory" && <><h3>Data &amp; Memory</h3><label><input type="checkbox" checked={!!profile.rememberChats} onChange={e => updateProfile({rememberChats:e.target.checked})} /> Restore Chat and Agent conversations on this browser</label><label>Chat History Retention<select value={profile.retention ?? "30"} onChange={e => updateProfile({retention:e.target.value as typeof profile.retention})}><option value="30">30 days</option><option value="90">90 days</option><option value="forever">Forever</option></select></label><p>Stored on this browser when enabled. Recent turns are used as context when you continue a conversation.</p></>}
          {activeTab === "profile" && <label>Username<input value={profile.username ?? ""} maxLength={32} onChange={e => updateProfile({username:e.target.value.replace(/[^a-zA-Z0-9_]/g, "")})} /></label>}
          </div>
          {activeTab === "profile" && (
            <div className="mx-auto max-w-3xl space-y-6">
              <button type="button" onClick={onOpenOnboarding} className="text-sm underline underline-offset-4">Open onboarding</button>
              {profileError && (
                <p className="rounded-xl border border-[#e6e4f0]/20 bg-[#1c1c21] px-4 py-2 text-xs text-[#f4f3f8]">
                  {profileError}
                </p>
              )}

              <section className="rounded-2xl border border-[#e6e4f0]/12 bg-[#0c0c0e] p-4 sm:p-5 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#e6e4f0]/70">
                  Your Profile
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
                      className="h-10 w-10 shrink-0 rounded-xl border border-[#e6e4f0]/20 object-cover"
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
                        <ImagePlus className="h-3.5 w-3.5" /> Upload image
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <span className="block text-xs text-[#e6e4f0]/80 mb-2">
                    Profile picture (Cartoon Characters)
                  </span>
                  <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
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
                          className="h-11 w-11 rounded-lg object-cover"
                        />
                        <span className="text-[11px] font-medium text-[#f4f3f8]">
                          {pfp.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-[#e6e4f0]/12 bg-[#0c0c0e] p-4 sm:p-5 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#e6e4f0]/70">
                  Name your assistant
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-xs text-[#e6e4f0]/80">
                    Assistant name
                    <input
                      value={profile.assistantName}
                      maxLength={60}
                      placeholder="Reso Agent"
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
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-[#e6e4f0]/80">
                      Assistant logo
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateProfile({ assistantLogo: "" })}
                        className={`rounded-xl border px-2.5 py-1 text-xs transition ${
                          currentLogo === ""
                            ? "border-[#f4f3f8] bg-[#1c1c21] text-[#f4f3f8]"
                            : "border-[#e6e4f0]/15 bg-[#141417] text-[#e6e4f0]/75"
                        }`}
                      >
                        Leave Blank
                      </button>
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
                        <span className="inline-flex items-center gap-1 rounded-xl border border-[#e6e4f0]/15 bg-[#141417] px-2.5 py-1 text-xs text-[#e6e4f0]/80 hover:text-[#f4f3f8]">
                          <ImagePlus className="h-3.5 w-3.5" /> Upload image
                        </span>
                      </label>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
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
                          className="h-8 w-8 shrink-0 rounded-lg object-contain"
                        />
                        <span className="truncate text-xs font-medium text-[#f4f3f8]">
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="flex flex-col gap-3 rounded-2xl border border-[#e6e4f0]/12 bg-[#0c0c0e] p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
                <label className="text-xs text-[#e6e4f0]/80">
                  Interface Font
                  <select
                    value={profile.font}
                    onChange={(e) => {
                      const f = FONT_OPTIONS.find((o) => o.id === e.target.value)?.id;
                      if (f) updateProfile({ font: f });
                    }}
                    className="mt-1.5 block w-full min-w-0 sm:min-w-56 rounded-xl border border-[#e6e4f0]/15 bg-[#141417] px-3.5 py-2 text-sm text-[#f4f3f8] outline-none"
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
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e6e4f0]/15 bg-[#141417] px-4 py-2 text-xs text-[#e6e4f0] hover:border-[#f4f3f8]"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </button>
              </section>
            </div>
          )}

          {activeTab === "connectors" && connectorNotice && <p role="status" className="mb-3 text-sm">{connectorNotice}</p>}
          {activeTab === "connectors" && (
            <div className="connector-catalog space-y-6">
              <input type="search" aria-label="Search connectors" placeholder="Search connectors" value={connectorSearch}
                onChange={event => setConnectorSearch(event.target.value)} className="connector-search" />
              {connectorError && (
                <div className="rounded-xl border border-[#e6e4f0]/20 bg-[#1c1c21] px-4 py-2.5 text-xs text-[#f4f3f8]">
                  {connectorError}
                </div>
              )}

              {!matches.length && <p role="status">No matching connectors.</p>}
              {[{ id: "connected", title: "Connected" }, ...CONNECTOR_CATEGORIES].map((cat) => {
                const catItems = matches.filter(item => {
                  const connected = item.built_in ? item.enabled : item.connected;
                  if (cat.id === "connected") return connected;
                  return !connected && (item.category === cat.id ||
                    (cat.id === "workspace" && ["google", "productivity", "custom"].includes(item.category)));
                });
                if (cat.id === "developer") {
                  const order = ["vercel", "cloudflare", "github"];
                  const rank = (id: string) => order.includes(id) ? order.indexOf(id) : order.length;
                  catItems.sort((a, b) => rank(a.id) - rank(b.id) || a.name.localeCompare(b.name));
                }
                if (!catItems.length) return null;

                return (
                  <div key={cat.id} className="space-y-3">
                    <h4 className="text-lg font-semibold tracking-tight text-[#f4f3f8]">
                      {cat.title}
                    </h4>
                    <div className="connector-grid">
                      {catItems.map((conn) => {
                        const isConfiguring = activeConnectorFormId === conn.id;
                        const isBusy = connectorBusyId === conn.id;

                        return (
                          <div
                            key={conn.id}
                            id={`connector-card-${conn.id}`} tabIndex={-1}
                            className="flex flex-col justify-between rounded-2xl border border-[#e6e4f0]/12 bg-[#0c0c0e] p-4 transition hover:border-[#e6e4f0]/25"
                          >
                            <div className="catalog-entry">
                              <div className="flex items-start gap-3.5 min-w-0">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center">
                                  <ConnectorBrandLogo id={conn.id} />
                                </div>
                                <div className="space-y-1 min-w-0">
                                  <h5 className="break-words text-base font-semibold text-[#f4f3f8]">
                                    {conn.name}
                                  </h5>
                                  <p title={conn.description} className="mt-1 text-sm leading-relaxed text-[#e6e4f0]/80">
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
                                    {conn.enabled ? "Disconnect" : "Connect"}
                                  </button>
                                ) : conn.connected ? (
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleDisconnectService(conn.id)}
                                    className="rounded-xl border border-[#e6e4f0]/25 bg-[#1c1c21] px-4 py-1.5 text-xs font-semibold text-[#f4f3f8] hover:bg-[#141417]"
                                  >
                                    Disconnect
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => openConnector(conn)}
                                    className="rounded-xl bg-[#f4f3f8] px-4 py-1.5 text-xs font-semibold text-[#0c0c0e] shadow-[0_3px_0_0_#bdb9ce] transition active:translate-y-[1px] active:shadow-[0_1px_0_0_#bdb9ce]"
                                  >
                                    Connect
                                  </button>
                                )}
                              </div>
                            </div>

                            {conn.id === "github" && !conn.connected && <a href="/api/connectors/github/start" className="mt-2 block text-sm underline underline-offset-4">Sign in with GitHub</a>}
                            {conn.connected && conn.enabled && <button type="button"
                              className="mt-3 self-start text-sm font-semibold underline underline-offset-4"
                              onClick={() => onUseConnector(connectorPrompt(conn), conn)}>
                              Use in Agent
                            </button>}
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
                                      type={
                                        field.type === "password"
                                          ? "password"
                                          : "text"
                                      }
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
                );
              })}
              {!query && <section aria-labelledby="connector-providers">
                <h4 id="connector-providers">AI Models &amp; API Providers</h4>
                <div className="connector-grid">
                  {([
                    ["nvidia", "NVIDIA NIM", hostedReady ? "Use hosted NVIDIA inference or connect your own key." : "Connect your NVIDIA key to run hosted models."],
                    ["grok", "xAI Grok", "Use Grok for chat, reasoning, and code generation."],
                    ["gemini", "Google Gemini", "Connect Gemini for chat and agent requests."],
                    ["openai", "OpenAI", "Use your OpenAI API key for chat and tool calling."],
                  ] as const).map(([id, label, description]) => <div key={id} className="provider-entry">
                    <div className="catalog-entry">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="provider-tile"><ProviderBrandLogo provider={id} /></span>
                        <div><h5>{label}</h5><p>{description}</p></div>
                      </div>
                      <button className="provider-connect" type="button" aria-label={`Connect ${label}`} onClick={() => {
                        setApiKeyInput(""); setDetectedProvider(null); setKeyStatusMsg(null);
                        setSelectedProvider(id); setActiveTab("keys");
                      }}>Connect</button>
                    </div>
                  </div>)}
                </div>
              </section>}
            </div>
          )}

          {(activeTab === "keys" || activeTab === "model") && <fieldset className="mb-4 flex flex-wrap gap-2" disabled={keyBusy}>
            <legend className="mb-2 text-sm font-semibold">Configure credentials for</legend>
            {(["agent", "chat"] as const).map(mode => <button key={mode} type="button" aria-pressed={mode === keyMode}
              onClick={() => { ++loadVersion.current; setApiKeyInput(""); setDetectedProvider(null); setKeyStatusMsg(null); setKeyMode(mode); }}
              className={`rounded-xl px-4 py-2 text-xs font-semibold ${keyMode === mode ? "bg-[#f4f3f8] text-[#141417]" : "border border-white/15"}`}>
              {mode === "agent" ? "Agent API key" : "Chat API key"}
            </button>)}
          </fieldset>}
          {activeTab === "keys" && (
            <div className="space-y-5">
              <div className="flex flex-col justify-between gap-3 rounded-2xl border border-[#e6e4f0]/15 bg-[#0c0c0e] p-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <ProviderBrandLogo provider="nvidia" />
                  <div>
                    <h4 className="text-xs font-semibold text-[#f4f3f8]">
                      {hostedReady ? "Hosted NVIDIA chat" : "Hosted NVIDIA chat is unavailable"}
                    </h4>
                    <p className="text-[11px] text-[#e6e4f0]/70">
                      Chat for free using the built-in NVIDIA NIM key, or enter your own custom API key below.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleActivateFreeNvidia}
                  disabled={keyBusy || !hostedReady}
                  className="shrink-0 rounded-xl bg-[#f4f3f8] px-4 py-1.5 text-xs font-semibold text-[#0c0c0e] shadow-[0_3px_0_0_#bdb9ce]"
                >
                  Use Free NVIDIA Key
                </button>
              </div>

              <div className="rounded-2xl border border-[#e6e4f0]/12 bg-[#0c0c0e] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <ProviderBrandLogo
                      provider={detectedProvider || selectedProvider}
                    />
                    <span className="text-xs font-semibold text-[#f4f3f8]">
                      {
                        PROVIDERS.find(
                          (p) => p.id === (detectedProvider || selectedProvider)
                        )?.label
                      }
                    </span>
                  </div>
                  {detectedProvider && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f4f3f8] px-2.5 py-0.5 text-[10px] font-bold text-[#0c0c0e]">
                      Auto-detected:{" "}
                      {
                        PROVIDERS.find((p) => p.id === detectedProvider)?.label
                      }
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <input
                    type="password"
                    placeholder="Paste any API key (nvapi-..., xai-..., gsk_..., AIza..., sk-...) to auto-detect service"
                    value={apiKeyInput}
                    onChange={(e) => handleKeyInputChange(e.target.value)}
                    className="flex-1 rounded-xl border border-[#e6e4f0]/15 bg-[#141417] px-3.5 py-2 text-xs text-[#f4f3f8] outline-none focus:border-[#f4f3f8]"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveKey()}
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
                {selectedProvider === "custom" && <div className="grid gap-2">
                  <label>OpenAI-compatible endpoint<input type="url" value={customUrl} onChange={e => setCustomUrl(e.target.value)} placeholder="https://provider.example/v1" className="block w-full rounded bg-[#141417] p-2" /></label>
                  <label>Model ID<input value={customModel} onChange={e => setCustomModel(e.target.value)} placeholder="Model ID from your provider" className="block w-full rounded bg-[#141417] p-2" /></label>
                  <button type="button" disabled={keyBusy || !apiKeyInput.trim()} onClick={() => handleSaveKey(false)}>Save without verification</button>
                </div>}
                {keyStatusMsg && (
                  <p className="text-xs text-[#e6e4f0]/80">{keyStatusMsg}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {PROVIDERS.map((p) => {
                  const isSelected =
                    (detectedProvider || selectedProvider) === p.id;
                  const isConfigured =
                    Boolean(keys[p.id]?.configured) || (p.id === "nvidia" && hostedReady);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setDetectedProvider(null);
                        setSelectedProvider(p.id);
                      }}
                      className={`flex items-center justify-between rounded-2xl border p-3 text-left transition ${
                        isSelected
                          ? "border-[#f4f3f8] bg-[#1c1c21]"
                          : "border-[#e6e4f0]/12 bg-[#0c0c0e] hover:border-[#e6e4f0]/30"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <ProviderBrandLogo provider={p.id} />
                        <span className="truncate text-xs font-semibold text-[#f4f3f8]">
                          {p.label}
                        </span>
                      </div>
                      {isConfigured && (
                        <span className="ml-1 shrink-0 rounded-full bg-[#f4f3f8] px-2 py-0.5 text-[10px] font-bold text-[#0c0c0e]">
                          {p.id === "nvidia" && !keys[p.id]?.configured
                            ? "Free"
                            : "Ready"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {Object.keys(keys).length > 0 && (
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
              )}
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
                        base_url: "",
                        hosted: false,
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
              {config.provider === "custom" && <label className="block">
                OpenAI-compatible API base URL
                <input type="url" value={config.base_url || ""} placeholder="https://your-provider.example/v1"
                  onChange={(e) => setConfig({ ...config, base_url: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-[#0c0c0e] px-3 py-2" />
              </label>}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
            <div className="mx-auto max-w-3xl space-y-8 py-2 text-sm leading-relaxed text-[#e6e4f0]/85">
              <div className="flex flex-wrap gap-2 border-b border-[#e6e4f0]/15 pb-4">
                {(
                  [
                    { id: "overview", label: "Security" },
                    { id: "privacy", label: "Privacy Policy" },
                    { id: "terms", label: "Terms of Service" },
                  ] as const
                ).map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSecuritySection(sub.id)}
                    className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                      securitySection === sub.id
                        ? "bg-[#f4f3f8] text-[#0c0c0e]"
                        : "text-[#e6e4f0]/70 hover:text-[#f4f3f8]"
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>

              <WorkspacePolicy section={securitySection} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
