import { useState, useCallback } from 'react';
import { supabase, table } from '../lib/supabaseClient';
import { processPayment, ProxyError } from '../lib/proxy';
import { generateReference } from '../lib/reference';
import { computeFee } from '../lib/money';
import { describeError } from '../lib/failureStates';
import type { Currency, PaymentMethod, Transaction, Wallet } from '../types';

export interface WithdrawArgs {
  userId: string;
  wallet: Wallet;
  amount: number;
  method: PaymentMethod;
}

export interface WithdrawPreview {
  amount: number;
  fee: number;
  total: number;
  currency: Currency;
  sufficient: boolean;
}

export interface WithdrawResult {
  ok: boolean;
  transaction?: Transaction;
  error?: string;
  code?: 'insufficient_funds' | 'payment_processor_error';
}

export interface UseWithdrawApi {
  withdrawing: boolean;
  error: string | null;
  preview: (wallet: Wallet, amount: number) => WithdrawPreview;
  withdraw: (args: WithdrawArgs) => Promise<WithdrawResult>;
  clearError: () => void;
}

export function useWithdraw(): UseWithdrawApi {
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useCallback((wallet: Wallet, amount: number): WithdrawPreview => {
    const currency = wallet.currency;
    const safe = Number.isFinite(amount) && amount > 0 ? amount : 0;
    const fee = computeFee(safe, currency);
    const total = safe + fee;
    return {
      amount: safe,
      fee,
      total,
      currency,
      sufficient: safe > 0 && total <= (wallet.available_balance ?? 0),
    };
  }, []);

  const withdraw = useCallback(async (args: WithdrawArgs): Promise<WithdrawResult> => {
    setError(null);
    const { userId, wallet, amount, method } = args;
    if (!userId) {
      const msg = 'You must be signed in to withdraw.';
      setError(msg);
      return { ok: false, error: msg };
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      const msg = 'Enter an amount to withdraw.';
      setError(msg);
      return { ok: false, error: msg };
    }
    const p = preview(wallet, amount);
    if (!p.sufficient) {
      const msg = 'Your available balance is too low for this amount including fees.';
      setError(msg);
      return { ok: false, error: msg, code: 'insufficient_funds' };
    }

    setWithdrawing(true);
    const reference = generateReference('withdrawal');
    try {
      const processor = await processPayment({
        op: 'withdrawal',
        userId,
        currency: wallet.currency,
        amount: p.amount,
        reference,
        destination: {
          method_id: method.id,
          type: method.type,
          account: method.account_number_masked,
          provider: method.provider,
        },
      });

      const status = processor.status === 'cleared' ? 'completed' : 'processing';

      const txnRow = {
        user_id: userId,
        wallet_id: wallet.id,
        type: 'withdrawal' as const,
        status,
        direction: 'out' as const,
        currency: wallet.currency,
        amount: p.amount,
        fee: p.fee,
        provider: processor.provider,
        provider_reference: processor.providerReference,
        reference,
        raw: processor.raw ?? null,
      };

      const { data: txn, error: txnErr } = await supabase
        .from(table('transactions'))
        .insert(txnRow)
        .select()
        .single();
      if (txnErr) throw txnErr;

      const newBalance = Math.max((wallet.balance ?? 0) - p.total, 0);
      const newAvailable = Math.max((wallet.available_balance ?? 0) - p.total, 0);
      const { error: wErr } = await supabase
        .from(table('wallets'))
        .update({ balance: newBalance, available_balance: newAvailable })
        .eq('id', wallet.id);
      if (wErr) throw wErr;

      return { ok: true, transaction: txn as Transaction };
    } catch (e) {
      if (e instanceof ProxyError && e.status === 503) {
        const msg = 'The payment provider is temporarily unavailable. No funds were moved.';
        setError(msg);
        return { ok: false, error: msg, code: 'payment_processor_error' };
      }
      const msg = describeError(e);
      setError(msg);
      return { ok: false, error: msg, code: 'payment_processor_error' };
    } finally {
      setWithdrawing(false);
    }
  }, [preview]);

  const clearError = useCallback(() => setError(null), []);

  return { withdrawing, error, preview, withdraw, clearError };
}
