import type {
  Currency,
  Transaction,
  TransactionStatus,
  Wallet,
} from '../types';

/**
 * Clearly-labeled EXAMPLE data for empty states. These are NEVER persisted and
 * are visibly marked as samples in the UI so users learn the flow before they
 * fund a real wallet. Live numbers (rates, real balances) always come from the
 * APIs / Supabase — these samples exist purely for onboarding.
 */

export const SAMPLE_FLAG = true;

/** Example wallet shells (zero balance, but show structure + currency). */
export function sampleWallets(): Wallet[] {
  const base = {
    user_id: 'sample',
    balance: 0,
    available_balance: 0,
    locked_balance: 0,
    status: 'active' as const,
    created_at: new Date().toISOString(),
  };
  return [
    { id: 'sample-ngn', currency: 'NGN' as Currency, ...base },
    { id: 'sample-xof', currency: 'XOF' as Currency, ...base },
  ];
}

export interface SampleStep {
  status: TransactionStatus;
  label: string;
  description: string;
  offsetMinutes: number;
}

/**
 * Anonymized sample transfer timeline explaining each lifecycle stage:
 * Initiated -> Rate locked -> Cleared -> Delivered.
 */
export const SAMPLE_TRANSFER_TIMELINE: SampleStep[] = [
  {
    status: 'initiated',
    label: 'Initiated',
    description: 'Transfer created and queued for processing.',
    offsetMinutes: 0,
  },
  {
    status: 'rate_locked',
    label: 'Rate locked',
    description: 'Mid-market rate guaranteed for 30 seconds at confirmation.',
    offsetMinutes: 1,
  },
  {
    status: 'cleared',
    label: 'Cleared',
    description: 'Funds debited and converted at the locked rate.',
    offsetMinutes: 3,
  },
  {
    status: 'delivered',
    label: 'Delivered',
    description: 'Recipient credited in their local currency.',
    offsetMinutes: 6,
  },
];

/**
 * A small set of anonymized example transactions for an empty history view.
 * `id` is prefixed `sample-` and a `raw.sample` flag is set so the UI can label
 * and never treat them as real records.
 */
export function sampleTransactions(): Transaction[] {
  const now = Date.now();
  const iso = (minsAgo: number) => new Date(now - minsAgo * 60_000).toISOString();
  const mk = (t: Partial<Transaction> & Pick<Transaction, 'type' | 'reference'>): Transaction => ({
    id: `sample-${t.reference}`,
    user_id: 'sample',
    wallet_id: null,
    status: 'completed',
    direction: null,
    currency: 'NGN',
    amount: 0,
    fee: 0,
    counterparty_user_id: null,
    rate_lock_id: null,
    applied_rate: null,
    from_currency: null,
    to_currency: null,
    from_amount: null,
    to_amount: null,
    provider: 'example',
    provider_reference: null,
    raw: { sample: true },
    created_at: iso(0),
    ...t,
  });

  return [
    mk({
      type: 'transfer',
      reference: 'TRF-SAMPLE-A1',
      status: 'delivered',
      direction: 'out',
      currency: 'NGN',
      amount: 250000,
      fee: 1250,
      from_currency: 'NGN',
      to_currency: 'XOF',
      from_amount: 250000,
      to_amount: 97800,
      applied_rate: 0.3912,
      created_at: iso(18),
    }),
    mk({
      type: 'conversion',
      reference: 'CNV-SAMPLE-B2',
      status: 'completed',
      currency: 'NGN',
      amount: 120000,
      fee: 600,
      from_currency: 'NGN',
      to_currency: 'XOF',
      from_amount: 120000,
      to_amount: 46710,
      applied_rate: 0.3912,
      created_at: iso(94),
    }),
    mk({
      type: 'deposit',
      reference: 'DEP-SAMPLE-C3',
      status: 'cleared',
      direction: 'in',
      currency: 'XOF',
      amount: 60000,
      fee: 0,
      created_at: iso(310),
    }),
  ];
}

/** Detect whether a record is sample/example data. */
export function isSample(
  record: { id?: string; raw?: Record<string, unknown> | null } | null | undefined
): boolean {
  if (!record) return false;
  if (typeof record.id === 'string' && record.id.startsWith('sample-')) return true;
  return Boolean(record.raw && (record.raw as Record<string, unknown>).sample === true);
}
