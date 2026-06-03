import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase, table, realtimeTopic } from '../lib/supabaseClient';
import { describeError } from '../lib/failureStates';
import type { Transaction, TransactionType, TransactionStatus } from '../types';

export type TxnTypeFilter = TransactionType | 'all';

export interface UseTransactionsApi {
  transactions: Transaction[];
  filtered: Transaction[];
  loading: boolean;
  error: string | null;
  typeFilter: TxnTypeFilter;
  search: string;
  setTypeFilter: (f: TxnTypeFilter) => void;
  setSearch: (q: string) => void;
  byId: (id: string) => Transaction | null;
  isPending: (status: TransactionStatus) => boolean;
  refresh: () => Promise<void>;
  clearError: () => void;
}

const PAGE_LIMIT = 200;

const PENDING_STATUSES: TransactionStatus[] = [
  'initiated',
  'rate_locked',
  'processing',
];

/**
 * Realtime transaction ledger for the authenticated user with type filtering
 * and reference/counterparty search. Streams INSERT/UPDATE from
 * app_{projectId}_transactions so the history, status steppers, and detail
 * drawer update instantly as a transfer moves Initiated -> Rate locked ->
 * Cleared -> Delivered.
 */
export function useTransactions(userId: string | null): UseTransactionsApi {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TxnTypeFilter>('all');
  const [search, setSearch] = useState('');
  const topic = useRef(`txn_${realtimeTopic('transactions')}`);
  const mounted = useRef(true);

  const fetchTransactions = useCallback(async () => {
    if (!userId) {
      setTransactions([]);
      setLoading(false);
      return;
    }
    try {
      const { data, error: err } = await supabase
        .from(table('transactions'))
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(PAGE_LIMIT);
      if (err) throw err;
      if (mounted.current) setTransactions((data as Transaction[]) ?? []);
    } catch (e) {
      if (mounted.current) setError(describeError(e));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    fetchTransactions();

    if (!userId) return;
    const channel = supabase
      .channel(topic.current)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table('transactions'),
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (!mounted.current) return;
          const next = payload.new as Transaction | undefined;
          const old = payload.old as Transaction | undefined;
          setTransactions((prev) => {
            if (payload.eventType === 'INSERT' && next) {
              if (prev.some((t) => t.id === next.id)) return prev;
              return [next, ...prev].slice(0, PAGE_LIMIT);
            }
            if (payload.eventType === 'UPDATE' && next) {
              return prev.map((t) => (t.id === next.id ? next : t));
            }
            if (payload.eventType === 'DELETE' && old) {
              return prev.filter((t) => t.id !== old.id);
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      mounted.current = false;
      supabase.removeChannel(channel);
    };
  }, [userId, fetchTransactions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (!q) return true;
      const hay = [
        t.reference,
        t.provider_reference ?? '',
        t.type,
        t.status,
        t.currency,
        t.from_currency ?? '',
        t.to_currency ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [transactions, typeFilter, search]);

  const byId = useCallback(
    (id: string) => transactions.find((t) => t.id === id) ?? null,
    [transactions]
  );

  const isPending = useCallback(
    (status: TransactionStatus) => PENDING_STATUSES.includes(status),
    []
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    transactions,
    filtered,
    loading,
    error,
    typeFilter,
    search,
    setTypeFilter,
    setSearch,
    byId,
    isPending,
    refresh: fetchTransactions,
    clearError,
  };
}
