import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  Send,
  Receipt,
  Inbox,
  AlertCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useTransactions, type TxnTypeFilter } from '../hooks/useTransactions';
import { sampleTransactions } from '../lib/sampleData';
import { SAMPLE_TRANSFER_TIMELINE } from '../lib/sampleData';
import { formatMoney, currencyMeta } from '../lib/money';
import type { Currency, Transaction, TransactionStatus, TransactionType } from '../types';
import { cn } from '@/lib/utils';

interface TransactionHistoryProps {
  userId: string | null;
  onSelect?: (txn: Transaction) => void;
  className?: string;
}

const TYPE_ICON: Record<TransactionType, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  deposit: ArrowDownToLine,
  withdrawal: ArrowUpFromLine,
  conversion: ArrowLeftRight,
  transfer: Send,
};

const STATUS_STYLE: Record<string, string> = {
  initiated: 'border-[#7E8C97]/30 bg-[#7E8C97]/12 text-[#7E8C97]',
  rate_locked: 'border-[#10C97E]/30 bg-[#10C97E]/12 text-[#10C97E]',
  processing: 'border-[#F4B740]/30 bg-[#F4B740]/12 text-[#F4B740]',
  cleared: 'border-[#10C97E]/30 bg-[#10C97E]/12 text-[#10C97E]',
  delivered: 'border-[#10C97E]/35 bg-[#10C97E]/15 text-[#10C97E]',
  completed: 'border-[#10C97E]/35 bg-[#10C97E]/15 text-[#10C97E]',
  failed: 'border-red-500/30 bg-red-500/12 text-red-400',
  cancelled: 'border-[#7E8C97]/25 bg-[#7E8C97]/10 text-[#7E8C97]',
};

const FILTERS: { value: TxnTypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'transfer', label: 'Transfers' },
  { value: 'conversion', label: 'Convert' },
  { value: 'deposit', label: 'Deposits' },
  { value: 'withdrawal', label: 'Withdrawals' },
];

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ' \u00b7 ' +
      d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function statusLabel(s: TransactionStatus): string {
  return s.replace(/_/g, ' ');
}

