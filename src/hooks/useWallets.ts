import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, table, realtimeTopic } from '../lib/supabaseClient';
import { describeError } from '../lib/failureStates';
import type { Currency, Wallet } from '../types';

export interface UseWalletsApi {
  wallets: Wallet[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  ensureWallets: () => Promise<void>;
  walletFor: (currency: Currency) => Wallet | undefined;
  totalLocked: number;
  clearError: () => void;
}

const CURRENCIES: Currency[] = ['NGN', 'XOF'];

export function useWallets(userId: string | null): UseWalletsApi {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const topic = useRef(`wallets_${realtimeTopic('wallets')}`);
  const mounted = useRef(true);

  const fetchWallets = useCallback(async () => {
    if (!userId) {
      setWallets([]);
      setLoading(false);
      return;
    }
    try {
      const { data, error: err } = await supabase
        .from(table('wallets'))
        .select('*')
        .eq('user_id', userId)
        .order('currency', { ascending: true });
      if (err) throw err;
      if (mounted.current) {
        setWallets((data as Wallet[]) ?? []);
        setError(null);
      }
    } catch (e) {
      if (mounted.current) setError(describeError(e));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [userId]);

  const ensureWallets = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error: err } = await supabase
        .from(table('wallets'))
        .select('currency')
        .eq('user_id', userId);
      if (err) throw err;
      const existing = new Set(((data as { currency: Currency }[]) ?? []).map((w) => w.currency));
      const missing = CURRENCIES.filter((c) => !existing.has(c));
      if (missing.length > 0) {
        const rows = missing.map((currency) => ({
          user_id: userId,
          currency,
          balance: 0,
          available_balance: 0,
          locked_balance: 0,
          status: 'active' as const,
        }));
        const { error: insErr } = await supabase.from(table('wallets')).insert(rows);
        if (insErr) throw insErr;
      }
      await fetchWallets();
    } catch (e) {
      if (mounted.current) setError(describeError(e));
    }
  }, [userId, fetchWallets]);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    fetchWallets();
    return () => {
      mounted.current = false;
    };
  }, [fetchWallets]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(topic.current)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: table('wallets'), filter: `user_id=eq.${userId}` },
        (payload) => {
          if (!mounted.current) return;
          if (payload.eventType === 'INSERT') {
            const next = payload.new as Wallet;
            setWallets((prev) =>
              prev.some((w) => w.id === next.id) ? prev : [...prev, next].sort((a, b) => a.currency.localeCompare(b.currency))
            );
          } else if (payload.eventType === 'UPDATE') {
            const next = payload.new as Wallet;
            setWallets((prev) => prev.map((w) => (w.id === next.id ? next : w)));
          } else if (payload.eventType === 'DELETE') {
            const old = payload.old as Wallet;
            setWallets((prev) => prev.filter((w) => w.id !== old.id));
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const walletFor = useCallback(
    (currency: Currency) => wallets.find((w) => w.currency === currency),
    [wallets]
  );

  const totalLocked = wallets.reduce((sum, w) => sum + (w.locked_balance ?? 0), 0);

  const clearError = useCallback(() => setError(null), []);

  return {
    wallets,
    loading,
    error,
    refresh: fetchWallets,
    ensureWallets,
    walletFor,
    totalLocked,
    clearError,
  };
}
