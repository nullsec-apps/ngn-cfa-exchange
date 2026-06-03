import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, AlertTriangle, Loader2, Check, X, RotateCcw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { formatRatePair } from '../lib/money';
import type { Currency, RateLock } from '../types';
import { cn } from '@/lib/utils';

interface RateLockCountdownProps {
  lock: RateLock | null;
  remainingSeconds: number;
  progress: number;
  active: boolean;
  expired: boolean;
  confirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onRequote: () => void;
  className?: string;
}

export function RateLockCountdown({
  lock,
  remainingSeconds,
  progress,
  active,
  expired,
  confirming = false,
  onConfirm,
  onCancel,
  onRequote,
  className,
}: RateLockCountdownProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!lock) return null;

  const rateLabel = formatRatePair(
    lock.from_currency as Currency,
    lock.to_currency as Currency,
    lock.locked_rate
  );

  const pct = Math.max(0, Math.min(100, progress * 100));
  const urgent = active && remainingSeconds <= 8;
  const accent = expired ? '#F4B740' : urgent ? '#F4B740' : '#10C97E';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ type: 'spring', stiffness: 360, damping: 30 }}
      className={cn(
        'relative overflow-hidden rounded-lg border bg-[#161E26] p-4 sm:p-5',
        expired ? 'border-[#F4B740]/40' : 'border-[#10C97E]/35',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md"
            style={{ backgroundColor: `${accent}1f` }}
          >
            {expired ? (
              <AlertTriangle className="h-3.5 w-3.5" style={{ color: accent }} strokeWidth={2} />
            ) : (
              <Lock className="h-3.5 w-3.5" style={{ color: accent }} strokeWidth={2} />
            )}
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7E8C97]">
              {expired ? 'Rate lock expired' : 'Rate locked'}
            </p>
            <p className="font-mono text-xs tabular-nums text-[#EAF1F4]">{rateLabel}</p>
          </div>
        </div>

        {active && (
          <AnimatePresence mode="wait">
            <motion.div
              key={remainingSeconds}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              transition={{ duration: 0.2 }}
            >
              <Badge
                className={cn(
                  'h-7 min-w-[3rem] justify-center border font-mono text-sm tabular-nums',
                  urgent
                    ? 'border-[#F4B740]/40 bg-[#F4B740]/12 text-[#F4B740]'
                    : 'border-[#10C97E]/35 bg-[#10C97E]/12 text-[#10C97E]'
                )}
              >
                {remainingSeconds}s
              </Badge>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {active && (
        <div className="mt-3">
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[#0E1419]">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ backgroundColor: accent }}
              animate={{ width: `${pct}%` }}
              transition={{ ease: 'linear', duration: 0.1 }}
            />
          </div>
        </div>
      )}

      {expired ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={onRequote}
            className="h-11 flex-1 gap-2 bg-[#F4B740] text-[#0E1419] transition-all duration-200 hover:bg-[#e6a82e]"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={2} />
            Get a fresh quote
          </Button>
          <Button
            onClick={onCancel}
            variant="outline"
            className="h-11 border-[#7E8C97]/25 bg-transparent text-[#7E8C97] transition-all duration-200 hover:border-[#7E8C97]/45 hover:text-[#EAF1F4] sm:w-28"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogTrigger asChild>
              <Button
                disabled={!active || confirming}
                className="h-11 flex-1 gap-2 bg-[#10C97E] font-semibold text-[#0E1419] transition-all duration-200 hover:bg-[#0fb873] disabled:opacity-50"
              >
                {confirming ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                ) : (
                  <Check className="h-4 w-4" strokeWidth={2} />
                )}
                Confirm at locked rate
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="border-[#7E8C97]/20 bg-[#161E26] text-[#EAF1F4]">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display text-[#EAF1F4]">
                  Confirm at this rate?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-[#7E8C97]">
                  You'll be charged at the locked rate of{' '}
                  <span className="font-mono tabular-nums text-[#EAF1F4]">{rateLabel}</span>. This
                  cannot be undone once executed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-[#7E8C97]/25 bg-transparent text-[#7E8C97] hover:bg-[#0E1419] hover:text-[#EAF1F4]">
                  Keep waiting
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={onConfirm}
                  className="bg-[#10C97E] text-[#0E1419] hover:bg-[#0fb873]"
                >
                  Confirm now
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            onClick={onCancel}
            variant="outline"
            className="h-11 gap-2 border-[#7E8C97]/25 bg-transparent text-[#7E8C97] transition-all duration-200 hover:border-red-500/40 hover:text-red-400 sm:w-28"
          >
            <X className="h-4 w-4" strokeWidth={2} />
            Cancel
          </Button>
        </div>
      )}
    </motion.div>
  );
}

export default RateLockCountdown;
