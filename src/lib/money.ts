import type { Currency } from '../types';

/**
 * Currency formatting + math helpers.
 * Money figures must render in tabular monospaced lining numerals — wrap output
 * in an element with the `.tabular` class for column-perfect alignment.
 */

export interface CurrencyMeta {
  code: Currency;
  label: string;
  symbol: string;
  fractionDigits: number;
  flag: string;
  country: string;
}

export const CURRENCIES: Record<Currency, CurrencyMeta> = {
  NGN: {
    code: 'NGN',
    label: 'Nigerian Naira',
    symbol: '\u20A6',
    fractionDigits: 2,
    flag: '\uD83C\uDDF3\uD83C\uDDEC',
    country: 'Nigeria',
  },
  XOF: {
    code: 'XOF',
    label: 'West African CFA',
    symbol: 'CFA',
    fractionDigits: 0,
    flag: '\uD83C\uDDE7\uD83C\uDDEF',
    country: 'CFA zone',
  },
};

export function currencyMeta(currency: Currency): CurrencyMeta {
  return CURRENCIES[currency] ?? CURRENCIES.NGN;
}

export function fractionDigits(currency: Currency): number {
  return currencyMeta(currency).fractionDigits;
}

/** Format a number with grouping and currency-appropriate decimals. */
export function formatNumber(value: number, currency: Currency): string {
  const digits = fractionDigits(currency);
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** Format with symbol prefix/suffix, e.g. "\u20A6 1,250.00" or "391 CFA". */
export function formatMoney(value: number, currency: Currency): string {
  const meta = currencyMeta(currency);
  const num = formatNumber(value, currency);
  if (currency === 'XOF') return `${num}\u00A0${meta.symbol}`;
  return `${meta.symbol}${num}`;
}

/** Compact format for large headline figures: 1.2M, 391.4K. */
export function formatCompact(value: number, currency: Currency): string {
  const meta = currencyMeta(currency);
  const abs = Math.abs(value);
  let out: string;
  if (abs >= 1_000_000_000) out = (value / 1_000_000_000).toFixed(2) + 'B';
  else if (abs >= 1_000_000) out = (value / 1_000_000).toFixed(2) + 'M';
  else if (abs >= 1_000) out = (value / 1_000).toFixed(1) + 'K';
  else out = formatNumber(value, currency);
  return currency === 'XOF' ? `${out}\u00A0${meta.symbol}` : `${meta.symbol}${out}`;
}

/** Format a rate like "1,000 NGN = 391.2 XOF". */
export function formatRatePair(
  from: Currency,
  to: Currency,
  rate: number,
  baseUnits = 1000
): string {
  const converted = rate * baseUnits;
  const fromNum = new Intl.NumberFormat('en-US').format(baseUnits);
  const toNum = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(converted);
  return `${fromNum} ${from} = ${toNum} ${to}`;
}

/** Apply a mid-market rate from `from` -> `to`. */
export function applyRate(amount: number, rate: number): number {
  if (!Number.isFinite(amount) || !Number.isFinite(rate)) return 0;
  return amount * rate;
}

/** Round a value to the currency's minor unit. */
export function roundTo(value: number, currency: Currency): number {
  const digits = fractionDigits(currency);
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}

/** Platform fee: transparent, no hidden spread. 0.5% with currency minimum. */
export const FEE_RATE = 0.005;

const FEE_MIN: Record<Currency, number> = { NGN: 50, XOF: 50 };

export function computeFee(amount: number, currency: Currency): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const pct = amount * FEE_RATE;
  const min = FEE_MIN[currency] ?? 0;
  return roundTo(Math.max(pct, min), currency);
}

export interface ConversionMath {
  fromAmount: number;
  toAmount: number;
  fee: number;
  feeCurrency: Currency;
  netToAmount: number;
  rate: number;
}

/**
 * Compute a full conversion: fee is charged in the source currency, the
 * remainder is converted at the locked rate.
 */
export function computeConversion(
  fromAmount: number,
  rate: number,
  fromCurrency: Currency,
  toCurrency: Currency
): ConversionMath {
  const safeFrom = Number.isFinite(fromAmount) && fromAmount > 0 ? fromAmount : 0;
  const fee = computeFee(safeFrom, fromCurrency);
  const convertible = Math.max(safeFrom - fee, 0);
  const toAmount = roundTo(applyRate(safeFrom, rate), toCurrency);
  const netToAmount = roundTo(applyRate(convertible, rate), toCurrency);
  return {
    fromAmount: safeFrom,
    toAmount,
    fee,
    feeCurrency: fromCurrency,
    netToAmount,
    rate,
  };
}

/** Parse a user-typed amount string into a number, ignoring grouping. */
export function parseAmount(input: string): number {
  const cleaned = input.replace(/[^0-9.]/g, '');
  const value = parseFloat(cleaned);
  return Number.isFinite(value) ? value : 0;
}

/** Mask an account number, keeping the last 4 digits. */
export function maskAccount(account: string): string {
  const digits = account.replace(/\s+/g, '');
  if (digits.length <= 4) return digits;
  return `\u2022\u2022\u2022\u2022 ${digits.slice(-4)}`;
}

/** Format a percentage change with sign and one decimal. */
export function formatPct(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}
