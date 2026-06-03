import { useState, useCallback } from 'react';
import { supabase, table } from '../lib/supabaseClient';
import { processPayment, ProxyError } from '../lib/proxy';
import { generateReference } from '../lib/reference';
import { describeError } from '../lib/failureStates';
import type { Currency, PaymentMethod, Transaction, Wallet } from '../types';

export interface DepositArgs {
  userId: string;
  currency: Currency;
  amount: number;
  wallet?: Wallet | null;
  method?: PaymentMethod | null;
}

export interface DepositResult {
  ok: boolean;
  error?: string;
  code?: 'payment_processor_error' | 'offline';
  transaction?: Transaction;
}

export interface UseDepositApi {
  submitting: boolean;
  error: string | null;
  deposit: (args: DepositArgs) => Promise<DepositResult>;
  clearError: () => void;
}

/**
 * Initiates a deposit through the payment processor (via /proxy). Writes an
 * immutable transaction row and tracks pending -> cleared status. Wallet credit
 * happens once the processor reports the funds cleared; otherwise the deposit
 * stays in a processing state pending the provider webhook.
 */
export function useDeposit(): UseDepositApi {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deposit = useCallback(async (args: DepositArgs): Promise<DepositResult> => {
    setError(null);
    const { userId, currency, amount, wallet, method } = args;

    if (!userId) {
      const msg = 'You must be signed in to deposit.';
      setError(msg);
      return { ok: false, error: msg };
    }
    if (!amount || amount <= 0) {
      const msg = 'Enter an amount to fund.';
      setError(msg);
      return { ok: false, error: msg };
    }

    setSubmitting(true);
    const reference = generateReference('deposit');
    try {
      const processor = await processPayment({
        op: 'deposit',
        userId,
        currency,
        amount,
        reference,
        destination: method?.details ?? undefined,
      });

      const cleared = processor.status === 'cleared';
      const txnRow = {
        user_id: userId,
        wallet_id: wallet?.id ?? null,
        type: 'deposit' as const,
        status: cleared ? ('cleared' as const) : ('processing' as const),
        direction: 'in' as const,
        currency,
        amount,
        fee: 0,
        counterparty_user_id: null,
        rate_lock_id: null,
        applied_rate: null,
        from_currency: null,
        to_currency: null,
        from_amount: null,
        to_amount: null,
        provider: processor.provider,
        provider_reference: processor.providerReference,
        reference,
        raw: { method_id: method?.id ?? null },
      };

      const { data: txn, error: txnErr } = await supabase
        .from(table('transactions'))
        .insert(txnRow)
        .select()
        .single();
      if (txnErr) throw txnErr;

      if (cleared && wallet) {
        await supabase
          .from(table('wallets'))
          .update({
            balance: wallet.balance + amount,
            available_balance: wallet.available_balance + amount,
          })
          .eq('id', wallet.id);
      }

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
      setSubmitting(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { submitting, error, deposit, clearError };
}
