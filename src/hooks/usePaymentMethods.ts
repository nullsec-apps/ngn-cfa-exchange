import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, table, realtimeTopic } from '../lib/supabaseClient';
import { maskAccount } from '../lib/money';
import { describeError } from '../lib/failureStates';
import type {
  Currency,
  PaymentMethod,
  PaymentMethodType,
} from '../types';

export interface AddMethodInput {
  userId: string;
  type: PaymentMethodType;
  currency: Currency;
  label?: string;
  accountName?: string;
  accountNumber?: string;
  provider?: string;
  isDefault?: boolean;
  details?: Record<string, unknown>;
}

export interface MethodResult {
  ok: boolean;
  error?: string;
  method?: PaymentMethod;
}

export interface UsePaymentMethodsApi {
  methods: PaymentMethod[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  addMethod: (input: AddMethodInput) => Promise<MethodResult>;
  removeMethod: (id: string) => Promise<{ ok: boolean; error?: string }>;
  setDefault: (id: string) => Promise<{ ok: boolean; error?: string }>;
  byCurrency: (currency: Currency) => PaymentMethod[];
  defaultFor: (currency: Currency) => PaymentMethod | null;
  refresh: () => Promise<void>;
  clearError: () => void;
}

/**
 * CRUD for funding & payout destinations (bank account / mobile money) in
 * app_{projectId}_payment_methods. Account numbers are masked before storage —
 * full numbers never touch the database. Streams updates via realtime.
 */
export function usePaymentMethods(userId: string | null): UsePaymentMethodsApi {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const topic = useRef(`pm_${realtimeTopic('payment_methods')}`);
  const mounted = useRef(true);

  const fetchMethods = useCallback(async () => {
    if (!userId) {
      setMethods([]);
      setLoading(false);
      return;
    }
    try {
      const { data, error: err } = await supabase
        .from(table('payment_methods'))
        .select('*')
        .eq('user_id', userId)
        .neq('status', 'disabled')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      if (err) throw err;
      if (mounted.current) setMethods((data as PaymentMethod[]) ?? []);
    } catch (e) {
      if (mounted.current) setError(describeError(e));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    fetchMethods();

    if (!userId) return;
    const channel = supabase
      .channel(topic.current)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table('payment_methods'),
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchMethods();
        }
      )
      .subscribe();

    return () => {
      mounted.current = false;
      supabase.removeChannel(channel);
    };
  }, [userId, fetchMethods]);

  const addMethod = useCallback(async (input: AddMethodInput): Promise<MethodResult> => {
    setError(null);
    if (!input.userId) {
      const msg = 'You must be signed in.';
      setError(msg);
      return { ok: false, error: msg };
    }
    if (!input.accountNumber || input.accountNumber.replace(/\s+/g, '').length < 4) {
      const msg = 'Enter a valid account number.';
      setError(msg);
      return { ok: false, error: msg };
    }
    setSaving(true);
    try {
      // If marking default, clear any existing defaults for that currency.
      if (input.isDefault) {
        await supabase
          .from(table('payment_methods'))
          .update({ is_default: false })
          .eq('user_id', input.userId)
          .eq('currency', input.currency);
      }

      const row = {
        user_id: input.userId,
        type: input.type,
        currency: input.currency,
        label: input.label ?? null,
        account_name: input.accountName ?? null,
        account_number_masked: maskAccount(input.accountNumber),
        provider: input.provider ?? null,
        details: input.details ?? null,
        is_default: Boolean(input.isDefault),
        status: 'active' as const,
      };

      const { data, error: err } = await supabase
        .from(table('payment_methods'))
        .insert(row)
        .select()
        .single();
      if (err) throw err;
      await fetchMethods();
      return { ok: true, method: data as PaymentMethod };
    } catch (e) {
      const msg = describeError(e);
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      setSaving(false);
    }
  }, [fetchMethods]);

  const removeMethod = useCallback(async (id: string) => {
    setError(null);
    try {
      const { error: err } = await supabase
        .from(table('payment_methods'))
        .update({ status: 'disabled' })
        .eq('id', id);
      if (err) throw err;
      await fetchMethods();
      return { ok: true };
    } catch (e) {
      const msg = describeError(e);
      setError(msg);
      return { ok: false, error: msg };
    }
  }, [fetchMethods]);

  const setDefault = useCallback(async (id: string) => {
    setError(null);
    const target = methods.find((m) => m.id === id);
    if (!target || !userId) return { ok: false, error: 'Method not found.' };
    try {
      await supabase
        .from(table('payment_methods'))
        .update({ is_default: false })
        .eq('user_id', userId)
        .eq('currency', target.currency);
      const { error: err } = await supabase
        .from(table('payment_methods'))
        .update({ is_default: true })
        .eq('id', id);
      if (err) throw err;
      await fetchMethods();
      return { ok: true };
    } catch (e) {
      const msg = describeError(e);
      setError(msg);
      return { ok: false, error: msg };
    }
  }, [methods, userId, fetchMethods]);

  const byCurrency = useCallback(
    (currency: Currency) => methods.filter((m) => m.currency === currency),
    [methods]
  );

  const defaultFor = useCallback(
    (currency: Currency) => {
      const list = methods.filter((m) => m.currency === currency);
      return list.find((m) => m.is_default) ?? list[0] ?? null;
    },
    [methods]
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    methods,
    loading,
    saving,
    error,
    addMethod,
    removeMethod,
    setDefault,
    byCurrency,
    defaultFor,
    refresh: fetchMethods,
    clearError,
  };
}
