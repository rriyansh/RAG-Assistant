"use client";

import { useEffect, useState } from "react";
import { disconnectService } from "@/lib/api";
import { apiFetch } from "@/lib/api-client";

export default function GitHubConnection() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [repository, setRepository] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    apiFetch("/api/connections/github", {cache:"no-store"}).then(async response => {
      if (!response.ok) throw Error("Could not load this connection.");
      const data = await response.json();
      setConnected(data.connected);
      setRepository(data.repository || "");
      if (new URLSearchParams(location.search).get("status") === "unavailable") setNotice("The deployment operator must configure GitHub OAuth before you can connect.");
      if (new URLSearchParams(location.search).get("status") === "failed") setNotice("Authorization failed. Try connecting again.");
    }).catch(error => setNotice(error.message));
  }, []);
  async function manage(disconnect: boolean) {
    setBusy(true);
    try {
      if (disconnect) { await disconnectService("github"); setConnected(false); setRepository(""); setNotice("Disconnected."); }
      else {
        const response = await apiFetch("/api/connections/github", {method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({repository:repository.trim()})});
        if (!response.ok) throw Error("Check the repository name and the permissions granted on GitHub.");
        setNotice("Default repository saved.");
      }
    } catch (error) {setNotice(error instanceof Error ? error.message : "Connection update failed.");}
    finally {setBusy(false);}
  }
  return <main className="mx-auto max-w-lg space-y-5 px-5 py-12">
    <a href="/">← Workspace</a><h1 className="text-2xl font-semibold">GitHub connection</h1>
    {connected === false && <p>Connect GitHub from Settings → Connectors. OAuth authorization is available only through a configured hosted server.</p>}
    {connected && <form className="grid gap-4" onSubmit={e=>{e.preventDefault();void manage(false)}}>
      <label>Default repository<input className="block w-full rounded-lg border bg-transparent p-2" value={repository} placeholder="owner/repository" onChange={e=>setRepository(e.target.value)}/></label>
      <button disabled={busy}>Save repository</button><button type="button" disabled={busy} onClick={()=>void manage(true)}>Disconnect GitHub</button>
    </form>}<p role="status">{notice}</p>
  </main>;
}
