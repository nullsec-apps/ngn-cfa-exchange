import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Search,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowDownUp,
  Send,
  Lock,
  ShieldAlert,
  UserRound,
} from 'lucide-react';
import { useTransfer } from '../hooks/useTransfer';
import { useRateTicker } from '../hooks/useRateTicker';
import { useRateLock } from '../hooks/useRateLock';
import { useWallets } from '../hooks/useWallets';
import { RateLockCountdown } from './RateLockCountdown';
import { TransferStatusStepper } from './TransferStatusStepper';
import {
  formatMoney,
  parseAmount,
  currencyMeta,
  computeConversion,
  formatRatePair,
} from '../lib/money';
import type { Currency, KycStatus, Profile, TransactionStatus } from '../types';
import { cn } from '@/lib/utils';

interface TransferSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  kycStatus?: KycStatus;
  defaultCurrency?: Currency;
  onVerify?: () => void;
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
}

export function TransferSheet({
  open,
  onOpenChange,
  userId,
  kycStatus = 'unverified',
  defaultCurrency = 'NGN',
  onVerify,
  onSuccess,
  onError,
}: TransferSheetProps) {
  const transferApi = useTransfer();
  const ticker = useRateTicker();
  const lock = useRateLock();
  const walletsApi = useWallets(userId);

  const [query, setQuery] = useState('');
  const [recipient, setRecipient] = useState<Profile | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [fromCurrency, setFromCurrency] = useState<Currency>(defaultCurrency);
  const [toCurrency, setToCurrency] = useState<Currency>(
    defaultCurrency === 'NGN' ? 'XOF' : 'NGN'
  );
  const [amountStr, setAmountStr] = useState('');
  const [phase, setPhase] = useState<'form' | 'locking' | 'done'>('form');
  const [doneStatus, setDoneStatus] = useState<TransactionStatus>('delivered');

  const verified = kycStatus === 'verified';
  const amount = parseAmount(amountStr);
  const fromWallet = walletsApi.walletFor(fromCurrency);
  const maxAvailable = fromWallet?.available_balance ?? 0;
  const meta = currencyMeta(fromCurrency);
  const crossCurrency = fromCurrency !== toCurrency;

  const rate = useMemo(() => {
    if (!crossCurrency) return 1;
    if (!ticker.rate) return null;
    return fromCurrency === 'NGN' ? ticker.rate : 1 / ticker.rate;
  }, [crossCurrency, ticker.rate, fromCurrency]);

  const preview = useMemo(() => {
    if (amount <= 0) return null;
    if (crossCurrency) {
      if (!rate) return null;
      return computeConversion(amount, rate, fromCurrency, toCurrency);
    }
    return {
      fromAmount: amount,
      toAmount: amount,
      netToAmount: amount,
      fee: 0,
      feeCurrency: fromCurrency,
      rate: 1,
    };
  }, [amount, crossCurrency, rate, fromCurrency, toCurrency]);

  const insufficient = amount > 0 && amount > maxAvailable;
  const canLook = query.trim().length > 2 && !transferApi.looking;
  const canSubmit =
    verified &&
    !!recipient &&
    amount > 0 &&
    !insufficient &&
    !transferApi.submitting &&
    (!crossCurrency ? true : !!rate);

  useEffect(() => {
    if (open) {
      setQuery('');
      setRecipient(null);
      setLookupError(null);
      setAmountStr('');
      setPhase('form');
      setFromCurrency(defaultCurrency);
      setToCurrency(defaultCurrency === 'NGN' ? 'XOF' : 'NGN');
      lock.clearLock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultCurrency]);

  const handleLookup = async () => {
    setLookupError(null);
    setRecipient(null);
    const res = await transferApi.lookupRecipient(query.trim());
    if (res.found && res.profile) {
      setRecipient(res.profile);
      // Default the recipient currency to NGN/XOF that's not the sender's pick.
    } else {
      setLookupError(res.error || 'No account matches that.');
    }
  };

  const flip = () => {
    setFromCurrency((c) => (c === 'NGN' ? 'XOF' : 'NGN'));
    setToCurrency((c) => (c === 'NGN' ? 'XOF' : 'NGN'));
  };

  const handleLock = async () => {
    if (!userId || !preview || !rate) return;
    setPhase('locking');
    const res = await lock.createLock({
      userId,
      fromCurrency,
      toCurrency,
      rate,
      fromAmount: amount,
    });
    if (!res.ok) {
      setPhase('form');
      onError?.(res.error || 'Could not lock rate.');
    }
  };

  const handleConfirm = async () => {
    if (!userId || !recipient || !preview) return;
    const res = await transferApi.transfer({
      userId,
      recipientUserId: recipient.user_id,
      fromCurrency,
      toCurrency,
      fromAmount: amount,
      rate: rate ?? 1,
      rateLockId: lock.lock?.id ?? null,
      fromWallet,
    });
    if (res.ok) {
      setDoneStatus(res.transaction?.status ?? 'delivered');
      setPhase('done');
      onSuccess?.(
        `Sent ${formatMoney(preview.netToAmount, toCurrency)} ${toCurrency} to ${
          recipient.full_name || recipient.phone || recipient.email || 'recipient'
        }.`
      );
      walletsApi.clearError?.();
    } else {
      lock.clearLock();
      setPhase('form');
      onError?.(res.error || 'Transfer failed.');
    }
  };

  const recipientLabel =
    recipient?.full_name || recipient?.phone || recipient?.email || 'Recipient';
  const recipientInitials = recipientLabel
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-y-auto border-[#7E8C97]/15 bg-[#0E1419] p-0 sm:max-w-md">
        <SheetHeader className="border-b border-[#7E8C97]/12 px-5 py-4 text-left">
          <SheetTitle className="flex items-center gap-2 font-display text-base font-bold text-[#EAF1F4]">
            <Send className="h-4 w-4 text-[#10C97E]" strokeWidth={2} />
            Send across the border
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 px-5 py-5">
          <AnimatePresence mode="wait">
            {/* DONE */}
            {phase === 'done' ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center text-center"
              >
                <motion.span
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-[#10C97E]/15"
                >
                  <CheckCircle2 className="h-7 w-7 text-[#10C97E]" strokeWidth={2} />
                </motion.span>
                <h3 className="mt-4 font-display text-lg font-bold text-[#EAF1F4]">
                  Transfer on its way
                </h3>
                <p className="mt-1 text-sm text-[#7E8C97]">
                  {recipientLabel} receives{' '}
                  <span className="font-mono tabular-nums text-[#EAF1F4]">
                    {preview ? formatMoney(preview.netToAmount, toCurrency) : ''} {toCurrency}
                  </span>
                </p>
                <div className="mt-6 w-full rounded-lg border border-[#7E8C97]/12 bg-[#161E26] p-4">
                  <TransferStatusStepper status={doneStatus} />
                </div>
                <Button
                  onClick={() => onOpenChange(false)}
                  className="mt-6 h-11 w-full bg-[#10C97E] font-semibold text-[#0E1419] transition-all duration-200 hover:bg-[#0fb873]"
                >
                  Done
                </Button>
              </motion.div>
            ) : !verified ? (
              /* KYC GATE */
              <motion.div
                key="gate"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center px-2 py-10 text-center"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F4B740]/12">
                  <ShieldAlert className="h-7 w-7 text-[#F4B740]" strokeWidth={1.75} />
                </span>
                <h3 className="mt-4 font-display text-lg font-bold text-[#EAF1F4]">
                  Verify to send money
                </h3>
                <p className="mt-1 max-w-xs text-sm text-[#7E8C97]">
                  Cross-border transfers require identity verification to keep your
                  funds secure.
                </p>
                <Button
                  onClick={() => {
                    onOpenChange(false);
                    onVerify?.();
                  }}
                  className="mt-6 h-11 w-full bg-[#10C97E] font-semibold text-[#0E1419] transition-all duration-200 hover:bg-[#0fb873]"
                >
                  Verify identity
                </Button>
              </motion.div>
            ) : (
              /* FORM */
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-5"
              >
                {/* Recipient lookup */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#7E8C97]">Recipient (phone or email)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setRecipient(null);
                        setLookupError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && canLook) handleLookup();
                      }}
                      placeholder="+234 \u2026 or name@email.com"
                      className="h-12 flex-1 border-[#7E8C97]/20 bg-[#161E26] text-base text-[#EAF1F4] transition-colors duration-200 focus-visible:border-[#10C97E]/50"
                    />
                    <Button
                      onClick={handleLookup}
                      disabled={!canLook}
                      className="h-12 w-12 flex-shrink-0 bg-[#10C97E] p-0 text-[#0E1419] transition-all duration-200 hover:bg-[#0fb873] disabled:opacity-40"
                      aria-label="Find recipient"
                    >
                      {transferApi.looking ? (
                        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                      ) : (
                        <Search className="h-4 w-4" strokeWidth={2} />
                      )}
                    </Button>
                  </div>
                  {lookupError && (
                    <p className="flex items-center gap-1.5 text-xs text-[#F4B740]">
                      <AlertTriangle className="h-3 w-3" strokeWidth={2} /> {lookupError}
                    </p>
                  )}
                </div>

                {/* Recipient chip */}
                <AnimatePresence>
                  {recipient && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-3 rounded-lg border border-[#10C97E]/25 bg-[#10C97E]/[0.06] p-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#10C97E]/15 text-xs font-semibold text-[#10C97E]">
                          {recipientInitials || <UserRound className="h-4 w-4" />}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[#EAF1F4]">
                            {recipientLabel}
                          </p>
                          {recipient.country && (
                            <p className="truncate text-xs text-[#7E8C97]">{recipient.country}</p>
                          )}
                        </div>
                        <CheckCircle2 className="ml-auto h-4 w-4 flex-shrink-0 text-[#10C97E]" strokeWidth={2} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Amount + currencies */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-[#7E8C97]">You send ({fromCurrency})</Label>
                    <span className="font-mono text-[11px] tabular-nums text-[#7E8C97]">
                      Avail {formatMoney(maxAvailable, fromCurrency)}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-[#7E8C97]">
                      {meta.symbol}
                    </span>
                    <Input
                      value={amountStr}
                      onChange={(e) => setAmountStr(e.target.value)}
                      inputMode="decimal"
                      placeholder="0"
                      className={cn(
                        'h-14 border-[#7E8C97]/20 bg-[#161E26] pl-10 font-mono text-2xl tabular-nums text-[#EAF1F4] transition-colors duration-200 focus-visible:border-[#10C97E]/50',
                        insufficient && 'border-red-500/50'
                      )}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[0.25, 0.5, 1].map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setAmountStr(String(Math.floor(maxAvailable * f)))}
                        disabled={maxAvailable <= 0}
                        className="rounded-md border border-[#7E8C97]/20 bg-[#161E26] px-3 py-1.5 font-mono text-xs tabular-nums text-[#7E8C97] transition-all duration-200 hover:border-[#10C97E]/50 hover:text-[#EAF1F4] disabled:opacity-40"
                      >
                        {f === 1 ? 'Max' : `${f * 100}%`}
                      </button>
                    ))}
                  </div>

                  {/* Flip / currency swap */}
                  <div className="flex items-center justify-center py-1">
                    <button
                      type="button"
                      onClick={flip}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-[#7E8C97]/20 bg-[#161E26] text-[#10C97E] transition-all duration-200 hover:rotate-180 hover:border-[#10C97E]/50"
                      aria-label="Swap currencies"
                    >
                      <ArrowDownUp className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </div>

                  <div className="rounded-lg border border-[#7E8C97]/12 bg-[#161E26] p-3.5">
                    <p className="text-xs text-[#7E8C97]">
                      Recipient gets ({toCurrency})
                    </p>
                    <p className="mt-0.5 font-mono text-xl font-bold tabular-nums text-[#10C97E]">
                      {preview ? formatMoney(preview.netToAmount, toCurrency) : '\u2014'}
                    </p>
                    {crossCurrency && rate && (
                      <p className="mt-1 font-mono text-[11px] tabular-nums text-[#7E8C97]">
                        {formatRatePair(fromCurrency, toCurrency, rate)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Fee + insufficient */}
                {preview && (
                  <div className="space-y-1.5">
                    <Separator className="bg-[#7E8C97]/12" />
                    {preview.fee > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#7E8C97]">Fee</span>
                        <span className="font-mono tabular-nums text-[#EAF1F4]">
                          {formatMoney(preview.fee, preview.feeCurrency)} {preview.feeCurrency}
                        </span>
                      </div>
                    )}
                    {crossCurrency && (
                      <p className="flex items-center gap-1.5 text-[11px] text-[#7E8C97]">
                        <Lock className="h-3 w-3 text-[#10C97E]" strokeWidth={2} />
                        Mid-market rate \u00b7 30s lock guarantee
                      </p>
                    )}
                  </div>
                )}

                {insufficient && (
                  <Alert className="border-red-500/30 bg-red-500/10">
                    <AlertTriangle className="h-4 w-4 text-red-400" strokeWidth={2} />
                    <AlertTitle className="text-sm text-red-400">Insufficient funds</AlertTitle>
                    <AlertDescription className="text-xs text-[#7E8C97]">
                      Your available {fromCurrency} balance is too low for this amount
                      including fees.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Rate lock countdown when active */}
                <AnimatePresence>
                  {(lock.active || lock.expired) && crossCurrency && lock.lock && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <RateLockCountdown
                        lock={lock.lock}
                        remainingSeconds={lock.remainingSeconds}
                        progress={lock.progress}
                        active={lock.active}
                        expired={lock.expired}
                        confirming={transferApi.submitting}
                        onConfirm={handleConfirm}
                        onCancel={() => {
                          lock.cancelLock();
                          setPhase('form');
                        }}
                        onRequote={() => {
                          lock.clearLock();
                          setPhase('form');
                          handleLock();
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Primary CTA */}
                {!(lock.active || lock.expired) && (
                  <Button
                    onClick={crossCurrency ? handleLock : handleConfirm}
                    disabled={!canSubmit || phase === 'locking'}
                    className="h-12 w-full gap-2 bg-[#10C97E] font-semibold text-[#0E1419] transition-all duration-200 hover:bg-[#0fb873] disabled:opacity-50"
                  >
                    {transferApi.submitting || phase === 'locking' ? (
                      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                    ) : crossCurrency ? (
                      <Lock className="h-4 w-4" strokeWidth={2} />
                    ) : (
                      <Send className="h-4 w-4" strokeWidth={2} />
                    )}
                    {crossCurrency ? 'Lock rate & send' : 'Send transfer'}
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default TransferSheet;
