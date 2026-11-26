"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient, isAuthConfigured, type AuthUser } from "../lib/supabase-client";
import { useProfile } from "./useProfile";

const AUTH_USER_KEY = "reso-supabase-user-v1";
const CONVERSATION_KEYS = ["reso-conversation-chat", "reso-conversation-agent"];

interface UseAuthResult {
  user: AuthUser | null;
  session: string | null;
  loading: boolean;
  configured: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuthResult {
  const { profile, update: updateProfile, reset: resetProfile, reopenOnboarding } = useProfile();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isAuthConfigured();

  const saveAuthUser = useCallback((u: AuthUser | null) => {
    setUser(u);
    try {
      if (u) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify({ id: u.id, email: u.email }));
        if (u.id && !profile.supabaseUserId) updateProfile({ supabaseUserId: u.id });
      } else {
        localStorage.removeItem(AUTH_USER_KEY);
      }
    } catch {}
  }, [profile.supabaseUserId, updateProfile]);

  const clearLocalConversationState = useCallback(() => {
    for (const key of CONVERSATION_KEYS) {
      try { localStorage.removeItem(key); } catch {}
    }
  }, []);

  useEffect(() => {
    if (!configured || typeof window === "undefined") {
      setLoading(false);
      return;
    }
    const client = getSupabaseClient();
    if (!client) {
      setLoading(false);
      return;
    }

    // Restore any existing session on load (works on web and Capacitor web view).
    client.auth.getSession().then(({ data }) => {
      const s = data.session;
      setSession(s ? s.access_token ?? null : null);
      if (s?.user) {
        saveAuthUser({ id: s.user.id, email: s.user.email ?? null, user_metadata: s.user.user_metadata });
      }
      setLoading(false);
    });

    const { data: subscription } = client.auth.onAuthStateChange((event, sess) => {
      setSession(sess ? sess.access_token ?? null : null);
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (sess?.user) saveAuthUser({ id: sess.user.id, email: sess.user.email ?? null, user_metadata: sess.user.user_metadata });
      } else if (event === "SIGNED_OUT") {
        saveAuthUser(null);
        clearLocalConversationState();
        resetProfile();
        void reopenOnboarding();
      }
    });

    return () => {
      subscription?.subscription?.unsubscribe?.();
    };
  }, [configured, clearLocalConversationState, resetProfile, reopenOnboarding, saveAuthUser]);

  const signInWithGoogle = useCallback(async (): Promise<void> => {
    if (!configured) throw new Error("Google login is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    const client = getSupabaseClient();
    if (!client) throw new Error("Supabase client unavailable.");
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) throw error;
  }, [configured]);

  const signOut = useCallback(async (): Promise<void> => {
    const client = getSupabaseClient();
    if (client) {
      try { await client.auth.signOut(); } catch {}
    }
    saveAuthUser(null);
    setSession(null);
    clearLocalConversationState();
    resetProfile();
    void reopenOnboarding();
  }, [clearLocalConversationState, resetProfile, reopenOnboarding, saveAuthUser]);

  return { user, session, loading, configured, signInWithGoogle, signOut };
}

export default useAuth;
