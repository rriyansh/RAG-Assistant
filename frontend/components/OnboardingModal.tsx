"use client";

import { useState } from "react";
import { Check, ImagePlus } from "lucide-react";
import { readFileAsDataUrl } from "../hooks/useProfile";
import { FONT_OPTIONS } from "../lib/fonts";
import type { UserProfile } from "../lib/types";
import { CODES_ICON_SVG_PATH, DEFAULT_RAG_ASSISTANT_LOGO, INBUILT_ASSISTANT_LOGOS, INBUILT_USER_PFPS } from "../lib/utils";

export interface OnboardingModalProps {
  isOpen: boolean;
  profile: UserProfile;
  onUpdateProfile: (patch: Partial<UserProfile>) => void;
  onUploadUserAvatar: (file: File) => Promise<void>;
  onComplete: () => void;
}

export function OnboardingModal({ isOpen, profile, onUpdateProfile, onUploadUserAvatar, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [originalLogo] = useState(profile.assistantLogo ?? DEFAULT_RAG_ASSISTANT_LOGO);
  const [draftLogo, setDraftLogo] = useState(originalLogo);
  const [choice, setChoice] = useState("initial");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [headerIcon, setHeaderIcon] = useState(CODES_ICON_SVG_PATH);
  if (!isOpen) return null;

  function selectLogo(id: string, value: string) {
    setChoice(id);
    setDraftLogo(value);
    setError("");
  }

  async function upload(file: File) {
    setBusy(true);
    setError("");
    try {
      if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
      if (step === 1) await onUploadUserAvatar(file);
      else selectLogo("upload", await readFileAsDataUrl(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load the image.");
    } finally {
      setBusy(false);
    }
  }

  const options = step === 1 ? INBUILT_USER_PFPS : INBUILT_ASSISTANT_LOGOS;
  const selectedName = choice === "initial" ? (originalLogo ? "Current logo" : "No logo")
    : choice === "existing" ? (originalLogo ? "Existing logo selected" : "Existing setting: no logo")
    : choice === "blank" ? "No logo selected" : choice === "upload" ? "Uploaded logo selected"
    : INBUILT_ASSISTANT_LOGOS.find(item => item.id === choice)?.label;
  return <div className="setup-overlay">
    <section className="setup-sheet" role="dialog" aria-modal="true" aria-labelledby="setup-heading">
      <header className="setup-header">
        <div className="flex min-w-0 items-center gap-3">
          <img src={headerIcon} onError={() => setHeaderIcon("/icon.svg")} alt="" className="h-9 w-9 shrink-0 object-contain" />
          <strong>Workspace setup</strong>
        </div>
        <span className="text-xs text-white/65">Step {step} of 2</span>
      </header>
      <div key={step} className="setup-body">
        <h1 id="setup-heading">{step === 1 ? "Your profile" : "Name your assistant"}</h1>
        <p className="mb-5 text-sm text-white/65">{step === 1 ? "Choose how you appear in your workspace." : "Choose the identity shown in the conversation."}</p>
        <label className="setup-label">{step === 1 ? "Name" : "Assistant name"}
          <input value={step === 1 ? profile.name : profile.assistantName} autoComplete={step === 1 ? "given-name" : "off"}
            onChange={e => onUpdateProfile(step === 1 ? {name: e.target.value} : {assistantName: e.target.value})} />
        </label>
        <fieldset disabled={busy} className="mt-5 min-w-0">
          <legend className="setup-label">{step === 1 ? "Profile picture" : "Assistant logo"}</legend>
          <div className="setup-options">
            {options.map(item => {
              const active = step === 1 ? profile.avatarDataUrl === item.url : choice === item.id;
              return <button type="button" key={item.id} aria-pressed={active} onClick={() =>
                step === 1 ? onUpdateProfile({avatarDataUrl: item.url}) : selectLogo(item.id, item.url)}>
                <span className="setup-thumb"><img src={item.url} alt="" />{active && <Check aria-hidden size={14} />}</span>
                <span>{item.label}</span>
              </button>;
            })}
          </div>
          <label className="setup-upload"><ImagePlus size={16} /> Upload image
            <input type="file" accept="image/*" className="sr-only" onChange={e => {
              const file = e.currentTarget.files?.[0];
              e.currentTarget.value = "";
              if (file) void upload(file);
            }} />
          </label>
          {step === 1 && profile.avatarDataUrl && !INBUILT_USER_PFPS.some(item => item.url === profile.avatarDataUrl) &&
            <div className="setup-preview"><img src={profile.avatarDataUrl} alt="Uploaded profile picture" /><span>Uploaded picture selected</span></div>}
          {step === 2 && <>
            <div className="setup-actions">
              <button type="button" aria-pressed={choice === "existing"} onClick={() => selectLogo("existing", originalLogo)}>Keep existing logo</button>
              <button type="button" aria-pressed={choice === "blank"} onClick={() => selectLogo("blank", "")}>Leave blank</button>
            </div>
            <div role="status" className="setup-preview">
              {draftLogo && <img src={draftLogo} alt="Selected assistant logo" />}
              <div><strong>{profile.assistantName || "Reso Agent"}</strong><p>{selectedName}</p></div>
            </div>
          </>}
        </fieldset>
        {error && <p role="alert" className="mt-2 text-sm">{error}</p>}
        {step === 1 && <label className="setup-label mt-5">Interface font
          <select value={profile.font} onChange={e => {
            const font = FONT_OPTIONS.find(item => item.id === e.target.value);
            if (font) onUpdateProfile({font: font.id});
          }}>{FONT_OPTIONS.map(font => <option key={font.id} value={font.id}>{font.label}</option>)}</select>
        </label>}
      </div>
      <footer className="setup-footer">
        <button disabled={busy} onClick={onComplete}>{step === 1 ? "Skip" : "Skip this step"}</button>
        <div className="flex gap-2">
          {step === 2 && <button disabled={busy} onClick={() => setStep(1)}>Back</button>}
          <button className="setup-primary" disabled={busy} onClick={() => {
            if (step === 1) {setError(""); setStep(2); return;}
            onUpdateProfile({assistantLogo: draftLogo});
            onComplete();
          }}>{step === 1 ? "Next" : "Start Workspace"}</button>
        </div>
      </footer>
    </section>
  </div>;
}
export default OnboardingModal;
