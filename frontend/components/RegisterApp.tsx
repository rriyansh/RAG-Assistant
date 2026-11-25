"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { captureInstallPrompt } from "./InstallApp";

export function RegisterApp() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform() && process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/reso-sw.js").catch(() => {});
    }
    return captureInstallPrompt();
  }, []);
  return null;
}
