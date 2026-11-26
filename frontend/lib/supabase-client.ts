"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

let browserClient: SupabaseClient | null = null;

export function isAuthConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getSupabaseClient(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  if (!isAuthConfigured()) return null;
  if (!browserClient) {
    browserClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
  }
  return browserClient;
}

export type AuthUser = {
  id: string;
  email: string | null;
  user_metadata?: Record<string, unknown> | null;
};
