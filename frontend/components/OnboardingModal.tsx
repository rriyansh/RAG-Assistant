"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { testProviderKey, saveProviderKey, updateConfig } from "../lib/api";
import type { UserProfile } from "../lib/types";
import { DEFAULT_RAG_ASSISTANT_LOGO, detectProviderFromKeyString } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";

interface Props {
  isOpen: boolean;
  profile: UserProfile;
  onUpdateProfile: (patch: Partial<UserProfile>) => void;
  onComplete: () => void;
}

export function OnboardingModal({ isOpen, profile, onUpdateProfile, onComplete }: Props) {
  const [page, setPage] = useState(0);
  const pointer = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [angle, setAngle] = useState(0);
  const [key, setKey] = useState("");
  const [provider, setProvider] = useState("nvidia");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { user, loading: authLoading, configured: authConfigured, signInWithGoogle } = useAuth();

  useEffect(() => {
    if (!isOpen || page !== 0) return;
    const timer = window.setTimeout(() => setPage(1), 1150);
    return () => window.clearTimeout(timer);
  }, [isOpen, page]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!key.trim() || busy) return;
    setBusy(true);
    setError("");
    const mode = profile.defaultMode ?? "chat";
    const payload = { provider, api_key: key.trim() };
    try {
      const result = await testProviderKey(payload);
      if (!result.valid || !result.model) throw new Error(result.error || "Could not verify this key.");
      await saveProviderKey({ ...payload, model: result.model }, mode);
      await updateConfig({ provider, model: result.model, base_url: "", hosted: false }, mode);
      setKey("");
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this key.");
    } finally {
      setBusy(false);
    }
  }

  if (!isOpen) return null;
  return <div className="reso-intro" role="dialog" aria-modal="true" aria-label="Reso Agent setup">
    <div key={page} className={`reso-intro-sheet ${page === 0 ? "reso-splash" : ""}`}>
      {page > 1 && <button className="intro-back" disabled={busy} type="button" aria-label="Back" onClick={() => setPage(page - 1)}><ArrowLeft size={20} /></button>}
      <div className="intro-brand"><img src={DEFAULT_RAG_ASSISTANT_LOGO} alt="" />Reso Agent</div>
      {page === 1 && <>
        <div className="intro-stage">
          <div className="intro-dino-frame" style={{transform: `rotateY(${angle}deg)`}}>
          <button className="intro-dino" data-dragging={dragging || undefined} type="button" aria-label="Rotate Dino. Drag, or use arrow keys." onClick={e => { if (e.detail === 0) setAngle(a => a + 45); }}
            onKeyDown={e => { if (["ArrowLeft", "ArrowRight"].includes(e.key)) { e.preventDefault(); setAngle(a => a + (e.key === "ArrowLeft" ? -30 : 30)); } }}
            onPointerDown={e => { setDragging(true); pointer.current = e.clientX; e.currentTarget.setPointerCapture(e.pointerId); }}
            onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) { const delta = e.clientX - pointer.current; pointer.current = e.clientX; setAngle(a => a + delta * 1.5); } }}
            onLostPointerCapture={() => setDragging(false)}>
            {[-10,-6,-2,2,6,10].map(depth => <img key={depth} draggable={false} src={DEFAULT_RAG_ASSISTANT_LOGO} alt="" style={{transform:`translateZ(${depth}px)`}} />)}
          </button>
          </div>
        </div>
        <h1>Meet Reso Agent</h1>
        <p>Chat, research, and work with your connected tools in one workspace.</p>
        {user && (
          <>
            <p className="intro-signed-in">Signed in with Google as <strong>{user.email}</strong>. Your session persists across devices.</p>
            <button className="intro-primary" disabled={authLoading} onClick={() => setPage(2)}>Continue</button>
          </>
        )}
        {!user && (
          <div className="intro-actions">
            <button className="intro-primary" disabled={authLoading} onClick={() => setPage(2)}>Get Started</button>
            {authConfigured && (
              <button
                className="intro-primary intro-google"
                disabled={authLoading || busy}
                onClick={async () => { try { await signInWithGoogle(); } catch (err) { setError(err instanceof Error ? err.message : "Google sign-in failed."); } }}
              >
                {authLoading ? "Signing in…" : "Sign in with Google"}
              </button>
            )}
            {!authConfigured && (
              <p className="intro-note">Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable Google login.</p>
            )}
          </div>
        )}
        <a href="/privacy" target="_blank" rel="noreferrer">Read the Privacy Policy</a>
      </>}
      {page === 2 && <form onSubmit={e => { e.preventDefault(); if (profile.name.trim()) setPage(3); }}>
        <h1>What should we call you?</h1>
        <label>Your name<input required maxLength={60} autoComplete="given-name" value={profile.name} onChange={e => onUpdateProfile({name:e.target.value})} /></label>
        <button className="intro-primary" disabled={!profile.name.trim()}>Continue</button>
      </form>}
      {page === 3 && <div className="intro-mode">
        <h1>Choose how to start</h1>
        <p>You can switch modes any time from the composer.</p>
        <fieldset>
          <legend className="sr-only">Default workspace mode</legend>
          {(["chat", "agent"] as const).map(mode => <label key={mode} className="intro-mode-option">
            <input type="radio" name="default-mode" checked={(profile.defaultMode ?? "chat") === mode} onChange={() => onUpdateProfile({defaultMode:mode})} />
            <span><strong>{mode === "chat" ? "Chat" : "Agent"}</strong>
            <small>{mode === "chat" ? "Ask questions, write and brainstorm." : "Work with connected tools and sources."}</small></span>
          </label>)}
        </fieldset>
        <button className="intro-primary" onClick={() => setPage(4)}>Continue</button>
      </div>}
      {page === 4 && <form onSubmit={save}>
        <h1>Make Reso yours</h1>
        <label>Agent name<input maxLength={60} value={profile.assistantName} onChange={e => onUpdateProfile({assistantName:e.target.value})} /></label>
        <label>Provider<select value={provider} onChange={e => setProvider(e.target.value)}>
          {Object.entries({nvidia:"NVIDIA",openai:"OpenAI",grok:"xAI",groq:"Groq",gemini:"Gemini",deepseek:"DeepSeek",qwen:"Qwen",openrouter:"OpenRouter",mistral:"Mistral"}).map(([id,name]) => <option key={id} value={id}>{name}</option>)}
        </select></label>
        <label>API key<input type="password" autoComplete="off" spellCheck={false} value={key} onChange={e => { setKey(e.target.value); const detected = detectProviderFromKeyString(e.target.value); if (detected && !["ollama","anthropic"].includes(detected)) setProvider(detected); }} /></label>
        {error && <p role="alert">{error}</p>}
        <button className="intro-primary" disabled={busy || !key.trim()}>{busy ? "Verifying…" : "Save and continue"}</button>
        <button type="button" disabled={busy} className="intro-skip" onClick={onComplete}>Skip API for now</button>
      </form>}
    </div>
  </div>;
}
