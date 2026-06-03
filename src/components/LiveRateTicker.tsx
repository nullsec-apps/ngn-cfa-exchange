import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  YAxis,
  Tooltip as RTooltip,
} from 'recharts';
import { RefreshCw, TrendingUp, TrendingDown, Wifi, WifiOff, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useRateTicker } from '../hooks/useRateTicker';
import { cn } from '@/lib/utils';

interface LiveRateTickerProps {
  compact?: boolean;
  className?: string;
}

function useElapsed(lastMs: number | null): number {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  if (lastMs == null) return 0;
  return Math.max(0, Math.round((Date.now() - lastMs) / 1000));
}

export function LiveRateTicker({ compact = false, className }: LiveRateTickerProps) {
  const ticker = useRateTicker();
  const elapsed = useElapsed(ticker.lastUpdatedMs);
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    if (ticker.lastUpdatedMs) setPulseKey((k) => k + 1);
  }, [ticker.lastUpdatedMs]);

  const rate = ticker.rate ?? 0;
  const converted = rate * 1000;

  const spark = useMemo(
    () => (ticker.sparkline ?? []).map((p) => ({ t: p.t, rate: p.rate })),
    [ticker.sparkline]
  );

  const trend = useMemo(() => {
    if (spark.length < 2) return 0;
    const first = spark[0].rate;
    const last = spark[spark.length - 1].rate;
    if (!first) return 0;
    return ((last - first) / first) * 100;
  }, [spark]);

  const positive = trend >= 0;
  const accent = positive ? '#10C97E' : '#F4B740';

  const formattedConverted = converted
    ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(
        converted
      )
    : '—';

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'relative overflow-hidden rounded-lg border border-[#7E8C97]/16 bg-[#161E26]',
        className
      )}
    >
      <AnimatePresence>
        <motion.div
          key={pulseKey}
          initial={{ opacity: 0.5, scale: 1 }}
          animate={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(120% 80% at 50% 0%, ${accent}14, transparent 70%)` }}
        />
      </AnimatePresence>

      <div
        className={cn(
          'relative flex flex-col gap-3 p-4 sm:p-5',
          compact ? '' : 'sm:flex-row sm:items-center sm:justify-between sm:gap-6'
        )}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              {!ticker.offline && (
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                  style={{ backgroundColor: accent }}
                />
              )}
              <span
                className="relative inline-flex h-2 w-2 rounded-full"
                style={{ backgroundColor: ticker.offline ? '#7E8C97' : accent }}
              />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7E8C97]">
              Live mid-market rate
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
            <span className="font-mono text-sm tabular-nums text-[#7E8C97]">1,000 NGN =</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={formattedConverted}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="font-display text-2xl font-bold tabular-nums tracking-tight text-[#EAF1F4] sm:text-3xl"
              >
                {formattedConverted}
              </motion.span>
            </AnimatePresence>
            <span className="font-mono text-sm tabular-nums text-[#7E8C97]">XOF</span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px]">
            <span className="flex items-center gap-1 text-[#7E8C97]">
              {ticker.offline ? (
                <WifiOff className="h-3 w-3" strokeWidth={2} />
              ) : (
                <Wifi className="h-3 w-3" strokeWidth={2} />
              )}
              {ticker.offline
                ? 'Offline'
                : ticker.stale
                ? 'Rate may be stale'
                : `Updated ${elapsed}s ago`}
            </span>
            <span
              className={cn(
                'flex items-center gap-1 font-mono tabular-nums',
                positive ? 'text-[#10C97E]' : 'text-[#F4B740]'
              )}
            >
              {positive ? (
                <TrendingUp className="h-3 w-3" strokeWidth={2} />
              ) : (
                <TrendingDown className="h-3 w-3" strokeWidth={2} />
              )}
              {`${positive ? '+' : ''}${trend.toFixed(2)}% 7d`}
            </span>
            <Badge
              variant="outline"
              className="h-5 gap-1 border-[#10C97E]/30 bg-[#10C97E]/10 px-1.5 text-[10px] font-medium text-[#10C97E]"
            >
              <Lock className="h-2.5 w-2.5" strokeWidth={2} />
              30s locked-rate
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-12 w-28 sm:h-14 sm:w-36">
            {spark.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={spark} margin={{ top: 4, bottom: 4, left: 0, right: 0 }}>
                  <defs>
                    <linearGradient id="rateSparkFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <YAxis domain={['dataMin', 'dataMax']} hide />
                  <RTooltip
                    cursor={false}
                    contentStyle={{
                      background: '#0E1419',
                      border: '1px solid #7E8C9733',
                      borderRadius: 8,
                      fontSize: 11,
                      padding: '4px 8px',
                    }}
                    labelStyle={{ display: 'none' }}
                    formatter={(v: number) => [`${(v * 1000).toFixed(1)} XOF`, '1,000 NGN']}
                  />
                  <Area
                    type="monotone"
                    dataKey="rate"
                    stroke={accent}
                    strokeWidth={1.5}
                    fill="url(#rateSparkFill)"
                    isAnimationActive
                    animationDuration={500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-[#7E8C97]/20">
                <span className="text-[10px] text-[#7E8C97]">building history…</span>
              </div>
            )}
          </div>

          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => ticker.refresh()}
                  disabled={ticker.loading}
                  aria-label="Refresh rate"
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-[#7E8C97]/20 bg-[#0E1419] text-[#7E8C97] transition-all duration-200 hover:border-[#10C97E]/50 hover:text-[#10C97E] disabled:opacity-50"
                >
                  <RefreshCw
                    className={cn('h-4 w-4', ticker.loading && 'animate-spin')}
                    strokeWidth={2}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Refresh live rate</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </motion.div>
  );
}

export default LiveRateTicker;
