import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowDownUp,
  Send,
  Receipt,
  Mail,
  Loader2,
  Check,
  Copy,
  CheckCheck,
} from 'lucide-react';
import { TransferStatusStepper } from './TransferStatusStepper';
import { sendTransactionReceipt } from '../lib/email';
import { formatMoney, currencyMeta, formatRatePair } from '../lib/money';
import type { Transaction, TransactionType } from '../types';
import { cn } from '@/lib/utils';

interface TransactionDetailDrawerProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email?: string | null;
  onToast?: (msg: string, tone?: 'success' | 'error') => void;
}

const TYPE_ICON: Record<
  TransactionType,
  React.ComponentType<{ className?: string; strokeWidth?: number }>
> = {
  deposit: ArrowDownLeft,
  withdrawal: ArrowUpRight,
  conversion: ArrowDownUp,
  transfer: Send,
};

const TYPE_LABEL: Record<TransactionType, string> = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  conversion: 'Conversion',
  transfer: 'Transfer',
};

const STATUS_STYLE: Record<string, string> = {
  completed: 'bg-[#10C97E]/12 text-[#10C97E] border-[#10C97E]/30',
  delivered: 'bg-[#10C97E]/12 text-[#10C97E] border-[#10C97E]/30',
  cleared: 'bg-[#10C97E]/12 text-[#10C97E] border-[#10C97E]/30',
  processing: 'bg-[#F4B740]/12 text-[#F4B740] border-[#F4B740]/30',
  rate_locked: 'bg-[#F4B740]/12 text-[#F4B740] border-[#F4B740]/30',
  initiated: 'bg-[#7E8C97]/12 text-[#7E8C97] border-[#7E8C97]/25',
  failed: 'bg-red-500/12 text-red-400 border-red-500/30',
  cancelled: 'bg-red-500/12 text-red-400 border-red-500/30',
};

