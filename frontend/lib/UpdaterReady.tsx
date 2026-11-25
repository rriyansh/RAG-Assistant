"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { CapacitorUpdater } from "@capgo/capacitor-updater";

export function UpdaterReady() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      void CapacitorUpdater.notifyAppReady().catch(() => undefined);
    }
  }, []);
  return null;
}
