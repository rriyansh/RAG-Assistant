"use client";

import { FormEvent, useEffect, useState } from "react";
import { checkBackend, getBackendState, getSavedBackendUrl, setBackendUrl, subscribeBackend, type BackendState } from "@/lib/api-client";

export function BackendConnectionSettings() {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<BackendState>(getBackendState());
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getSavedBackendUrl().then(setUrl);
    return subscribeBackend((next) => setState(next));
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const saved = await setBackendUrl(url);
      setUrl(saved || "");
      const result = await checkBackend();
      setMessage(result === "online" ? "Backend connected." : "URL saved. The backend is currently offline or unreachable.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save the backend URL.");
    } finally {
      setBusy(false);
    }
  }

  async function useAutoSync() {
    setBusy(true);
    setMessage("");
    try {
      const saved = await setBackendUrl("");
      setUrl(saved || "");
      const result = await checkBackend();
      setMessage(result === "online" ? "Auto-sync backend connected." : "Auto-sync URL selected; backend is currently offline or unreachable.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load the auto-sync URL.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="space-y-4">
    <h3>Backend Connection</h3>
    <p>Set your current Cloudflare Quick Tunnel URL. Reso checks its health in the background and keeps the interface available when the backend is offline.</p>
    <form className="space-y-3" onSubmit={save}>
      <label className="block">Backend URL
        <input className="mt-2 w-full rounded-lg border border-current/20 bg-transparent p-3" type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="https://example.trycloudflare.com" value={url} onChange={(event) => setUrl(event.target.value)} />
      </label>
      <div className="flex flex-wrap gap-2">
        <button className="glass-button" type="submit" disabled={busy}>{busy ? "Checking…" : "Save and check"}</button>
        <button className="glass-button" type="button" disabled={busy} onClick={() => void useAutoSync()}>Use auto-sync URL</button>
      </div>
    </form>
    <p role="status" aria-live="polite">Status: {state === "online" ? "Connected" : state === "checking" ? "Checking" : "Offline"}{message ? ` — ${message}` : ""}</p>
    <p className="text-sm opacity-70">You can also open Reso with <code>?backend=https://your-tunnel.trycloudflare.com</code>. This saves the URL on this device.</p>
  </section>;
}
