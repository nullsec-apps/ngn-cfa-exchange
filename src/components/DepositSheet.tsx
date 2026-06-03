import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Plus, CheckCircle2, AlertTriangle, Landmark, Smartphone } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { useDeposit } from '../hooks/useDeposit';
import { usePaymentMethods } from '../hooks/usePaymentMethods';
import { useWallets } from '../hooks/useWallets';
import { formatMoney, parseAmount, currencyMeta } from '../lib/money';
import type { Currency, PaymentMethod } from '../types';
import { cn } from '@/lib/utils';

interface DepositSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  defaultCurrency?: Currency;
  onSuccess?: () => void;
  onError?: (msg: string, code?: string) => void;
}

export function DepositSheet({ open, onOpenChange, userId, defaultCurrency = 'NGN', onSuccess, onError }: DepositSheetProps) {
  const deposit = useDeposit();
  const methodsApi = usePaymentMethods(userId);
  const walletsApi = useWallets(userId);
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [amountStr, setAmountStr] = useState('');
  const [methodId, setMethodId] = useState<string>('');
  const [done, setDone] = useState<{ ref: string } | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCurrency(defaultCurrency);
      setAmountStr('');
      setDone(null);
      setLocalError(null);
    }
  }, [open, defaultCurrency]);

  const methods = useMemo(
    () => methodsApi.byCurrency(currency).filter((m) => m.status === 'active'),
    [methodsApi, currency]
  );

  useEffect(() => {
    const def = methods.find((m) => m.is_default) ?? methods[0];
    setMethodId(def?.id ?? '');
  }, [methods]);

  const amount = parseAmount(amountStr);
  const meta = currencyMeta(currency);
  const wallet = walletsApi.walletFor(currency);
  const selectedMethod = methods.find((m) => m.id === methodId);
  const canSubmit = amount > 0 && !deposit.depositing;

  const handleDeposit = async () => {
    setLocalError(null);
    deposit.clearError();
    if (!wallet) {
      setLocalError('Wallet not ready yet. Try again in a moment.');
      return;
    }
    const res = await deposit.deposit({
      userId,
      currency,
      amount,
      walletId: wallet.id,
      method: selectedMethod as PaymentMethod | undefined,
    });
    if (res.ok) {
      setDone({ ref: res.transaction?.reference ?? '' });
      onSuccess?.();
    } else {
      setLocalError(res.error ?? 'Deposit failed.');
      onError?.(res.error ?? 'Deposit failed.', res.code);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-[#161E26] border-l border-[#7E8C97]/16 text-[#EAF1F4] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-xl tracking-tight text-[#EAF1F4]">Fund wallet</SheetTitle>
        </SheetHeader>

        <AnimatePresence mode="wait">
          {done ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-10 flex flex-col items-center text-center px-2"
            >
              <div className="w-14 h-14 rounded-full bg-[#10C97E]/12 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-[#10C97E]" strokeWidth={2} />
              </div>
              <h3 className="mt-4 font-display font-semibold text-lg">Deposit initiated</h3>
              <p className="mt-1 text-sm text-[#7E8C97]">Your funds are processing. We'll update your balance shortly.</p>
              {done.ref && (
                <p className="mt-3 font-mono text-xs text-[#7E8C97]">Ref: <span className="text-[#EAF1F4]">{done.ref}</span></p>
              )}
              <Button onClick={() => onOpenChange(false)} className="mt-6 w-full h-12 bg-[#10C97E] hover:bg-[#0fb873] text-[#0E1419] font-semibold">
                Done
              </Button>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 space-y-5">
              {/* Currency */}
              <div className="space-y-2">
                <Label className="text-xs text-[#7E8C97]">Wallet</Label>
                <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                  <SelectTrigger className="h-12 bg-[#0E1419] border-[#7E8C97]/20 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#161E26] border-[#7E8C97]/20 text-[#EAF1F4]">
                    <SelectItem value="NGN">{currencyMeta('NGN').flag} Nigerian Naira (NGN)</SelectItem>
                    <SelectItem value="XOF">{currencyMeta('XOF').flag} West African CFA (XOF)</SelectItem>
                  </SelectContent>
                </Select>
                {wallet && (
                  <p className="text-xs text-[#7E8C97]">
                    Balance: <span className="font-mono tabular-nums text-[#EAF1F4]">{formatMoney(wallet.available_balance ?? 0, currency)}</span>
                  </p>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="dep-amount" className="text-xs text-[#7E8C97]">Amount ({meta.symbol})</Label>
                <Input
                  id="dep-amount"
                  inputMode="decimal"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0"
                  className="h-14 bg-[#0E1419] border-[#7E8C97]/20 text-[#EAF1F4] font-mono tabular-nums text-2xl"
                />
                <div className="flex flex-wrap gap-2 pt-1">
                  {[5000, 10000, 50000, 100000].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setAmountStr(String(q))}
                      className="px-3 py-1.5 rounded-md text-xs font-mono tabular-nums bg-[#0E1419] border border-[#7E8C97]/20 text-[#7E8C97] hover:border-[#10C97E]/50 hover:text-[#EAF1F4] transition-all duration-200"
                    >
                      +{q.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <Separator className="bg-[#7E8C97]/12" />

              {/* Payment method */}
              <div className="space-y-2">
                <Label className="text-xs text-[#7E8C97]">Funding source</Label>
                {methodsApi.loading ? (
                  <div className="h-12 rounded-md bg-[#0E1419] animate-pulse" />
                ) : methods.length === 0 ? (
                  <div className="rounded-md border border-dashed border-[#7E8C97]/30 p-4 text-center">
                    <p className="text-sm text-[#7E8C97]">No {meta.code} payment method yet.</p>
                    <p className="text-xs text-[#7E8C97]/70 mt-1">Add one in Profile → Payment methods. You can still simulate funding.</p>
                  </div>
                ) : (
                  <RadioGroup value={methodId} onValueChange={setMethodId} className="space-y-2">
                    {methods.map((m) => (
                      <label
                        key={m.id}
                        htmlFor={`pm-${m.id}`}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-all duration-200',
                          methodId === m.id
                            ? 'border-[#10C97E]/60 bg-[#10C97E]/8'
                            : 'border-[#7E8C97]/16 hover:border-[#7E8C97]/40'
                        )}
                      >
                        <RadioGroupItem value={m.id} id={`pm-${m.id}`} className="border-[#7E8C97]/50 text-[#10C97E]" />
                        {m.type === 'mobile_money' ? (
                          <Smartphone className="w-4 h-4 text-[#7E8C97]" strokeWidth={1.5} />
                        ) : (
                          <Landmark className="w-4 h-4 text-[#7E8C97]" strokeWidth={1.5} />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm truncate">{m.label ?? m.account_name ?? m.provider ?? 'Account'}</p>
                          <p className="font-mono text-xs text-[#7E8C97] truncate">{m.account_number_masked ?? m.provider}</p>
                        </div>
                      </label>
                    ))}
                  </RadioGroup>
                )}
              </div>

              {localError && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2 rounded-md bg-red-500/8 border border-red-500/30 p-3">
                  <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" strokeWidth={2} />
                  <p className="text-sm text-red-400">{localError}</p>
                </motion.div>
              )}

              <Button
                onClick={handleDeposit}
                disabled={!canSubmit}
                className="w-full h-12 bg-[#10C97E] hover:bg-[#0fb873] text-[#0E1419] font-semibold text-base transition-all duration-200 disabled:opacity-50"
              >
                {deposit.depositing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1" strokeWidth={2} />
                    Fund {amount > 0 ? formatMoney(amount, currency) : 'wallet'}
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}
