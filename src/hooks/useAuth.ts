import { useState, useEffect, useCallback, useRef } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from '../lib/supabaseClient';
import { describeError } from '../lib/failureStates';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
  error: string | null;
}

export interface SignUpArgs {
  email: string;
  password: string;
  fullName?: string;
}

export interface SignInArgs {
  email: string;
  password: string;
}

export interface AuthApi extends AuthState {
  signUp: (args: SignUpArgs) => Promise<{ ok: boolean; error?: string }>;
  signIn: (args: SignInArgs) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

/**
 * Supabase Auth session provider. Establishes the user identity that every
 * wallet/transaction query depends on. Falls back gracefully when credentials
 * aren't provisioned yet so the marketing screen still renders.
 */
export function useAuth(): AuthApi {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted.current) return;
        setSession(data.session);
        setUser(data.session?.user ?? null);
      })
      .catch((e) => {
        if (!mounted.current) return;
        setError(describeError(e));
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted.current) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted.current = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async ({ email, password, fullName }: SignUpArgs) => {
    setError(null);
    if (!supabaseConfigured) {
      const msg = 'Authentication is not available in this preview.';
      setError(msg);
      return { ok: false, error: msg };
    }
    try {
      const { error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: fullName ? { full_name: fullName.trim() } : undefined },
      });
      if (err) {
        setError(err.message);
        return { ok: false, error: err.message };
      }
      return { ok: true };
    } catch (e) {
      const msg = describeError(e);
      setError(msg);
      return { ok: false, error: msg };
    }
  }, []);

  const signIn = useCallback(async ({ email, password }: SignInArgs) => {
    setError(null);
    if (!supabaseConfigured) {
      const msg = 'Authentication is not available in this preview.';
      setError(msg);
      return { ok: false, error: msg };
    }
    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) {
        setError(err.message);
        return { ok: false, error: err.message };
      }
      return { ok: true };
    } catch (e) {
      const msg = describeError(e);
      setError(msg);
      return { ok: false, error: msg };
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    if (!supabaseConfigured) return;
    try {
      await supabase.auth.signOut();
    } catch (e) {
      setError(describeError(e));
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    user,
    session,
    loading,
    configured: supabaseConfigured,
    error,
    signUp,
    signIn,
    signOut,
    clearError,
  };
}
