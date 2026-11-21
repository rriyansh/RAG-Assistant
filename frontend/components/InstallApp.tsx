"use client";
import { useEffect, useState } from "react";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{outcome: string}> };

let availablePrompt: InstallPrompt | undefined;

export function captureInstallPrompt() {
  const ready = (event: Event) => {
    event.preventDefault();
    availablePrompt = event as InstallPrompt;
    window.dispatchEvent(new Event("reso-install-ready"));
  };
  window.addEventListener("beforeinstallprompt", ready);
  return () => window.removeEventListener("beforeinstallprompt", ready);
}

export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | undefined>(() => availablePrompt);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    if (matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    const ready = () => setPrompt(availablePrompt);
    const done = () => { setInstalled(true); availablePrompt = undefined; setPrompt(undefined); };
    window.addEventListener("reso-install-ready", ready);
    window.addEventListener("appinstalled", done);
    return () => {
      window.removeEventListener("reso-install-ready", ready);
      window.removeEventListener("appinstalled", done);
    };
  }, []);

  if (installed) return <p>Reso Agent is installed on this device.</p>;
  if (!prompt) return <p>On iPhone or iPad, open Share → Add to Home Screen. On other devices, look for Install app in your browser menu.</p>;
  return <button onClick={async () => {
    try { await prompt.prompt(); if ((await prompt.userChoice).outcome === "accepted") setInstalled(true); }
    finally { availablePrompt = undefined; setPrompt(undefined); }
  }}>Install Reso Agent</button>;
}
