import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, table, realtimeTopic } from '../lib/supabaseClient';
import { describeError } from '../lib/failureStates';
import type { Profile, KycStatus, AccountStatus } from '../types';

export interface ProfileUpdateInput {
  full_name?: string | null;
  phone?: string | null;
  country?: string | null;
  kyc_status?: KycStatus;
  account_status?: AccountStatus;
}

export interface UseProfileApi {
  profile: Profile | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  update: (input: ProfileUpdateInput) => Promise<{ ok: boolean; error?: string }>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

/**
 * Loads and updates the authenticated user's profile, account status, and KYC
 * status from app_{projectId}_profiles. Auto-provisions a profile row on first
 * load so wallet/transaction gating works immediately. Streams updates via
 * realtime so the KYC badge reflects provider decisions live.
 */
export function useProfile(
  userId: string | null,
  email?: string | null,
  fullName?: string | null
): UseProfileApi {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const topic = useRef(`profile_${realtimeTopic('profiles')}`);
  const mounted = useRef(true);

  const ensureProfile = useCallback(async (): Promise<Profile | null> => {
    if (!userId) return null;
    const { data, error: err } = await supabase
      .from(table('profiles'))
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (err) throw err;
    if (data) return data as Profile;

    // Provision a fresh profile row for the user.
    const row = {
      user_id: userId,
      full_name: fullName ?? null,
      email: email ?? null,
      phone: null,
      country: null,
      kyc_status: 'unverified' as KycStatus,
      account_status: 'active' as AccountStatus,
    };
    const { data: created, error: insErr } = await supabase
      .from(table('profiles'))
      .insert(row)
      .select()
      .single();
    if (insErr) throw insErr;
    return created as Profile;
  }, [userId, email, fullName]);

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    try {
      const p = await ensureProfile();
      if (mounted.current) setProfile(p);
    } catch (e) {
      if (mounted.current) setError(describeError(e));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [userId, ensureProfile]);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    fetchProfile();

    if (!userId) return;
    const channel = supabase
      .channel(topic.current)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table('profiles'),
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const next = payload.new as Profile | undefined;
          if (next && mounted.current) setProfile(next);
          else fetchProfile();
        }
      )
      .subscribe();

    return () => {
      mounted.current = false;
      supabase.removeChannel(channel);
    };
  }, [userId, fetchProfile]);

  const update = useCallback(
    async (input: ProfileUpdateInput): Promise<{ ok: boolean; error?: string }> => {
      setError(null);
      if (!userId) {
        const msg = 'You must be signed in.';
        setError(msg);
        return { ok: false, error: msg };
      }
      setSaving(true);
      try {
        const { data, error: err } = await supabase
          .from(table('profiles'))
          .update(input)
          .eq('user_id', userId)
          .select()
          .single();
        if (err) throw err;
        if (mounted.current) setProfile(data as Profile);
        return { ok: true };
      } catch (e) {
        const msg = describeError(e);
        setError(msg);
        return { ok: false, error: msg };
      } finally {
        setSaving(false);
      }
    },
    [userId]
  );

  const clearError = useCallback(() => setError(null), []);

  return { profile, loading, saving, error, update, refresh: fetchProfile, clearError };
}
