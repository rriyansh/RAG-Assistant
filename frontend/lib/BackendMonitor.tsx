"use client";

import { useEffect } from "react";
import { subscribeBackend } from "./api-client";

export function BackendMonitor() {
  useEffect(() => subscribeBackend(() => undefined), []);
  return null;
}
