import { useState, useCallback } from 'react';
import { supabase, table } from '../lib/supabaseClient';
import { computeConversion } from '../lib/money';
import { generateReference } from '../lib/reference';
import { processPayment, ProxyError } from '../lib/proxy';
import { describeError } from '../lib/failureStates';
import type { Currency, Profile, Transaction, Wallet, RateLock } from '../types';

export interface RecipientLookupResult {
  found: boolean;
  profile?: Profile;
  error?: string;
}

export interface TransferArgs {
  userId: string;
  recipientUserId: string;
  fromCurrency: Currency;
  toCurrency: Currency;
  fromAmount: number;
  rate: number;
  rateLockId?: string | null;
  fromWallet?: Wallet | null;
}

export interface TransferResult {
  ok: boolean;
  error?: string;
  code?: 'insufficient_funds' | 'payment_processor_error' | 'recipient_not_found';
  transaction?: Transaction;
}

export interface UseTransferApi {
  submitting: boolean;
  looking: boolean;
  error: string | null;
  lookupRecipient: (query: string) => Promise<RecipientLookupResult>;
  transfer: (args: TransferArgs) => Promise<TransferResult>;
  clearError: () => void;
}

/**
 * Resolves a recipient by phone or email, builds a cross-border user-to-user
 * transfer with optional conversion + rate lock, debits the sender wallet,
 * credits the recipient's matching-currency wallet, and writes an immutable
 * transaction that advances Initiated -> Rate locked -> Cleared -> Delivered.
 */
