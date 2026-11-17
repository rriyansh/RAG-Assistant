"use client";

import { useCallback, useEffect, useState } from "react";
import type { KeyListResponse, KeySetPayload, KeyTestResponse } from "@/lib/types";
import { fetchKeys, testKey, saveKey, deleteKey } from "@/lib/api";

interface UseKeysResult {
  keys: KeyListResponse["keys"];
  activeProvider: string;
  loading: boolean;
  refresh: () => Promise<void>;
  test: (p: KeySetPayload) => Promise<KeyTestResponse>;
  save: (p: KeySetPayload) => Promise<void>;
  remove: (provider: string) => Promise<void>;
}

export function useKeys(): UseKeysResult {
  const [keys, setKeys] = useState<KeyListResponse["keys"]>({});
  const [activeProvider, setActiveProvider] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await fetchKeys();
      setKeys(data.keys ?? {});
      setActiveProvider(data.active_provider ?? "");
    } catch {
      setKeys({});
      setActiveProvider("");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const test = useCallback((p: KeySetPayload) => testKey(p), []);

  const save = useCallback(
    async (p: KeySetPayload): Promise<void> => {
      await saveKey(p);
      await refresh();
    },
    [refresh]
  );

  const remove = useCallback(
    async (provider: string): Promise<void> => {
      await deleteKey(provider);
      await refresh();
    },
    [refresh]
  );

  return { keys, activeProvider, loading, refresh, test, save, remove };
}