function TxnRow({ txn, onSelect, sample }: { txn: Transaction; onSelect?: (t: Transaction) => void; sample?: boolean }) {
  const Icon = TYPE_ICON[txn.type] ?? Receipt;
  const isCross = txn.from_currency && txn.to_currency && txn.from_currency !== txn.to_currency;
  const positive = txn.direction === 'in';
  const amountColor = sample
    ? 'text-[#7E8C97]'
    : positive
    ? 'text-[#10C97E]'
    : 'text-[#EAF1F4]';

  return (
    <motion.button
      type="button"
      onClick={() => !sample && onSelect?.(txn)}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      disabled={sample}
      className={cn(
        'flex w-full items-center gap-3 border-b border-[#7E8C97]/10 px-3 py-3 text-left transition-colors duration-200 last:border-0',
        !sample && 'hover:bg-[#0E1419] cursor-pointer',
        sample && 'opacity-70'
      )}
    >
      <span
        className={cn(
          'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg',
          positive ? 'bg-[#10C97E]/12 text-[#10C97E]' : 'bg-[#0E1419] text-[#7E8C97]'
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-display text-sm font-medium capitalize text-[#EAF1F4]">
            {txn.type}
          </p>
          {sample && (
            <Badge className="h-4 border-[#F4B740]/30 bg-[#F4B740]/12 px-1 text-[9px] font-medium text-[#F4B740]">
              Example
            </Badge>
          )}
        </div>
        <p className="mt-0.5 truncate font-mono text-[10px] tabular-nums text-[#7E8C97]">
          {txn.reference} \u00b7 {fmtDate(txn.created_at)}
        </p>
      </div>
      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        <p className={cn('font-mono text-sm font-semibold tabular-nums', amountColor)}>
          {positive ? '+' : isCross ? '' : '-'}
          {formatMoney(txn.amount, txn.currency as Currency)}
        </p>
        <Badge
          className={cn(
            'h-4 px-1.5 text-[9px] font-medium capitalize',
            STATUS_STYLE[txn.status] ?? STATUS_STYLE.initiated
          )}
        >
          {statusLabel(txn.status)}
        </Badge>
      </div>
    </motion.button>
  );
}

export function TransactionHistory({ userId, onSelect, className }: TransactionHistoryProps) {
  const api = useTransactions(userId);
  const [samples] = useState(() => sampleTransactions());

  const showEmpty = !api.loading && api.transactions.length === 0;
  const showFilteredEmpty =
    !api.loading && api.transactions.length > 0 && api.filtered.length === 0;

  return (
    <Card className={cn('flex flex-col overflow-hidden border-[#7E8C97]/12 bg-[#161E26]', className)}>
      <div className="border-b border-[#7E8C97]/12 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#10C97E]/12">
              <Receipt className="h-3.5 w-3.5 text-[#10C97E]" strokeWidth={2} />
            </span>
            <h2 className="font-display text-base font-semibold text-[#EAF1F4]">History</h2>
          </div>
        </div>

        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7E8C97]" strokeWidth={2} />
          <Input
            placeholder="Search reference or type\u2026"
            value={api.search}
            onChange={(e) => api.setSearch(e.target.value)}
            className="h-11 border-[#7E8C97]/20 bg-[#0E1419] pl-9 text-sm text-[#EAF1F4]"
          />
        </div>

        <Tabs
          value={api.typeFilter}
          onValueChange={(v) => api.setTypeFilter(v as TxnTypeFilter)}
          className="mt-3"
        >
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
            {FILTERS.map((f) => (
              <TabsTrigger
                key={f.value}
                value={f.value}
                className="h-8 rounded-md border border-[#7E8C97]/15 bg-[#0E1419] px-3 text-xs text-[#7E8C97] transition-all duration-200 data-[state=active]:border-[#10C97E]/40 data-[state=active]:bg-[#10C97E]/12 data-[state=active]:text-[#10C97E]"
              >
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-hidden">
        {api.loading ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg bg-[#0E1419]" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-24 bg-[#0E1419]" />
                  <Skeleton className="h-2.5 w-36 bg-[#0E1419]" />
                </div>
                <Skeleton className="h-5 w-16 bg-[#0E1419]" />
              </div>
            ))}
          </div>
        ) : api.error ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <AlertCircle className="h-8 w-8 text-red-400" strokeWidth={1.5} />
            <p className="mt-3 font-display text-sm font-semibold text-[#EAF1F4]">
              Couldn't load history
            </p>
            <p className="mt-1 text-xs text-[#7E8C97]">{api.error}</p>
            <Button
              onClick={() => api.refresh()}
              variant="outline"
              className="mt-4 h-9 border-[#7E8C97]/25 bg-transparent text-sm text-[#EAF1F4] hover:border-[#10C97E]/40"
            >
              Try again
            </Button>
          </div>
        ) : showEmpty ? (
          <ScrollArea className="h-full">
            <div className="px-4 pb-4 pt-2">
              <div className="flex flex-col items-center py-6 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0E1419]">
                  <Inbox className="h-5 w-5 text-[#7E8C97]" strokeWidth={1.5} />
                </span>
                <p className="mt-3 font-display text-sm font-semibold text-[#EAF1F4]">
                  No transactions yet
                </p>
                <p className="mt-1 max-w-xs text-xs leading-relaxed text-[#7E8C97]">
                  Here's how a cross-border transfer flows once you make your first send.
                </p>
              </div>

              <div className="mt-2 rounded-lg border border-[#F4B740]/20 bg-[#F4B740]/[0.05] p-4">
                <div className="flex items-center gap-1.5">
                  <Badge className="h-4 border-[#F4B740]/30 bg-[#F4B740]/12 px-1.5 text-[9px] font-medium text-[#F4B740]">
                    Sample
                  </Badge>
                  <p className="text-[11px] font-medium text-[#EAF1F4]">
                    Transfer lifecycle
                  </p>
                </div>
                <ol className="mt-3 space-y-3">
                  {SAMPLE_TRANSFER_TIMELINE.map((step, i) => (
                    <li key={step.status} className="flex gap-3">
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-[#10C97E]/30 bg-[#10C97E]/10 font-mono text-[10px] font-bold text-[#10C97E]">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#EAF1F4]">{step.label}</p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-[#7E8C97]">
                          {step.description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <p className="mt-4 px-1 text-[11px] font-medium uppercase tracking-wide text-[#7E8C97]">
                Example records
              </p>
              <div className="mt-1 rounded-lg border border-[#7E8C97]/10">
                {samples.map((s) => (
                  <TxnRow key={s.id} txn={s} sample />
                ))}
              </div>
            </div>
          </ScrollArea>
        ) : showFilteredEmpty ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <Search className="h-7 w-7 text-[#7E8C97]" strokeWidth={1.5} />
            <p className="mt-3 font-display text-sm font-semibold text-[#EAF1F4]">No matches</p>
            <p className="mt-1 text-xs text-[#7E8C97]">Try a different filter or search term.</p>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <AnimatePresence initial={false}>
              {api.filtered.map((t) => (
                <TxnRow key={t.id} txn={t} onSelect={onSelect} />
              ))}
            </AnimatePresence>
          </ScrollArea>
        )}
      </div>
    </Card>
  );
}

export default TransactionHistory;
