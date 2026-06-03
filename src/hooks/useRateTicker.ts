import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchMidRate, type RateResult } from '../lib/proxy';
import { supabase, table } from '../lib/supabaseClient';
import { isRateStale, isOffline, describeError } from '../lib/failureStates';
import type { Currency, RateSnapshot } from '../types';

export interface SparkPoint {
  t: number;
  rate: number;
}

export interface UseRateTickerApi {
  rate: number | null;
  inverseRate: number | null;
  base: Currency;
  quote: Currency;
  source: string | null;
  lastUpdatedMs: number | null;
  secondsAgo: number;
  stale: boolean;
  offline: boolean;
  loading: boolean;
  pulseKey: number;
  error: string | null;
  sparkline: SparkPoint[];
  refresh: () => Promise<void>;
}

const POLL_MS = 5000;
const BASE: Currency = 'NGN';
const QUOTE: Currency = 'XOF';
const SPARK_LIMIT = 60;

/**
 * Polls the live NGN->XOF mid-market rate every 5s through the secure proxy,
 * persists each reading as a rate_snapshot for the 7-day sparkline, and exposes
 * a freshness clock + stale flag. The pulseKey increments on each successful
 * refresh so the UI can trigger a soft pulse (never a jarring numeric jump).
 */
export function useRateTicker(): UseRateTickerApi {
  const [rate, setRate] = useState<number | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [lastUpdatedMs, setLastUpdatedMs] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pulseKey, setPulseKey] = useState(0);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [offline, setOffline] = useState(isOffline());
  const [sparkline, setSparkline] = useState<SparkPoint[]>([]);
  const mounted = useRef(true);
  const lastPersist = useRef(0);

  const persistSnapshot = useCallback(async (result: RateResult) => {
    // Throttle persistence to ~once / 30s to avoid flooding the table.
    const now = Date.now();
    if (now - lastPersist.current < 30_000) return;
    lastPersist.current = now;
    try {
      await supabase.from(table('rate_snapshots')).insert({
        base_currency: result.base,
        quote_currency: result.quote,
        mid_rate: result.rate,
        source: result.source,
        raw: null,
      });
    } catch {
      /* snapshot persistence is best-effort */
    }
  }, []);

  const refresh = useCallback(async () => {
    if (isOffline()) {
      setOffline(true);
      return;
    }
    setOffline(false);
    try {
      const result = await fetchMidRate(BASE, QUOTE);
      if (!mounted.current) return;
      setRate(result.rate);
      setSource(result.source);
      setLastUpdatedMs(result.fetchedAt);
      setSecondsAgo(0);
      setPulseKey((k) => k + 1);
      setError(null);
      setSparkline((prev) => {
        const next = [...prev, { t: result.fetchedAt, rate: result.rate }];
        return next.slice(-SPARK_LIMIT);
      });
      persistSnapshot(result);
    } catch (e) {
      if (mounted.current) setError(describeError(e));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [persistSnapshot]);

  // Seed sparkline from historical snapshots (7 days), then start polling.
  useEffect(() => {
    mounted.current = true;

    (async () => {
      try {
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data } = await supabase
          .from(table('rate_snapshots'))
          .select('*')
          .eq('base_currency', BASE)
          .eq('quote_currency', QUOTE)
          .gte('created_at', since)
          .order('created_at', { ascending: true })
          .limit(SPARK_LIMIT);
        if (data && mounted.current) {
          const points = (data as RateSnapshot[]).map((s) => ({
            t: new Date(s.created_at).getTime(),
            rate: Number(s.mid_rate),
          }));
          setSparkline(points);
        }
      } catch {
        /* historical seed is optional */
      }
    })();

    refresh();
    const poll = setInterval(refresh, POLL_MS);
    const tick = setInterval(() => {
      setLastUpdatedMs((ms) => {
        if (ms != null) setSecondsAgo(Math.max(0, Math.round((Date.now() - ms) / 1000)));
        return ms;
      });
    }, 1000);

    const onOnline = () => {
      setOffline(false);
      refresh();
    };
    const onOffline = () => setOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      mounted.current = false;
      clearInterval(poll);
      clearInterval(tick);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [refresh]);

  const stale = isRateStale(lastUpdatedMs);
  const inverseRate = rate && rate > 0 ? 1 / rate : null;

  return {
    rate,
    inverseRate,
    base: BASE,
    quote: QUOTE,
    source,
    lastUpdatedMs,
    secondsAgo,
    stale,
    offline,
    loading,
    pulseKey,
    error,
    sparkline,
    refresh,
  };
}
