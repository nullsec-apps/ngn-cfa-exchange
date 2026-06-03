import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Landmark,
  Smartphone,
  ShieldAlert,
  Plus,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useWithdraw } from '../hooks/useWithdraw';
import { usePaymentMethods } from '../hooks/usePaymentMethods';
import { useWallets } from '../hooks/useWallets';
import { formatMoney, parseAmount, currencyMeta } from '../lib/money';
import type { Currency, KycStatus } from '../types';
import { cn } from '@/lib/utils';

interface WithdrawSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  kycStatus?: KycStatus;
  defaultCurrency?: Currency;
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
  onManageMethods?: () => void;
  onVerify?: () => void;
}

export function WithdrawSheet({
  open,
  onOpenChange,
  userId,
  kycStatus = 'unverified',
  defaultCurrency = 'NGN',
  onSuccess,
  onError,
  onManageMethods,
  onVerify,
}: WithdrawSheetProps) {
  const wd = useWithdraw();
  const methodsApi = usePaymentMethods(userId);
  const walletsApi = useWallets(userId);

  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [amountStr, setAmountStr] = useState('');
  const [methodId, setMethodId] = useState<string>('');
  const [done, setDone] = useState(false);

  const amount = parseAmount(amountStr);
  const meta = currencyMeta(currency);
  const wallet = walletsApi.walletFor(currency);
  const verified = kycStatus === 'verified';

  const methods = useMemo(
    () => methodsApi.methods.filter((m) => m.currency === currency && m.status === 'active'),
    [methodsApi.methods, currency]
  );

  useEffect(() => {
    if (open) {
      setCurrency(defaultCurrency);
      setAmountStr('');
      setDone(false);
    }
  }, [open, defaultCurrency]);

  useEffect(() => {
    if (methods.length > 0) {
      const def = methods.find((m) => m.is_default) ?? methods[0];
      setMethodId(def.id);
    } else {
      setMethodId('');
    }
  }, [methods]);

  const preview = wallet ? wd.preview(wallet, amount) : null;
  const selectedMethod = methods.find((m) => m.id === methodId);
  const insufficient = preview ? amount > 0 && !preview.sufficient : false;

  const canSubmit =
    verified &&
    !!wallet &&
    amount > 0 &&
    !!selectedMethod &&
    !!preview?.sufficient &&
    !wd.withdrawing;

  const handleWithdraw = async () => {
    if (!userId || !wallet || !selectedMethod) return;
    const res = await wd.withdraw({ userId, wallet, amount, method: selectedMethod });
    if (res.ok) {
      setDone(true);
      onSuccess?.(`Withdrawal of ${formatMoney(amount, currency)} initiated.`);
    } else {
      onError?.(res.error ?? 'Withdrawal failed.');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto border-[#7E8C97]/15 bg-[#0E1419] p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-[#7E8C97]/12 px-6 py-5">
          <SheetTitle className="font-display text-lg text-[#EAF1F4]">Withdraw funds</SheetTitle>
        </SheetHeader>

        <div className="px-6 py-6">
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center px-2 py-10 text-center"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#10C97E]/15">
                  <CheckCircle2 className="h-8 w-8 text-[#10C97E]" strokeWidth={1.5} />
                </span>
                <p className="mt-4 font-display text-lg font-semibold text-[#EAF1F4]">
                  Withdrawal initiated
                </p>
                <p className="mt-1 max-w-xs text-sm leading-relaxed text-[#7E8C97]">
                  {formatMoney(amount, currency)} is on its way to {selectedMethod?.label ?? 'your account'}.
                  Track it in your history.
                </p>
                <Button
                  onClick={() => onOpenChange(false)}
                  className="mt-6 h-11 w-full bg-[#10C97E] font-semibold text-[#0E1419] hover:bg-[#0fb873]"
                >
                  Done
                </Button>
              </motion.div>
            ) : !verified ? (
              <motion.div key="kyc" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Alert className="border-[#F4B740]/30 bg-[#F4B740]/[0.06]">
                  <ShieldAlert className="h-4 w-4 text-[#F4B740]" />
                  <AlertTitle className="font-display text-[#EAF1F4]">
                    Verification required
                  </AlertTitle>
                  <AlertDescription className="text-[#7E8C97]">
                    Complete identity verification to withdraw funds to your bank or mobile money.
                  </AlertDescription>
                </Alert>
                <Button
                  onClick={() => {
                    onOpenChange(false);
                    onVerify?.();
                  }}
                  className="mt-4 h-11 w-full bg-[#10C97E] font-semibold text-[#0E1419] hover:bg-[#0fb873]"
                >
                  Verify identity
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                <div>
                  <Label className="text-xs font-medium uppercase tracking-wide text-[#7E8C97]">
                    From wallet
                  </Label>
                  <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                    <SelectTrigger className="mt-1.5 h-12 border-[#7E8C97]/20 bg-[#161E26] text-base text-[#EAF1F4]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-[#7E8C97]/20 bg-[#161E26] text-[#EAF1F4]">
                      {(['NGN', 'XOF'] as Currency[]).map((c) => {
                        const m = currencyMeta(c);
                        const w = walletsApi.walletFor(c);
                        return (
                          <SelectItem key={c} value={c} className="focus:bg-[#0E1419]">
                            <span className="flex items-center gap-2">
                              {m.flag} {c}
                              <span className="font-mono text-xs tabular-nums text-[#7E8C97]">
                                {formatMoney(w?.available_balance ?? 0, c)}
                              </span>
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {wallet && (
                    <p className="mt-1.5 font-mono text-xs tabular-nums text-[#7E8C97]">
                      Available: {formatMoney(wallet.available_balance ?? 0, currency)}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-xs font-medium uppercase tracking-wide text-[#7E8C97]">
                    Amount
                  </Label>
                  <Input
                    inputMode="decimal"
                    placeholder="0"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="mt-1.5 h-14 border-[#7E8C97]/20 bg-[#161E26] font-mono text-2xl tabular-nums text-[#EAF1F4]"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[0.25, 0.5, 1].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() =>
                          wallet &&
                          setAmountStr(
                            String(
                              Math.max((wallet.available_balance ?? 0) * pct - (pct === 1 ? 0.01 : 0), 0)
                            )
                          )
                        }
                        className="rounded-md border border-[#7E8C97]/20 bg-[#161E26] px-3 py-1.5 font-mono text-xs tabular-nums text-[#7E8C97] transition-all duration-200 hover:border-[#10C97E]/50 hover:text-[#EAF1F4]"
                      >
                        {pct === 1 ? 'Max' : `${pct * 100}%`}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium uppercase tracking-wide text-[#7E8C97]">
                      Payout destination
                    </Label>
                    <button
                      type="button"
                      onClick={() => {
                        onOpenChange(false);
                        onManageMethods?.();
                      }}
                      className="flex items-center gap-1 text-xs font-medium text-[#10C97E] transition-colors hover:underline"
                    >
                      <Plus className="h-3 w-3" strokeWidth={2} />
                      Add
                    </button>
                  </div>
                  {methods.length === 0 ? (
                    <div className="mt-1.5 rounded-lg border border-dashed border-[#7E8C97]/25 bg-[#161E26] p-4 text-center">
                      <p className="text-sm text-[#7E8C97]">
                        No {currency} destinations yet.
                      </p>
                      <Button
                        onClick={() => {
                          onOpenChange(false);
                          onManageMethods?.();
                        }}
                        variant="outline"
                        className="mt-3 h-9 gap-1.5 border-[#7E8C97]/25 bg-transparent text-sm text-[#EAF1F4] hover:border-[#10C97E]/40"
                      >
                        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                        Add a payout method
                      </Button>
                    </div>
                  ) : (
                    <RadioGroup value={methodId} onValueChange={setMethodId} className="mt-1.5 space-y-2">
                      {methods.map((m) => {
                        const Icon = m.type === 'bank_account' ? Landmark : Smartphone;
                        return (
                          <label
                            key={m.id}
                            className={cn(
                              'flex cursor-pointer items-center gap-3 rounded-lg border bg-[#161E26] p-3 transition-all duration-200',
                              methodId === m.id
                                ? 'border-[#10C97E]/45 bg-[#10C97E]/[0.06]'
                                : 'border-[#7E8C97]/15 hover:border-[#7E8C97]/30'
                            )}
                          >
                            <RadioGroupItem
                              value={m.id}
                              className="border-[#7E8C97]/40 text-[#10C97E]"
                            />
                            <Icon className="h-4 w-4 text-[#7E8C97]" strokeWidth={2} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-[#EAF1F4]">
                                {m.label ?? m.provider}
                              </p>
                              <p className="truncate font-mono text-xs tabular-nums text-[#7E8C97]">
                                {m.account_number_masked}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </RadioGroup>
                  )}
                </div>

                {preview && amount > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Separator className="bg-[#7E8C97]/12" />
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[#7E8C97]">Amount</span>
                        <span className="font-mono tabular-nums text-[#EAF1F4]">
                          {formatMoney(preview.amount, currency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#7E8C97]">Fee</span>
                        <span className="font-mono tabular-nums text-[#F4B740]">
                          {formatMoney(preview.fee, currency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-t border-[#7E8C97]/12 pt-2">
                        <span className="font-medium text-[#EAF1F4]">Total deducted</span>
                        <span className="font-mono font-semibold tabular-nums text-[#EAF1F4]">
                          {formatMoney(preview.total, currency)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {insufficient && (
                  <Alert className="border-red-500/30 bg-red-500/[0.06]">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <AlertTitle className="font-display text-[#EAF1F4]">
                      Insufficient balance
                    </AlertTitle>
                    <AlertDescription className="text-[#7E8C97]">
                      Your available {currency} balance is too low for this amount including fees.
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleWithdraw}
                  disabled={!canSubmit}
                  className="h-12 w-full gap-2 bg-[#10C97E] font-semibold text-[#0E1419] transition-all duration-200 hover:bg-[#0fb873] disabled:opacity-50"
                >
                  {wd.withdrawing ? (
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                  ) : null}
                  {wd.withdrawing
                    ? 'Processing\u2026'
                    : amount > 0
                    ? `Withdraw ${formatMoney(amount, currency)}`
                    : 'Withdraw'}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default WithdrawSheet;
