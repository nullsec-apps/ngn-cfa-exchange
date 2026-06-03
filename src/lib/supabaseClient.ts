import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase client for auth, database queries, and realtime channels.
 * Credentials are injected by the NullSec platform at runtime; we fall back
 * to env vars for local development.
 */

function readEnv(key: string): string | undefined {
  // Vite-style env first
  const viteEnv = (import.meta as unknown as { env?: Record<string, string> }).env;
  if (viteEnv && viteEnv[key]) return viteEnv[key];
  return undefined;
}

interface NullSecSupabase {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

function resolveCredentials(): { url: string; anonKey: string } {
  const g = (typeof window !== 'undefined'
    ? (window as unknown as { __NULLSEC__?: NullSecSupabase & { supabase?: NullSecSupabase } })
        .__NULLSEC__
    : undefined) as (NullSecSupabase & { supabase?: NullSecSupabase }) | undefined;

  const url =
    g?.supabaseUrl ||
    g?.supabase?.supabaseUrl ||
    readEnv('VITE_SUPABASE_URL') ||
    '';
  const anonKey =
    g?.supabaseAnonKey ||
    g?.supabase?.supabaseAnonKey ||
    readEnv('VITE_SUPABASE_ANON_KEY') ||
    '';

  return { url, anonKey };
}

const { url, anonKey } = resolveCredentials();

export const supabaseConfigured = Boolean(url && anonKey);

/**
 * A single shared client. When credentials are absent (e.g. preview before
 * provisioning), we still create a client against a harmless placeholder so the
 * app can render its marketing/empty states without throwing at import time.
 */
export const supabase: SupabaseClient = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'public-anon-placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export function projectId(): string {
  return (typeof window !== 'undefined' && window.__NULLSEC__?.projectId) || 'local';
}

/** Build a project-scoped table name: app_{projectId}_{name}. */
export function table(name: string): string {
  return `app_${projectId()}_${name}`;
}

/** Generate a unique realtime channel topic for a table (per mount). */
export function realtimeTopic(name: string): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${name}_${rand}`;
}
