"use client";

import { useEffect } from "react";
import { captureInstallPrompt } from "./InstallApp";

export function RegisterApp() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/reso-sw.js").catch(() => {});
    }
    return captureInstallPrompt();
  }, []);
  return null;
}
