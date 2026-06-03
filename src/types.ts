export type Currency = 'NGN' | 'XOF';

export type KycStatus = 'unverified' | 'pending' | 'verified' | 'rejected';
export type AccountStatus = 'active' | 'suspended' | 'closed';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  kyc_status: KycStatus;
  account_status: AccountStatus;
  created_at: string;
}

export type KycLevel = 'tier1' | 'tier2' | 'tier3';
export type KycRecordStatus = 'pending' | 'submitted' | 'approved' | 'rejected';

export interface KycVerification {
  id: string;
  user_id: string;
  level: KycLevel;
  status: KycRecordStatus;
  document_type: string | null;
  document_url: string | null;
  selfie_url: string | null;
  provider: string | null;
  provider_reference: string | null;
  rejection_reason: string | null;
  raw: Record<string, unknown> | null;
  reviewed_at: string | null;
  created_at: string;
}

export type WalletStatus = 'active' | 'frozen' | 'closed';

export interface Wallet {
  id: string;
  user_id: string;
  currency: Currency;
  balance: number;
  available_balance: number;
  locked_balance: number;
  status: WalletStatus;
  created_at: string;
}

export type TransactionType = 'deposit' | 'withdrawal' | 'conversion' | 'transfer';
export type TransactionStatus =
  | 'initiated'
  | 'rate_locked'
  | 'processing'
  | 'cleared'
  | 'delivered'
  | 'completed'
  | 'failed'
  | 'cancelled';
export type TransactionDirection = 'in' | 'out';

export interface Transaction {
  id: string;
  user_id: string;
  wallet_id: string | null;
  type: TransactionType;
  status: TransactionStatus;
  direction: TransactionDirection | null;
  currency: Currency;
  amount: number;
  fee: number | null;
  counterparty_user_id: string | null;
  rate_lock_id: string | null;
  applied_rate: number | null;
  from_currency: Currency | null;
  to_currency: Currency | null;
  from_amount: number | null;
  to_amount: number | null;
  provider: string | null;
  provider_reference: string | null;
  reference: string;
  raw: Record<string, unknown> | null;
  created_at: string;
}

export type RateLockStatus = 'active' | 'used' | 'expired' | 'cancelled';

export interface RateLock {
  id: string;
  user_id: string;
  from_currency: Currency;
  to_currency: Currency;
  locked_rate: number;
  from_amount: number | null;
  to_amount: number | null;
  status: RateLockStatus;
  expires_at: string;
  created_at: string;
}

export interface RateSnapshot {
  id: string;
  base_currency: Currency;
  quote_currency: Currency;
  mid_rate: number;
  source: string | null;
  raw: Record<string, unknown> | null;
  created_at: string;
}

export type PaymentMethodType = 'bank_account' | 'mobile_money';
export type PaymentMethodStatus = 'active' | 'pending' | 'disabled';

export interface PaymentMethod {
  id: string;
  user_id: string;
  type: PaymentMethodType;
  currency: Currency;
  label: string | null;
  account_name: string | null;
  account_number_masked: string | null;
  provider: string | null;
  details: Record<string, unknown> | null;
  is_default: boolean | null;
  status: PaymentMethodStatus;
  created_at: string;
}

export type FailureCode =
  | 'loading'
  | 'empty'
  | 'error'
  | 'offline'
  | 'rate_stale'
  | 'kyc_pending'
  | 'rate_lock_expired'
  | 'insufficient_funds'
  | 'payment_processor_error';

export interface FailureState {
  code: FailureCode;
  title: string;
  description: string;
  tone: 'info' | 'warning' | 'error' | 'neutral';
  actionLabel?: string;
}

export interface ConversionPreview {
  fromCurrency: Currency;
  toCurrency: Currency;
  fromAmount: number;
  toAmount: number;
  rate: number;
  fee: number;
  feeCurrency: Currency;
  netToAmount: number;
}

export type AppView = 'home' | 'convert' | 'send' | 'history' | 'profile';

export interface NullSecGlobal {
  projectId: string;
  logoUrl?: string;
}

declare global {
  interface Window {
    __NULLSEC__?: NullSecGlobal;
  }
}

export function projectTable(name: string): string {
  const pid = (typeof window !== 'undefined' && window.__NULLSEC__?.projectId) || 'local';
  return `app_${pid}_${name}`;
}
