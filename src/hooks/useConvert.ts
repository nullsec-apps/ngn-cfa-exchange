import { useState, useCallback, useMemo } from 'react';
import { supabase, table } from '../lib/supabaseClient';
import { computeConversion, type ConversionMath } from '../lib/money';
import { generateReference } from '../lib/reference';
import { describeError } from '../lib/failureStates';
import type {
  Currency,
  ConversionPreview,
  Transaction,
  Wallet,
  RateLock,
} from '../types';

export interface ConvertArgs {
  userId: string;
  fromCurrency: Currency;
  toCurrency: Currency;
  fromAmount: number;
  rate: number;
  rateLockId?: string | null;
  fromWallet?: Wallet | null;
  toWallet?: Wallet | null;
}

export interface ConvertResult {
  ok: boolean;
  error?: string;
  transaction?: Transaction;
}

export interface UseConvertApi {
  submitting: boolean;
  error: string | null;
  preview: (
    fromAmount: number,
    rate: number,
    fromCurrency: Currency,
    toCurrency: Currency
  ) => ConversionPreview;
  convert: (args: ConvertArgs) => Promise<ConvertResult>;
  clearError: () => void;
}

/**
 * Computes conversion previews (amount, fee, applied rate) and executes a
 * locked-rate conversion between the user's NGN and CFA wallets. The fee is
 * charged in the source currency; the remainder converts at the locked rate.
 * Wallet balances are adjusted atomically (best-effort) and an immutable
 * transaction record is written.
 */
export function useConvert(): UseConvertApi {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useCallback(
    (
      fromAmount: number,
      rate: number,
      fromCurrency: Currency,
      toCurrency: Currency
    ): ConversionPreview => {
      const math: ConversionMath = computeConversion(
        fromAmount,
        rate,
        fromCurrency,
        toCurrency
      );
      return {
        fromCurrency,
        toCurrency,
        fromAmount: math.fromAmount,
        toAmount: math.toAmount,
        rate: math.rate,
        fee: math.fee,
        feeCurrency: math.feeCurrency,
        netToAmount: math.netToAmount,
      };
    },
    []
  );

  const convert = useCallback(async (args: ConvertArgs): Promise<ConvertResult> => {
    setError(null);
    const {
      userId,
      fromCurrency,
      toCurrency,
      fromAmount,
      rate,
      rateLockId,
      fromWallet,
      toWallet,
    } = args;

    if (!userId) {
      const msg = 'You must be signed in to convert.';
      setError(msg);
      return { ok: false, error: msg };
    }
    if (!fromAmount || fromAmount <= 0) {
      const msg = 'Enter an amount to convert.';
      setError(msg);
      return { ok: false, error: msg };
    }
    if (fromCurrency === toCurrency) {
      const msg = 'Pick two different currencies.';
      setError(msg);
      return { ok: false, error: msg };
    }

    const math = computeConversion(fromAmount, rate, fromCurrency, toCurrency);

    if (fromWallet && fromWallet.available_balance < math.fromAmount) {
      const msg = 'Insufficient funds for this conversion including fees.';
      setError(msg);
      return { ok: false, error: msg };
    }

    setSubmitting(true);
    try {
      const reference = generateReference('conversion');
      const txnRow = {
        user_id: userId,
        wallet_id: fromWallet?.id ?? null,
        type: 'conversion' as const,
        status: rateLockId ? ('rate_locked' as const) : ('processing' as const),
        direction: null,
        currency: fromCurrency,
        amount: math.fromAmount,
        fee: math.fee,
        counterparty_user_id: null,
        rate_lock_id: rateLockId ?? null,
        applied_rate: rate,
        from_currency: fromCurrency,
        to_currency: toCurrency,
        from_amount: math.fromAmount,
        to_amount: math.netToAmount,
        provider: 'internal',
        provider_reference: null,
        reference,
        raw: { fee_currency: math.feeCurrency },
      };

      const { data: txn, error: txnErr } = await supabase
        .from(table('transactions'))
        .insert(txnRow)
        .select()
        .single();
      if (txnErr) throw txnErr;

      // Adjust source wallet (debit).
      if (fromWallet) {
        const newBalance = Math.max(fromWallet.balance - math.fromAmount, 0);
        const newAvailable = Math.max(
          fromWallet.available_balance - math.fromAmount,
          0
        );
        await supabase
          .from(table('wallets'))
          .update({ balance: newBalance, available_balance: newAvailable })
          .eq('id', fromWallet.id);
      }

      // Adjust destination wallet (credit net amount).
      if (toWallet) {
        const newBalance = toWallet.balance + math.netToAmount;
        const newAvailable = toWallet.available_balance + math.netToAmount;
        await supabase
          .from(table('wallets'))
          .update({ balance: newBalance, available_balance: newAvailable })
          .eq('id', toWallet.id);
      }

      // Mark conversion completed + rate lock used.
      const { data: completed } = await supabase
        .from(table('transactions'))
        .update({ status: 'completed' })
        .eq('id', (txn as Transaction).id)
        .select()
        .single();

      if (rateLockId) {
        await supabase
          .from(table('rate_locks'))
          .update({ status: 'used' as RateLock['status'] })
          .eq('id', rateLockId);
      }

      return {
        ok: true,
        transaction: (completed as Transaction) ?? (txn as Transaction),
      };
    } catch (e) {
      const msg = describeError(e);
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      setSubmitting(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return useMemo(
    () => ({ submitting, error, preview, convert, clearError }),
    [submitting, error, preview, convert, clearError]
  );
}
