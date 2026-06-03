import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDownUp, Loader2, Lock, Info, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { useConvert } from '../hooks/useConvert';
import { useRateTicker } from '../hooks/useRateTicker';
import { useRateLock } from '../hooks/useRateLock';
import { useWallets } from '../hooks/useWallets';
import { RateLockCountdown } from './RateLockCountdown';
import { formatMoney, parseAmount, currencyMeta, formatRatePair } from '../lib/money';
import type { Currency } from '../types';
import { cn } from '@/lib/utils';

interface ConversionPanelProps {
  userId: string | null;
  initialFrom?: Currency;
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
  className?: string;
}

export function ConversionPanel({
  userId,
  initialFrom = 'NGN',
  onSuccess,
  onError,
  className,
}: ConversionPanelProps) {
  const convert = useConvert();
  const ticker = useRateTicker();
  const lock = useRateLock();
  const walletsApi = useWallets(userId);

  const [fromCurrency, setFromCurrency] = useState<Currency>(initialFrom);
  const toCurrency: Currency = fromCurrency === 'NGN' ? 'XOF' : 'NGN';
  const [amountStr, setAmountStr] = useState('');
  const amount = parseAmount(amountStr);
  const [pulse, setPulse] = useState(false);

  const fromWallet = walletsApi.walletFor(fromCurrency);
  const maxAvailable = fromWallet?.available_balance ?? 0;
  const meta = currencyMeta(fromCurrency);

  const rate = useMemo(() => {
    if (!ticker.rate) return 0;
    return fromCurrency === 'NGN' ? ticker.rate : ticker.inverseRate ?? 0;
  }, [ticker.rate, ticker.inverseRate, fromCurrency]);

  const previewMath = useMemo(() => {
    if (!rate || amount <= 0) return null;
    return convert.preview(amount, rate, fromCurrency, toCurrency);
  }, [convert, amount, rate, fromCurrency, toCurrency]);

  useEffect(() => {
    setPulse(true);
    const id = setTimeout(() => setPulse(false), 600);
    return () => clearTimeout(id);
  }, [ticker.lastUpdatedMs]);

  const flip = () => {
    setFromCurrency(toCurrency);
    setAmountStr('');
  };

  const sliderMax = maxAvailable > 0 ? maxAvailable : 1000000;
  const sliderValue = Math.min(amount, sliderMax);

  const handleLock = async () => {
    if (!userId || amount <= 0 || !rate) return;
    const res = await lock.createLock({
      userId,
      fromCurrency,
      toCurrency,
      rate,
      fromAmount: amount,
    });
    if (!res.ok) onError?.(res.error ?? 'Could not lock the rate.');
  };

  const handleConfirm = async () => {
    if (!userId || !lock.lock) return;
    const res = await convert.convert({
      userId,
      fromCurrency: lock.lock.from_currency as Currency,
      toCurrency: lock.lock.to_currency as Currency,
      fromAmount: lock.lock.from_amount ?? amount,
      rate: lock.lock.locked_rate,
      rateLockId: lock.lock.id,
    });
    if (res.ok) {
      onSuccess?.(`Converted ${formatMoney(amount, fromCurrency)} to ${toCurrency}.`);
      setAmountStr('');
      lock.clearLock();
    } else {
      onError?.(res.error ?? 'Conversion failed.');
    }
  };

  const rateLabel = rate ? formatRatePair(fromCurrency, toCurrency, rate) : 'Loading rate\u2026';

  return (
    <Card
      className={cn(
        'overflow-hidden border-[#7E8C97]/12 bg-[#161E26] p-5 sm:p-6',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#10C97E]/12">
            <Zap className="h-3.5 w-3.5 text-[#10C97E]" strokeWidth={2} />
          </span>
          <h2 className="font-display text-base font-semibold text-[#EAF1F4]">Convert</h2>
        </div>
        <motion.span
          animate={pulse ? { scale: [1, 1.04, 1], opacity: [0.7, 1, 0.7] } : {}}
          transition={{ duration: 0.6 }}
          className="font-mono text-[11px] tabular-nums text-[#7E8C97]"
        >
          {rateLabel}
        </motion.span>
      </div>

      <AnimatePresence mode="wait">
        {lock.lock && (lock.active || lock.expired) ? (
          <motion.div
            key="lock"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-5"
          >
            <RateLockCountdown
              lock={lock.lock}
              remainingSeconds={lock.remainingSeconds}
              progress={lock.progress}
              active={lock.active}
              expired={lock.expired}
              confirming={convert.converting}
              onConfirm={handleConfirm}
              onCancel={() => {
                lock.cancelLock();
              }}
              onRequote={() => {
                lock.clearLock();
                ticker.refresh();
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <div className="mt-5 space-y-3">
              <div className="rounded-lg border border-[#7E8C97]/16 bg-[#0E1419] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#7E8C97]">
                    You send
                  </span>
                  <span className="flex items-center gap-1 text-xs text-[#EAF1F4]">
                    {meta.flag} {fromCurrency}
                  </span>
                </div>
                <Input
                  inputMode="decimal"
                  placeholder="0"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="mt-1 h-12 border-0 bg-transparent px-0 font-mono text-2xl font-bold tabular-nums text-[#EAF1F4] focus-visible:ring-0"
                />
                {maxAvailable > 0 && (
                  <div className="mt-2">
                    <Slider
                      value={[sliderValue]}
                      max={sliderMax}
                      step={fromCurrency === 'XOF' ? 1 : 0.01}
                      onValueChange={(v) => setAmountStr(String(v[0]))}
                      className="[&_[role=slider]]:border-[#10C97E] [&_[role=slider]]:bg-[#10C97E] [&>span>span]:bg-[#10C97E]"
                    />
                    <button
                      type="button"
                      onClick={() => setAmountStr(String(maxAvailable))}
                      className="mt-1.5 font-mono text-[11px] tabular-nums text-[#7E8C97] transition-colors hover:text-[#10C97E]"
                    >
                      Available: {formatMoney(maxAvailable, fromCurrency)} \u00b7 Max
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={flip}
                  aria-label="Flip currencies"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#7E8C97]/20 bg-[#161E26] text-[#10C97E] transition-all duration-200 hover:rotate-180 hover:border-[#10C97E]/50"
                >
                  <ArrowDownUp className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>

              <div className="rounded-lg border border-[#7E8C97]/16 bg-[#0E1419] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#7E8C97]">
                    Recipient gets
                  </span>
                  <span className="flex items-center gap-1 text-xs text-[#EAF1F4]">
                    {currencyMeta(toCurrency).flag} {toCurrency}
                  </span>
                </div>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-[#10C97E]">
                  {previewMath
                    ? formatMoney(previewMath.netToAmount, toCurrency)
                    : formatMoney(0, toCurrency)}
                </p>
              </div>
            </div>

            {previewMath && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4"
              >
                <Separator className="bg-[#7E8C97]/12" />
                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#7E8C97]">Mid-market rate</span>
                    <span className="font-mono tabular-nums text-[#EAF1F4]">
                      {formatRatePair(fromCurrency, toCurrency, rate, 1)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-[#7E8C97]">
                      Platform fee (0.5%)
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 cursor-help text-[#7E8C97]" strokeWidth={2} />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[200px] border-[#7E8C97]/20 bg-[#161E26] text-xs text-[#EAF1F4]">
                            Transparent flat fee with no hidden spread on the rate.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </span>
                    <span className="font-mono tabular-nums text-[#F4B740]">
                      {formatMoney(previewMath.fee, fromCurrency)}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            <Button
              onClick={handleLock}
              disabled={
                !userId ||
                amount <= 0 ||
                !rate ||
                ticker.stale ||
                lock.creating ||
                (maxAvailable > 0 && amount > maxAvailable)
              }
              className="mt-5 h-12 w-full gap-2 bg-[#10C97E] font-semibold text-[#0E1419] transition-all duration-200 hover:bg-[#0fb873] disabled:opacity-50"
            >
              {lock.creating ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
              ) : (
                <Lock className="h-4 w-4" strokeWidth={2} />
              )}
              Lock rate for 30s
            </Button>
            {ticker.stale && (
              <p className="mt-2 text-center text-[11px] text-[#F4B740]">
                Rate is stale \u2014 refresh before locking.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export default ConversionPanel;
