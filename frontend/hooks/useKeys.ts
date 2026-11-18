"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyListResponse, KeySetPayload, KeyTestResponse } from "@/lib/types";
import { fetchKeys, testKey, saveKey, deleteKey } from "@/lib/api";

const KEYS_EVENT = "rag:keys";

interface UseKeysResult {
  keys: KeyListResponse["keys"];
  activeProvider: string;
  hasConfiguredKey: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  test: (p: KeySetPayload) => Promise<KeyTestResponse>;
  save: (p: KeySetPayload) => Promise<void>;
  remove: (provider: string) => Promise<void>;
}

function normalizePayload(p: KeySetPayload): KeySetPayload {
  return {
    provider: p.provider.trim(),
    api_key: p.api_key.trim(),
    model: p.model?.trim() ?? "",
    base_url: p.base_url?.trim() ?? "",
  };
}

function notifyKeysChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(KEYS_EVENT));
}

export function useKeys(): UseKeysResult {
  const [keys, setKeys] = useState<KeyListResponse["keys"]>({});
  const [activeProvider, setActiveProvider] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    const reqId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const data = await fetchKeys();
      if (!mountedRef.current || requestIdRef.current !== reqId) return;

      setKeys(data.keys ?? {});
      setActiveProvider(data.active_provider ?? "");
    } catch (err) {
      if (!mountedRef.current || requestIdRef.current !== reqId) return;

      setKeys({});
      setActiveProvider("");
      setError(err instanceof Error ? err.message : "Failed to load API keys");
    } finally {
      if (mountedRef.current && requestIdRef.current === reqId) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();

    const onKeysSync = (): void => {
      void refresh();
    };
    window.addEventListener(KEYS_EVENT, onKeysSync);
    return () => {
      window.removeEventListener(KEYS_EVENT, onKeysSync);
    };
  }, [refresh]);

  const test = useCallback(
    (p: KeySetPayload): Promise<KeyTestResponse> => testKey(normalizePayload(p)),
    []
  );

  const save = useCallback(
    async (p: KeySetPayload): Promise<void> => {
      await saveKey(normalizePayload(p));
      await refresh();
      notifyKeysChanged();
    },
    [refresh]
  );

  const remove = useCallback(
    async (provider: string): Promise<void> => {
      const trimmed = provider.trim();
      if (!trimmed) return;
      await deleteKey(trimmed);
      await refresh();
      notifyKeysChanged();
    },
    [refresh]
  );

  const hasConfiguredKey = useMemo(
    () => Object.values(keys).some((entry) => Boolean(entry?.configured)),
    [keys]
  );

  return {
    keys,
    activeProvider,
    hasConfiguredKey,
    loading,
    error,
    refresh,
    test,
    save,
    remove,
  };
}
