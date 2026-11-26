"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient, isAuthConfigured } from "@/lib/supabase-client";

export default function AuthCallback() {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [detail, setDetail] = useState<string>("");
  useEffect(() => {
    if (!isAuthConfigured()) {
      setStatus("error");
      setDetail("Google login is not configured on this deployment.");
      return;
    }
    const client = getSupabaseClient();
    if (!client) {
      setStatus("error");
      setDetail("Supabase client unavailable.");
      return;
    }
    const search = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const code = search.get("code");
    const error = search.get("error");
    if (error) {
      setStatus("error");
      setDetail(search.get("error_description") || "OAuth error.");
      return;
    }
    if (!code) {
      setStatus("error");
      setDetail("No authorization code received.");
      return;
    }
    client.auth.exchangeCodeForSession(code).then(({ data, error: err }) => {
      if (err || !data.session) {
        setStatus("error");
        setDetail(err?.message || "Could not complete sign-in.");
        return;
      }
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("code");
        url.searchParams.delete("error");
        url.searchParams.delete("error_description");
        url.searchParams.delete("state");
        url.searchParams.delete("auth_user_id");
        url.searchParams.delete("code_verifier");
        window.history.replaceState(window.history.state, "", url.toString());
      } catch {}
      setStatus("ok");
      setTimeout(() => { window.location.replace("/"); }, 400);
    });
  }, []);
  if (status === "loading") return <p>Completing sign-in…</p>;
  if (status === "ok") return <p>Signed in. Redirecting…</p>;
  return <p role="alert">Sign-in failed: {detail}</p>;
}
