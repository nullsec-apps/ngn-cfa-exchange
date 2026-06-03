import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, table } from '../lib/supabaseClient';
import { generateRef } from '../lib/reference';
import { computeConversion } from '../lib/money';
import { describeError } from '../lib/failureStates';
import type { Currency, RateLock } from '../types';

export interface CreateLockArgs {
  userId: string;
  fromCurrency: Currency;
  toCurrency: Currency;
  fromAmount: number;
  rate: number;
}

export interface CreateLockResult {
  ok: boolean;
  error?: string;
  lock?: RateLock;
}

export interface UseRateLockApi {
  lock: RateLock | null;
  remainingMs: number;
  remainingSeconds: number;
  progress: number; // 1 -> 0 as the lock depletes
  expired: boolean;
  active: boolean;
  creating: boolean;
  error: string | null;
  createLock: (args: CreateLockArgs) => Promise<CreateLockResult>;
  cancelLock: () => Promise<void>;
  clearLock: () => void;
  clearError: () => void;
}

export const LOCK_DURATION_MS = 30_000;

/**
 * Creates a 30-second rate-lock guarantee, runs the depleting countdown, and
 * watches expiry. On expiry the lock is marked expired so the conversion panel
 * can prompt a re-quote. The countdown drives the signature depleting progress
 * bar on the convert/transfer CTA.
 */
export function useRateLock(): UseRateLockApi {
  const [lock, setLock] = useState<RateLock | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const expiredHandled = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Countdown tick.
  useEffect(() => {
    if (!lock || lock.status !== 'active') return;
    expiredHandled.current = false;
    const expiresAt = new Date(lock.expires_at).getTime();

    const tick = () => {
      const left = Math.max(0, expiresAt - Date.now());
      if (mounted.current) setRemainingMs(left);
      if (left <= 0 && !expiredHandled.current) {
        expiredHandled.current = true;
        markExpired(lock.id);
      }
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lock?.id, lock?.status]);

  const markExpired = useCallback(async (lockId: string) => {
    setLock((prev) =>
      prev && prev.id === lockId ? { ...prev, status: 'expired' } : prev
    );
    try {
      await supabase
        .from(table('rate_locks'))
        .update({ status: 'expired' })
        .eq('id', lockId)
        .eq('status', 'active');
    } catch {
      /* best-effort */
    }
  }, []);

  const createLock = useCallback(async (args: CreateLockArgs): Promise<CreateLockResult> => {
    setError(null);
    const { userId, fromCurrency, toCurrency, fromAmount, rate } = args;
    if (!userId) {
      const msg = 'You must be signed in.';
      setError(msg);
      return { ok: false, error: msg };
    }
    if (!rate || rate <= 0) {
      const msg = 'Live rate unavailable. Try again in a moment.';
      setError(msg);
      return { ok: false, error: msg };
    }
    setCreating(true);
    try {
      const math = computeConversion(fromAmount, rate, fromCurrency, toCurrency);
      const expiresAt = new Date(Date.now() + LOCK_DURATION_MS).toISOString();
      const row = {
        user_id: userId,
        from_currency: fromCurrency,
        to_currency: toCurrency,
        locked_rate: rate,
        from_amount: math.fromAmount,
        to_amount: math.netToAmount,
        status: 'active' as const,
        expires_at: expiresAt,
      };
      const { data, error: err } = await supabase
        .from(table('rate_locks'))
        .insert(row)
        .select()
        .single();
      if (err) throw err;
      const created = data as RateLock;
      if (mounted.current) {
        setLock(created);
        setRemainingMs(LOCK_DURATION_MS);
      }
      // Reference for traceability (not persisted on lock, used by callers).
      void generateRef('LCK');
      return { ok: true, lock: created };
    } catch (e) {
      const msg = describeError(e);
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      setCreating(false);
    }
  }, []);

  const cancelLock = useCallback(async () => {
    if (!lock) return;
    const id = lock.id;
    setLock((prev) => (prev ? { ...prev, status: 'cancelled' } : prev));
    try {
      await supabase
        .from(table('rate_locks'))
        .update({ status: 'cancelled' })
        .eq('id', id)
        .eq('status', 'active');
    } catch {
      /* best-effort */
    }
    if (mounted.current) setLock(null);
  }, [lock]);

  const clearLock = useCallback(() => {
    setLock(null);
    setRemainingMs(0);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const active = lock?.status === 'active' && remainingMs > 0;
  const expired =
    (lock?.status === 'expired') || (lock?.status === 'active' && remainingMs <= 0);
  const progress = Math.max(0, Math.min(1, remainingMs / LOCK_DURATION_MS));
  const remainingSeconds = Math.ceil(remainingMs / 1000);

  return {
    lock,
    remainingMs,
    remainingSeconds,
    progress,
    expired,
    active: Boolean(active),
    creating,
    error,
    createLock,
    cancelLock,
    clearLock,
    clearError,
  };
}
