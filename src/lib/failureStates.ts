import type { FailureCode, FailureState } from '../types';

export const FAILURE_STATES: Record<FailureCode, FailureState> = {
  loading: {
    code: 'loading',
    title: 'Loading',
    description: 'Fetching your latest data…',
    tone: 'neutral',
  },
  empty: {
    code: 'empty',
    title: 'Nothing here yet',
    description: 'Fund your wallet in 2 minutes to get started.',
    tone: 'info',
    actionLabel: 'Fund wallet',
  },
  error: {
    code: 'error',
    title: 'Something went wrong',
    description: 'We couldn’t complete that request. Please try again.',
    tone: 'error',
    actionLabel: 'Retry',
  },
  offline: {
    code: 'offline',
    title: 'You’re offline',
    description: 'Reconnect to refresh live rates and balances.',
    tone: 'warning',
    actionLabel: 'Retry',
  },
  rate_stale: {
    code: 'rate_stale',
    title: 'Rate may be stale',
    description: 'We couldn’t refresh the live rate. The shown figure may be outdated.',
    tone: 'warning',
    actionLabel: 'Refresh rate',
  },
  kyc_pending: {
    code: 'kyc_pending',
    title: 'Verification in progress',
    description: 'Complete KYC verification to unlock transfers and withdrawals.',
    tone: 'info',
    actionLabel: 'Verify identity',
  },
  rate_lock_expired: {
    code: 'rate_lock_expired',
    title: 'Rate lock expired',
    description: 'Your 30-second guarantee elapsed. Get a fresh quote to continue.',
    tone: 'warning',
    actionLabel: 'Re-quote',
  },
  insufficient_funds: {
    code: 'insufficient_funds',
    title: 'Insufficient funds',
    description: 'Your available balance is too low for this amount including fees.',
    tone: 'error',
    actionLabel: 'Add funds',
  },
  payment_processor_error: {
    code: 'payment_processor_error',
    title: 'Payment processor error',
    description: 'The payment provider couldn’t process this. No funds were moved.',
    tone: 'error',
    actionLabel: 'Try again',
  },
};

export function getFailureState(code: FailureCode): FailureState {
  return FAILURE_STATES[code];
}

export interface ToneStyle {
  bg: string;
  border: string;
  text: string;
  dot: string;
}

export const TONE_STYLES: Record<FailureState['tone'], ToneStyle> = {
  info: {
    bg: 'bg-[#10C97E]/8',
    border: 'border-[#10C97E]/30',
    text: 'text-[#10C97E]',
    dot: 'bg-[#10C97E]',
  },
  warning: {
    bg: 'bg-[#F4B740]/8',
    border: 'border-[#F4B740]/30',
    text: 'text-[#F4B740]',
    dot: 'bg-[#F4B740]',
  },
  error: {
    bg: 'bg-red-500/8',
    border: 'border-red-500/30',
    text: 'text-red-400',
    dot: 'bg-red-500',
  },
  neutral: {
    bg: 'bg-[#7E8C97]/8',
    border: 'border-[#7E8C97]/25',
    text: 'text-[#7E8C97]',
    dot: 'bg-[#7E8C97]',
  },
};

export function toneStyle(tone: FailureState['tone']): ToneStyle {
  return TONE_STYLES[tone];
}

export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

const STALE_THRESHOLD_MS = 20_000;

export function isRateStale(lastUpdatedMs: number | null): boolean {
  if (lastUpdatedMs == null) return true;
  return Date.now() - lastUpdatedMs > STALE_THRESHOLD_MS;
}

export function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Unexpected error';
}
