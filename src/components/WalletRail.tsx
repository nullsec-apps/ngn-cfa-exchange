import { motion } from 'framer-motion';
import { ShieldCheck, Wallet as WalletIcon, Lock, Sparkles, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { KycStatusBadge } from './KycStatusBadge';
import { WalletCard } from './WalletCard';
import { useWallets } from '../hooks/useWallets';
import { useRateTicker } from '../hooks/useRateTicker';
import { sampleWallets } from '../lib/sampleData';
import { formatMoney, currencyMeta, formatRatePair } from '../lib/money';
import type { Currency, KycStatus, Wallet } from '../types';
import { cn } from '@/lib/utils';

interface WalletRailProps {
  userId: string | null;
  kycStatus: KycStatus;
  onVerify?: () => void;
  onDeposit?: (currency: Currency) => void;
  onWithdraw?: (currency: Currency) => void;
  onConvert?: (currency: Currency) => void;
  className?: string;
}

export function WalletRail({
  userId,
  kycStatus,
  onVerify,
  onDeposit,
  onWithdraw,
  onConvert,
  className,
}: WalletRailProps) {
  const walletsApi = useWallets(userId);
  const ticker = useRateTicker();

  const realWallets = walletsApi.wallets ?? [];
  const hasReal = realWallets.length > 0;
  const displayWallets: Wallet[] = hasReal ? realWallets : sampleWallets();
  const usingSamples = !hasReal && !walletsApi.loading;

  const totalNgn = realWallets.find((w) => w.currency === 'NGN')?.available_balance ?? 0;
  const totalXof = realWallets.find((w) => w.currency === 'XOF')?.available_balance ?? 0;
  const hasBalance = totalNgn > 0 || totalXof > 0;

  const convertibleHint = ticker.rate ? formatRatePair('NGN', 'XOF', ticker.rate) : null;

  return (
    <motion.aside
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn('flex h-full flex-col', className)}
    >
      {/* Header: KYC status */}
      <div className="flex items-center justify-between gap-2 px-1 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#10C97E]/12">
            <WalletIcon className="h-3.5 w-3.5 text-[#10C97E]" strokeWidth={2} />
          </span>
          <span className="font-display text-sm font-semibold tracking-tight text-[#EAF1F4]">
            Your wallets
          </span>
        </div>
        <KycStatusBadge status={kycStatus} variant="hover" onVerify={onVerify} />
      </div>

      <Separator className="bg-[#7E8C97]/12" />

      {/* Total value summary (real only) */}
      {hasReal && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mt-3 rounded-lg border border-[#7E8C97]/12 bg-[#161E26] p-3"
        >
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#7E8C97]">
            Across all wallets
          </p>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <span className="font-mono text-base font-bold tabular-nums text-[#EAF1F4]">
              {formatMoney(totalNgn, 'NGN')}
            </span>
            <span className="text-[#7E8C97]">·</span>
            <span className="font-mono text-base font-bold tabular-nums text-[#EAF1F4]">
              {formatMoney(totalXof, 'XOF')}
            </span>
          </div>
        </motion.div>
      )}

      {/* Sample banner */}
      {usingSamples && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 flex items-start gap-2 rounded-lg border border-[#F4B740]/25 bg-[#F4B740]/[0.06] p-3"
        >
          <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#F4B740]" strokeWidth={2} />
          <div className="min-w-0">
            <p className="text-xs font-medium text-[#EAF1F4]">Example wallets</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-[#7E8C97]">
              {convertibleHint ? (
                <span className="flex items-center gap-1 font-mono tabular-nums">
                  <TrendingUp className="h-3 w-3 text-[#10C97E]" strokeWidth={2} />
                  {convertibleHint}
                </span>
              ) : (
                'Fund to start converting at the live rate.'
              )}
            </p>
          </div>
        </motion.div>
      )}

      {/* Wallet cards */}
      <ScrollArea className="mt-3 flex-1">
        <div className="flex flex-col gap-3 pr-1">
          {walletsApi.loading && !hasReal ? (
            <>
              <WalletSkeleton />
              <WalletSkeleton />
            </>
          ) : (
            displayWallets.map((w, i) => (
              <motion.div
                key={w.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
              >
                <WalletCard
                  wallet={w}
                  isSample={usingSamples}
                  onDeposit={onDeposit}
                  onWithdraw={onWithdraw}
                  onConvert={onConvert}
                />
              </motion.div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Locked balance footer */}
      {hasBalance && walletsApi.totalLocked > 0 && (
        <div className="mt-3 flex items-center gap-1.5 rounded-md border border-[#7E8C97]/12 bg-[#161E26] px-3 py-2">
          <Lock className="h-3 w-3 text-[#F4B740]" strokeWidth={2} />
          <span className="text-[11px] text-[#7E8C97]">Funds locked in pending transfers</span>
        </div>
      )}

      {/* Trust footer */}
      <div className="mt-3 flex items-center gap-1.5 px-1 text-[10px] text-[#7E8C97]">
        <ShieldCheck className="h-3 w-3 text-[#10C97E]" strokeWidth={2} />
        <span>Balances update in real time · no hidden spread</span>
      </div>
    </motion.aside>
  );
}

function WalletSkeleton() {
  return (
    <Card className="border-[#7E8C97]/12 bg-[#161E26] p-5">
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-9 w-9 rounded-lg bg-[#0E1419]" />
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-16 bg-[#0E1419]" />
          <Skeleton className="h-2.5 w-24 bg-[#0E1419]" />
        </div>
      </div>
      <Skeleton className="mt-4 h-8 w-40 bg-[#0E1419]" />
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Skeleton className="h-10 bg-[#0E1419]" />
        <Skeleton className="h-10 bg-[#0E1419]" />
        <Skeleton className="h-10 bg-[#0E1419]" />
      </div>
    </Card>
  );
}

export default WalletRail;
