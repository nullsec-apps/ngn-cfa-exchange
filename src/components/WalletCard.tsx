import { motion } from 'framer-motion';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  Lock,
  Wallet as WalletIcon,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatMoney, currencyMeta, formatRatePair } from '../lib/money';
import { useRateTicker } from '../hooks/useRateTicker';
import type { Currency, Wallet } from '../types';
import { cn } from '@/lib/utils';

interface WalletCardProps {
  wallet: Wallet;
  isSample?: boolean;
  loading?: boolean;
  onDeposit?: (currency: Currency) => void;
  onWithdraw?: (currency: Currency) => void;
  onConvert?: (currency: Currency) => void;
  className?: string;
}

export function WalletCard({
  wallet,
  isSample = false,
  loading = false,
  onDeposit,
  onWithdraw,
  onConvert,
  className,
}: WalletCardProps) {
  const meta = currencyMeta(wallet.currency);
  const ticker = useRateTicker();
  const empty = (wallet.balance ?? 0) <= 0;
  const hasLocked = (wallet.locked_balance ?? 0) > 0;

  const convertibleHint = (() => {
    if (!ticker.rate || wallet.currency !== 'NGN') return null;
    return formatRatePair('NGN', 'XOF', ticker.rate);
  })();

  if (loading) {
    return (
      <Card className={cn('border-[#7E8C97]/12 bg-[#161E26] p-5', className)}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-24 rounded bg-[#0E1419]" />
          <div className="h-8 w-40 rounded bg-[#0E1419]" />
          <div className="h-3 w-32 rounded bg-[#0E1419]" />
          <div className="mt-4 flex gap-2">
            <div className="h-9 flex-1 rounded bg-[#0E1419]" />
            <div className="h-9 flex-1 rounded bg-[#0E1419]" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      className={className}
    >
      <Card
        className={cn(
          'group relative overflow-hidden border-[#7E8C97]/12 bg-[#161E26] p-5 transition-all duration-200',
          'hover:border-[#10C97E]/30 hover:shadow-lg hover:shadow-black/30'
        )}
      >
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-[0.07] blur-2xl transition-opacity duration-300 group-hover:opacity-[0.12]"
          style={{ backgroundColor: '#10C97E' }}
          aria-hidden
        />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0E1419] text-lg">
              {meta.flag}
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-display text-sm font-semibold text-[#EAF1F4]">{wallet.currency}</p>
                <WalletIcon className="h-3 w-3 text-[#7E8C97]" strokeWidth={2} />
              </div>
              <p className="text-[11px] text-[#7E8C97]">{meta.label}</p>
            </div>
          </div>
          {isSample && (
            <Badge className="h-5 border-[#F4B740]/30 bg-[#F4B740]/12 px-1.5 text-[10px] font-medium text-[#F4B740]">
              Example
            </Badge>
          )}
        </div>

        <div className="mt-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#7E8C97]">
            Available balance
          </p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums tracking-tight text-[#EAF1F4]">
            {formatMoney(wallet.available_balance ?? 0, wallet.currency)}
          </p>
          {hasLocked && (
            <p className="mt-1 flex items-center gap-1 font-mono text-xs tabular-nums text-[#F4B740]">
              <Lock className="h-3 w-3" strokeWidth={2} />
              {formatMoney(wallet.locked_balance ?? 0, wallet.currency)} locked
            </p>
          )}
        </div>

        {empty && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mt-4 rounded-lg border border-[#10C97E]/20 bg-[#10C97E]/[0.06] p-3"
          >
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#10C97E]" strokeWidth={2} />
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#EAF1F4]">Fund in 2 minutes</p>
                {convertibleHint ? (
                  <p className="mt-0.5 flex items-center gap-1 font-mono text-[11px] tabular-nums text-[#7E8C97]">
                    <TrendingUp className="h-3 w-3 text-[#10C97E]" strokeWidth={2} />
                    {convertibleHint}
                  </p>
                ) : (
                  <p className="mt-0.5 text-[11px] text-[#7E8C97]">
                    Deposit to convert at the live mid-market rate.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Button
            onClick={() => onDeposit?.(wallet.currency)}
            disabled={isSample}
            className="h-10 flex-col gap-0.5 bg-[#10C97E] px-1 text-[#0E1419] transition-all duration-200 hover:bg-[#0fb873] disabled:opacity-40"
          >
            <ArrowDownToLine className="h-3.5 w-3.5" strokeWidth={2} />
            <span className="text-[10px] font-semibold">Deposit</span>
          </Button>
          <Button
            onClick={() => onWithdraw?.(wallet.currency)}
            disabled={isSample || empty}
            variant="outline"
            className="h-10 flex-col gap-0.5 border-[#7E8C97]/20 bg-transparent px-1 text-[#EAF1F4] transition-all duration-200 hover:border-[#7E8C97]/45 hover:bg-[#0E1419] disabled:opacity-40"
          >
            <ArrowUpFromLine className="h-3.5 w-3.5" strokeWidth={2} />
            <span className="text-[10px] font-medium">Withdraw</span>
          </Button>
          <Button
            onClick={() => onConvert?.(wallet.currency)}
            disabled={isSample || empty}
            variant="outline"
            className="h-10 flex-col gap-0.5 border-[#7E8C97]/20 bg-transparent px-1 text-[#EAF1F4] transition-all duration-200 hover:border-[#10C97E]/45 hover:bg-[#0E1419] disabled:opacity-40"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" strokeWidth={2} />
            <span className="text-[10px] font-medium">Convert</span>
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

export default WalletCard;
