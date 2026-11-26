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
  const { user, loading: authLoading, configured: authConfigured, signInWithGoogle, signInWithGithub } = useAuth();

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
              <>
                <button
                  className="intro-primary intro-google"
                  disabled={authLoading || busy}
                  onClick={async () => { try { await signInWithGoogle(); } catch (err) { setError(err instanceof Error ? err.message : "Google sign-in failed."); } }}
                >
                  <svg className="intro-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s0-1.43.36-2.09l3.43 1.97c-.2.45-.41.88-.65 1.27-.48.77-1.24 1.24-2.1 1.24-.98 0-1.75-.82-1.75-1.82 0-1.17.93-2.15 2.05-2.15.49 0 .88.2 1.21.36v2.37H5.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.57 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.01l3.57 2.77c.87-2.6 3.28-4.47 6.25-4.47z"/></svg>
                  {authLoading ? "Signing in…" : "Sign in with Google"}
                </button>
                <button
                  className="intro-primary intro-github"
                  disabled={authLoading || busy}
                  onClick={async () => { try { await signInWithGithub(); } catch (err) { setError(err instanceof Error ? err.message : "GitHub sign-in failed."); } }}
                >
                  <svg className="intro-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C-0.625-0.7-0.43-0.05-0.43-0.05.43 0.108.43 0.108.43 0.108.727 0 1.113 0.108 1.113 0.108 1.195 0.108 1.195 0.108 1.195 0.108 0.43 0.108 1.005 0.108 1.005 0.108 1.005 0.108 0.638 1.195 0.416 1.58 0.416 1.58c1.113 0.108 2.226 0.108 2.226 0.108 0.825 0.108 1.23-0.416 1.23-0.416-0.285-0.416-0.638-1.04-0.638-1.04-1.025-0.416-2.405-0.416-2.405-0.416-1.972 0-2.405 1.61-2.405 1.61-0.416 0.416-0.416 1.04-0.416 1.61 0 0 1.005-0.108 2.05 0.638 1.432-0.285 2.775-0.416 4.135-0.416 1.36 0 2.703 0.108 4.135 0.416 1.045-0.747 2.05-0.638 2.05-0.638 0 0-0.416-1.195-0.416-1.61 0 0-0.285-1.195-0.638-1.61 0 0-0.638-1.61-2.405-1.61s-1.38 0-2.405 0.416c-0.416 0-0.416 0-0.416 0-0.416 0.638-0.638 1.275-0.638 1.61 0 0-0.416 1.195-0.416 1.61 0 0 0.405 0.638 1.23 0.416 0 0 1.113 0 2.226 0 0 0 0.47 0 1.195 0 0 0 0 0 0 0 0 0 0 0 0"/></svg>
                  {authLoading ? "Signing in…" : "Sign in with GitHub"}
                </button>
              </>
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