function statusLabel(s: string): string {
  return s
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function fmtFull(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function Row({
  label,
  value,
  mono,
  copyable,
  onCopy,
  copied,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  copyable?: boolean;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="flex-shrink-0 text-xs text-[#7E8C97]">{label}</span>
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          className={cn(
            'truncate text-right text-sm text-[#EAF1F4]',
            mono && 'font-mono tabular-nums'
          )}
        >
          {value}
        </span>
        {copyable && (
          <button
            type="button"
            onClick={onCopy}
            className="flex-shrink-0 rounded p-1 text-[#7E8C97] transition-colors duration-200 hover:text-[#10C97E]"
            aria-label="Copy"
          >
            {copied ? (
              <CheckCheck className="h-3.5 w-3.5" strokeWidth={2} />
            ) : (
              <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export function TransactionDetailDrawer({
  transaction,
  open,
  onOpenChange,
  email,
  onToast,
}: TransactionDetailDrawerProps) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!transaction) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="border-[#7E8C97]/15 bg-[#0E1419]" />
      </Sheet>
    );
  }

  const t = transaction;
  const Icon = TYPE_ICON[t.type] ?? Receipt;
  const positive = t.direction === 'in';
  const isCross =
    t.from_currency && t.to_currency && t.from_currency !== t.to_currency;
  const isTransfer = t.type === 'transfer';

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(t.reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* noop */
    }
  };

  const handleEmail = async () => {
    if (!email) {
      onToast?.('No email on file for this account.', 'error');
      return;
    }
    setSending(true);
    const res = await sendTransactionReceipt({
      to: email,
      reference: t.reference,
      type: TYPE_LABEL[t.type],
      status: statusLabel(t.status),
      amount: `${formatMoney(t.amount, t.currency)} ${t.currency}`,
      fee: t.fee ? `${formatMoney(t.fee, t.currency)} ${t.currency}` : undefined,
      rate:
        isCross && t.applied_rate
          ? formatRatePair(t.from_currency!, t.to_currency!, t.applied_rate)
          : undefined,
      date: fmtFull(t.created_at),
    });
    setSending(false);
    if (res.ok) {
      setSent(true);
      onToast?.('Receipt emailed.', 'success');
      setTimeout(() => setSent(false), 2400);
    } else {
      onToast?.(res.error || 'Could not send receipt.', 'error');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto border-[#7E8C97]/15 bg-[#0E1419] p-0 sm:max-w-md">
        <SheetHeader className="border-b border-[#7E8C97]/12 px-5 py-4 text-left">
          <SheetTitle className="flex items-center gap-2 font-display text-base font-bold text-[#EAF1F4]">
            <Receipt className="h-4 w-4 text-[#10C97E]" strokeWidth={2} />
            Transaction detail
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 px-5 py-5">
          {/* Hero amount */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center"
          >
            <span
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-xl',
                positive ? 'bg-[#10C97E]/12 text-[#10C97E]' : 'bg-[#161E26] text-[#EAF1F4]'
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <p className="mt-3 text-xs uppercase tracking-wide text-[#7E8C97]">
              {TYPE_LABEL[t.type]}
            </p>
            <p
              className={cn(
                'mt-1 font-mono text-3xl font-bold tabular-nums',
                positive ? 'text-[#10C97E]' : 'text-[#EAF1F4]'
              )}
            >
              {positive ? '+' : t.direction === 'out' ? '\u2212' : ''}
              {formatMoney(t.amount, t.currency)}
            </p>
            <Badge
              variant="outline"
              className={cn(
                'mt-2.5 px-2.5 py-0.5 text-[11px] font-medium',
                STATUS_STYLE[t.status] ?? STATUS_STYLE.initiated
              )}
            >
              {statusLabel(t.status)}
            </Badge>
          </motion.div>

          {/* Transfer lifecycle */}
          {isTransfer && (
            <div className="rounded-lg border border-[#7E8C97]/12 bg-[#161E26] p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[#7E8C97]">
                Lifecycle
              </p>
              <TransferStatusStepper status={t.status} />
            </div>
          )}

          {/* Details */}
          <div className="rounded-lg border border-[#7E8C97]/12 bg-[#161E26] px-4 py-1">
            <Row
              label="Reference"
              value={t.reference}
              mono
              copyable
              onCopy={copyRef}
              copied={copied}
            />
            <Separator className="bg-[#7E8C97]/10" />
            <Row
              label="Amount"
              value={`${formatMoney(t.amount, t.currency)} ${t.currency}`}
              mono
            />
            {t.fee != null && t.fee > 0 && (
              <>
                <Separator className="bg-[#7E8C97]/10" />
                <Row
                  label="Fee"
                  value={`${formatMoney(t.fee, t.currency)} ${t.currency}`}
                  mono
                />
              </>
            )}
            {isCross && t.applied_rate && (
              <>
                <Separator className="bg-[#7E8C97]/10" />
                <Row
                  label="Applied rate"
                  value={formatRatePair(t.from_currency!, t.to_currency!, t.applied_rate)}
                  mono
                />
              </>
            )}
            {isCross && t.to_amount != null && (
              <>
                <Separator className="bg-[#7E8C97]/10" />
                <Row
                  label={`Received (${t.to_currency})`}
                  value={`${formatMoney(t.to_amount, t.to_currency!)} ${t.to_currency}`}
                  mono
                />
              </>
            )}
            {t.provider && (
              <>
                <Separator className="bg-[#7E8C97]/10" />
                <Row label="Provider" value={t.provider} />
              </>
            )}
            {t.provider_reference && (
              <>
                <Separator className="bg-[#7E8C97]/10" />
                <Row label="Provider ref" value={t.provider_reference} mono />
              </>
            )}
            <Separator className="bg-[#7E8C97]/10" />
            <Row label="Date" value={fmtFull(t.created_at)} />
          </div>

          {/* Currency note */}
          {isCross && (
            <p className="text-center text-xs text-[#7E8C97]">
              {currencyMeta(t.from_currency!).flag} {t.from_currency} \u2192{' '}
              {currencyMeta(t.to_currency!).flag} {t.to_currency} \u00b7 mid-market rate
            </p>
          )}

          {/* Receipt action */}
          <Button
            onClick={handleEmail}
            disabled={sending}
            className={cn(
              'h-11 w-full gap-2 font-semibold transition-all duration-200 disabled:opacity-50',
              sent
                ? 'bg-[#10C97E]/20 text-[#10C97E]'
                : 'bg-[#10C97E] text-[#0E1419] hover:bg-[#0fb873]'
            )}
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> Sending\u2026
              </>
            ) : sent ? (
              <>
                <Check className="h-4 w-4" strokeWidth={2.5} /> Receipt sent
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" strokeWidth={1.75} /> Email receipt
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default TransactionDetailDrawer;