export function useTransfer(): UseTransferApi {
  const [submitting, setSubmitting] = useState(false);
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookupRecipient = useCallback(
    async (query: string): Promise<RecipientLookupResult> => {
      setError(null);
      const q = query.trim();
      if (!q) return { found: false, error: 'Enter a phone number or email.' };
      setLooking(true);
      try {
        const isEmail = q.includes('@');
        const column = isEmail ? 'email' : 'phone';
        const { data, error: err } = await supabase
          .from(table('profiles'))
          .select('*')
          .eq(column, q)
          .maybeSingle();
        if (err) throw err;
        if (!data) return { found: false, error: 'No NairaCFA account matches that.' };
        return { found: true, profile: data as Profile };
      } catch (e) {
        const msg = describeError(e);
        setError(msg);
        return { found: false, error: msg };
      } finally {
        setLooking(false);
      }
    },
    []
  );

  const transfer = useCallback(async (args: TransferArgs): Promise<TransferResult> => {
    setError(null);
    const {
      userId,
      recipientUserId,
      fromCurrency,
      toCurrency,
      fromAmount,
      rate,
      rateLockId,
      fromWallet,
    } = args;

    if (!userId) {
      const msg = 'You must be signed in.';
      setError(msg);
      return { ok: false, error: msg };
    }
    if (!recipientUserId || recipientUserId === userId) {
      const msg = 'Pick a valid recipient.';
      setError(msg);
      return { ok: false, error: msg, code: 'recipient_not_found' };
    }
    if (!fromAmount || fromAmount <= 0) {
      const msg = 'Enter an amount to send.';
      setError(msg);
      return { ok: false, error: msg };
    }

    const crossCurrency = fromCurrency !== toCurrency;
    const math = crossCurrency
      ? computeConversion(fromAmount, rate, fromCurrency, toCurrency)
      : {
          fromAmount,
          toAmount: fromAmount,
          netToAmount: fromAmount,
          fee: 0,
          feeCurrency: fromCurrency,
          rate: 1,
        };

    if (fromWallet && fromWallet.available_balance < math.fromAmount) {
      const msg = 'Insufficient funds for this transfer including fees.';
      setError(msg);
      return { ok: false, error: msg, code: 'insufficient_funds' };
    }

    setSubmitting(true);
    const reference = generateReference('transfer');
    try {
      // 1) Initiated
      const txnRow = {
        user_id: userId,
        wallet_id: fromWallet?.id ?? null,
        type: 'transfer' as const,
        status: 'initiated' as const,
        direction: 'out' as const,
        currency: fromCurrency,
        amount: math.fromAmount,
        fee: math.fee,
        counterparty_user_id: recipientUserId,
        rate_lock_id: rateLockId ?? null,
        applied_rate: crossCurrency ? rate : null,
        from_currency: fromCurrency,
        to_currency: toCurrency,
        from_amount: math.fromAmount,
        to_amount: math.netToAmount,
        provider: 'internal',
        provider_reference: null,
        reference,
        raw: { cross_currency: crossCurrency, fee_currency: math.feeCurrency },
      };
      const { data: txn, error: txnErr } = await supabase
        .from(table('transactions'))
        .insert(txnRow)
        .select()
        .single();
      if (txnErr) throw txnErr;
      const txnId = (txn as Transaction).id;

      // 2) Rate locked (when a lock is in play)
      if (rateLockId) {
        await supabase
          .from(table('transactions'))
          .update({ status: 'rate_locked' })
          .eq('id', txnId);
        await supabase
          .from(table('rate_locks'))
          .update({ status: 'used' as RateLock['status'] })
          .eq('id', rateLockId);
      }

      // 3) Processing via processor (cross-border settlement)
      await supabase
        .from(table('transactions'))
        .update({ status: 'processing' })
        .eq('id', txnId);

      const processor = await processPayment({
        op: 'transfer',
        userId,
        currency: fromCurrency,
        amount: math.fromAmount,
        reference,
        destination: { recipient_user_id: recipientUserId, to_currency: toCurrency },
      });

      // Debit sender wallet.
      if (fromWallet) {
        await supabase
          .from(table('wallets'))
          .update({
            balance: Math.max(fromWallet.balance - math.fromAmount, 0),
            available_balance: Math.max(
              fromWallet.available_balance - math.fromAmount,
              0
            ),
          })
          .eq('id', fromWallet.id);
      }

      // Credit recipient's matching-currency wallet (provision if missing).
      const { data: recWallets } = await supabase
        .from(table('wallets'))
        .select('*')
        .eq('user_id', recipientUserId)
        .eq('currency', toCurrency)
        .limit(1);
      const recWallet = (recWallets as Wallet[] | null)?.[0];
      if (recWallet) {
        await supabase
          .from(table('wallets'))
          .update({
            balance: recWallet.balance + math.netToAmount,
            available_balance: recWallet.available_balance + math.netToAmount,
          })
          .eq('id', recWallet.id);
      } else {
        await supabase.from(table('wallets')).insert({
          user_id: recipientUserId,
          currency: toCurrency,
          balance: math.netToAmount,
          available_balance: math.netToAmount,
          locked_balance: 0,
          status: 'active',
        });
      }

      // Mirror an inbound transaction on the recipient's ledger.
      await supabase.from(table('transactions')).insert({
        user_id: recipientUserId,
        wallet_id: recWallet?.id ?? null,
        type: 'transfer',
        status: 'delivered',
        direction: 'in',
        currency: toCurrency,
        amount: math.netToAmount,
        fee: 0,
        counterparty_user_id: userId,
        rate_lock_id: null,
        applied_rate: crossCurrency ? rate : null,
        from_currency: fromCurrency,
        to_currency: toCurrency,
        from_amount: math.fromAmount,
        to_amount: math.netToAmount,
        provider: processor.provider,
        provider_reference: processor.providerReference,
        reference,
        raw: { inbound: true },
      });

      // 4) Delivered (sender side)
      const { data: delivered } = await supabase
        .from(table('transactions'))
        .update({
          status: 'delivered',
          provider: processor.provider,
          provider_reference: processor.providerReference,
        })
        .eq('id', txnId)
        .select()
        .single();

      return { ok: true, transaction: (delivered as Transaction) ?? (txn as Transaction) };
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

  return { submitting, looking, error, lookupRecipient, transfer, clearError };
}
