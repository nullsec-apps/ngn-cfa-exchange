/**
 * Human-readable, collision-resistant transaction reference codes.
 * Format: PREFIX-YYMMDD-XXXX where XXXX is base36 randomness.
 */

import type { TransactionType } from '../types';

const TYPE_PREFIX: Record<TransactionType, string> = {
  deposit: 'DEP',
  withdrawal: 'WDL',
  conversion: 'CNV',
  transfer: 'TRF',
};

function randomBlock(len = 4): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  let out = '';
  const cryptoObj = typeof crypto !== 'undefined' ? crypto : undefined;
  if (cryptoObj && 'getRandomValues' in cryptoObj) {
    const buf = new Uint32Array(len);
    cryptoObj.getRandomValues(buf);
    for (let i = 0; i < len; i++) {
      out += alphabet[buf[i] % alphabet.length];
    }
  } else {
    for (let i = 0; i < len; i++) {
      out += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
  }
  return out;
}

function dateBlock(d = new Date()): string {
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

/** Generate a reference for a given transaction type. */
export function generateReference(type: TransactionType): string {
  return `${TYPE_PREFIX[type]}-${dateBlock()}-${randomBlock(4)}`;
}

/** Generate an arbitrary prefixed reference (e.g. rate locks). */
export function generateRef(prefix: string): string {
  return `${prefix.toUpperCase()}-${dateBlock()}-${randomBlock(4)}`;
}

/** Format a reference for compact display (preserves full code). */
export function shortRef(reference: string): string {
  return reference;
}
