const BUILT_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL?.trim() || "";
const BACKEND_CONFIG_URL = process.env.NEXT_PUBLIC_BACKEND_CONFIG_URL?.trim() || "";
const BACKEND_OVERRIDE_KEY = "reso-backend-override-v1";
const BACKEND_DISCOVERED_KEY = "reso-backend-discovered-v1";
const DEVICE_SESSION_KEY = "reso-device-session-v1";
const CONFIG_REFRESH_MS = 30_000;

function validBackendUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    if (!(["https:", "http:"].includes(url.protocol))) return null;
    if (url.protocol === "http:" && !["localhost", "127.0.0.1"].includes(url.hostname)) return null;
    if (url.username || url.password || url.search || url.hash) return null;
    return url.origin.replace(/\/$/, "");
  } catch {
    return null;
  }
}

function deviceSession(): string {
  try {
    let id = localStorage.getItem(DEVICE_SESSION_KEY);
    if (!id) {
      id = Array.from(crypto.getRandomValues(new Uint8Array(16)), (n) => n.toString(16).padStart(2, "0")).join("");
      localStorage.setItem(DEVICE_SESSION_KEY, id);
    }
    return id;
  } catch {
    return "00000000000000000000000000000000";
  }
}

function acceptBackendQuery(): string | null {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const candidate = url.searchParams.get("backend");
  if (!candidate) return null;
  url.searchParams.delete("backend");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  const valid = validBackendUrl(candidate);
  if (valid) {
    try { localStorage.setItem(BACKEND_OVERRIDE_KEY, valid); } catch { /* storage may be disabled */ }
  }
  return valid;
}

let configCheckedAt = 0;
let configRequest: Promise<string | null> | undefined;

async function refreshDiscoveredBackend(force = false): Promise<string | null> {
  const configUrl = BACKEND_CONFIG_URL;
  if (!configUrl || typeof window === "undefined") return null;
  if (!force && Date.now() - configCheckedAt < CONFIG_REFRESH_MS) {
    try { return localStorage.getItem(BACKEND_DISCOVERED_KEY); } catch { return null; }
  }
  if (configRequest) return configRequest;
  configRequest = (async () => {
    try {
      const response = await fetch(configUrl, { cache: "no-store", mode: "cors", signal: AbortSignal.timeout(3500) });
      if (!response.ok) return null;
      const payload: unknown = await response.json();
      const candidate = typeof payload === "string" ? payload :
        typeof payload === "object" && payload !== null && "backend_url" in payload
          ? String((payload as { backend_url: unknown }).backend_url) : "";
      const backend = validBackendUrl(candidate);
      if (backend) localStorage.setItem(BACKEND_DISCOVERED_KEY, backend);
      return backend;
    } catch {
      try { return localStorage.getItem(BACKEND_DISCOVERED_KEY); } catch { return null; }
    } finally {
      configCheckedAt = Date.now();
      configRequest = undefined;
    }
  })();
  return configRequest;
}

export async function getBackendUrl(): Promise<string> {
  const fromQuery = acceptBackendQuery();
  if (fromQuery) return fromQuery;
  try {
    const override = validBackendUrl(localStorage.getItem(BACKEND_OVERRIDE_KEY) || "");
    if (override) return override;
    const discovered = validBackendUrl(localStorage.getItem(BACKEND_DISCOVERED_KEY) || "");
    if (discovered) {
      void refreshDiscoveredBackend();
      return discovered;
    }
  } catch { /* use build configuration */ }
  if (BACKEND_CONFIG_URL) void refreshDiscoveredBackend();
  const configured = validBackendUrl(BUILT_BACKEND_URL);
  if (configured) return configured;
  return "http://127.0.0.1:8000";
}

export async function setBackendUrl(raw: string): Promise<string | null> {
  const trimmed = raw.trim();
  if (trimmed) {
    const valid = validBackendUrl(trimmed);
    if (!valid) throw new Error("Enter an HTTPS tunnel URL, or an HTTP localhost URL for development.");
    localStorage.setItem(BACKEND_OVERRIDE_KEY, valid);
    return valid;
  }
  localStorage.removeItem(BACKEND_OVERRIDE_KEY);
  configCheckedAt = 0;
  return await refreshDiscoveredBackend(true) || validBackendUrl(BUILT_BACKEND_URL);
}

export async function getSavedBackendUrl(): Promise<string> {
  try {
    const override = validBackendUrl(localStorage.getItem(BACKEND_OVERRIDE_KEY) || "");
    const discovered = validBackendUrl(localStorage.getItem(BACKEND_DISCOVERED_KEY) || "");
    return override || discovered || await getBackendUrl();
  }
  catch { return getBackendUrl(); }
}

function backendPath(path: string, method: string): string {
  const url = new URL(path, "https://local.invalid");
  const routes: Record<string, string> = {
    "/api/ask": method === "POST" ? "/ask/stream" : "/ask",
    "/api/thinking": method === "POST" ? "/thinking/generate" : "/thinking/messages",
    "/api/connections/github": "/connections/github/repository",
  };
  let pathname = routes[url.pathname] || url.pathname.replace(/^\/api\//, "/");
  if (url.pathname.startsWith("/api/studio")) pathname = pathname.replace(/^\/studio/, "/v1/assistants");
  return `${pathname}${url.search}`;
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const method = (init.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
  const relative = raw.startsWith("/") ? raw : new URL(raw, window.location.href).pathname + new URL(raw, window.location.href).search;
  const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
  headers.set("X-Reso-Session", deviceSession());
  headers.set("X-Reso-Mode", headers.get("X-Reso-Mode") || "agent");
  const origin = await getBackendUrl();
  return fetch(`${origin}${backendPath(relative, method)}`, {
    ...init,
    method,
    headers,
    body: init.body ?? (input instanceof Request ? input.body : undefined),
    cache: init.cache || "no-store",
    mode: "cors",
  });
}

export type BackendState = "checking" | "online" | "offline";
type BackendListener = (state: BackendState, url: string) => void;
const listeners = new Set<BackendListener>();
let state: BackendState = "checking";
let pollTimer: ReturnType<typeof setInterval> | undefined;

function publish(next: BackendState, url: string) {
  state = next;
  listeners.forEach((listener) => listener(next, url));
}

export async function checkBackend(): Promise<BackendState> {
  await refreshDiscoveredBackend();
  const url = await getBackendUrl();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await apiFetch("/health", { signal: controller.signal });
    const health = await response.json().catch(() => null) as { status?: string } | null;
    state = response.ok && health?.status === "ok" ? "online" : "offline";
  } catch {
    state = "offline";
  } finally {
    clearTimeout(timer);
  }
  publish(state, url);
  return state;
}

export function subscribeBackend(listener: BackendListener): () => void {
  listeners.add(listener);
  void checkBackend();
  if (!pollTimer) pollTimer = setInterval(() => void checkBackend(), 15_000);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && pollTimer) {
      clearInterval(pollTimer);
      pollTimer = undefined;
    }
  };
}

export function getBackendState(): BackendState { return state; }
