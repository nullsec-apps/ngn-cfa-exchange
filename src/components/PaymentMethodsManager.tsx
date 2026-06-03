import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Landmark,
  Smartphone,
  Plus,
  Trash2,
  Star,
  Loader2,
  CircleAlert,
  CreditCard,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { usePaymentMethods } from '../hooks/usePaymentMethods';
import { currencyMeta } from '../lib/money';
import type { Currency, PaymentMethod, PaymentMethodType } from '../types';
import { cn } from '@/lib/utils';

interface PaymentMethodsManagerProps {
  userId: string;
  onError?: (msg: string) => void;
  onAdded?: () => void;
}

const NGN_BANKS = ['GTBank', 'Access Bank', 'Zenith Bank', 'UBA', 'First Bank', 'Kuda', 'Opay'];
const MOMO_PROVIDERS = ['Orange Money', 'MTN MoMo', 'Wave', 'Moov Money', 'Free Money'];

export function PaymentMethodsManager({ userId, onError, onAdded }: PaymentMethodsManagerProps) {
  const api = usePaymentMethods(userId);
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<PaymentMethodType>('bank_account');
  const [currency, setCurrency] = useState<Currency>('NGN');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [provider, setProvider] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  const reset = () => {
    setAccountName('');
    setAccountNumber('');
    setProvider('');
    setIsDefault(false);
    setLocalErr(null);
  };

  const providerOptions = type === 'bank_account' ? NGN_BANKS : MOMO_PROVIDERS;

  const handleAdd = async () => {
    setLocalErr(null);
    if (accountNumber.replace(/\s+/g, '').length < 4) {
      setLocalErr('Enter a valid account number.');
      return;
    }
    const res = await api.addMethod({
      userId,
      type,
      currency,
      label: provider || (type === 'bank_account' ? 'Bank account' : 'Mobile money'),
      accountName: accountName || undefined,
      accountNumber,
      provider: provider || undefined,
      isDefault,
    });
    if (res.ok) {
      reset();
      setAdding(false);
      onAdded?.();
    } else {
      onError?.(res.error ?? 'Could not add payment method.');
      setLocalErr(res.error ?? 'Could not add payment method.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-bold text-[#EAF1F4]">Payment methods</h3>
          <p className="text-xs text-[#7E8C97]">Funding &amp; payout destinations</p>
        </div>
        {!adding && (
          <Button
            onClick={() => setAdding(true)}
            className="h-9 gap-1.5 bg-[#10C97E] text-sm font-semibold text-[#0E1419] transition-all duration-200 hover:bg-[#0fb873]"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Add
          </Button>
        )}
      </div>

      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <Card className="border-[#10C97E]/25 bg-[#161E26]">
              <CardContent className="space-y-4 p-5">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setType('bank_account')}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border p-3 text-sm font-medium transition-all duration-200',
                      type === 'bank_account'
                        ? 'border-[#10C97E]/40 bg-[#10C97E]/8 text-[#EAF1F4]'
                        : 'border-[#7E8C97]/16 bg-[#0E1419] text-[#7E8C97] hover:border-[#7E8C97]/30'
                    )}
                  >
                    <Landmark className="h-4 w-4" strokeWidth={1.5} />
                    Bank account
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('mobile_money')}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border p-3 text-sm font-medium transition-all duration-200',
                      type === 'mobile_money'
                        ? 'border-[#10C97E]/40 bg-[#10C97E]/8 text-[#EAF1F4]'
                        : 'border-[#7E8C97]/16 bg-[#0E1419] text-[#7E8C97] hover:border-[#7E8C97]/30'
                    )}
                  >
                    <Smartphone className="h-4 w-4" strokeWidth={1.5} />
                    Mobile money
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-[#7E8C97]">Currency</Label>
                    <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                      <SelectTrigger className="h-11 border-[#7E8C97]/20 bg-[#0E1419] text-[#EAF1F4]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-[#7E8C97]/20 bg-[#161E26] text-[#EAF1F4]">
                        <SelectItem value="NGN">{currencyMeta('NGN').flag} NGN</SelectItem>
                        <SelectItem value="XOF">{currencyMeta('XOF').flag} XOF (CFA)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-[#7E8C97]">
                      {type === 'bank_account' ? 'Bank' : 'Provider'}
                    </Label>
                    <Select value={provider} onValueChange={setProvider}>
                      <SelectTrigger className="h-11 border-[#7E8C97]/20 bg-[#0E1419] text-[#EAF1F4]">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="border-[#7E8C97]/20 bg-[#161E26] text-[#EAF1F4]">
                        {providerOptions.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-[#7E8C97]">Account holder name</Label>
                  <Input
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Full name"
                    className="h-11 border-[#7E8C97]/20 bg-[#0E1419] text-base text-[#EAF1F4]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-[#7E8C97]">
                    {type === 'bank_account' ? 'Account number' : 'Phone number'}
                  </Label>
                  <Input
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    inputMode="numeric"
                    placeholder={type === 'bank_account' ? '0123456789' : '+225 ...'}
                    className="h-11 border-[#7E8C97]/20 bg-[#0E1419] font-mono text-base tabular-nums text-[#EAF1F4]"
                  />
                  <p className="text-[10px] text-[#7E8C97]">
                    Stored masked — full numbers never touch our database.
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-[#7E8C97]/12 bg-[#0E1419] p-3">
                  <Label className="cursor-pointer text-sm text-[#EAF1F4]">
                    Set as default for {currency}
                  </Label>
                  <Switch
                    checked={isDefault}
                    onCheckedChange={setIsDefault}
                    className="data-[state=checked]:bg-[#10C97E]"
                  />
                </div>

                {localErr && (
                  <p className="flex items-center gap-1.5 text-xs text-red-400">
                    <CircleAlert className="h-3.5 w-3.5" strokeWidth={2} />
                    {localErr}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleAdd}
                    disabled={api.saving}
                    className="h-11 flex-1 gap-2 bg-[#10C97E] font-semibold text-[#0E1419] transition-all duration-200 hover:bg-[#0fb873] disabled:opacity-50"
                  >
                    {api.saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                    ) : (
                      <Plus className="h-4 w-4" strokeWidth={2} />
                    )}
                    Save method
                  </Button>
                  <Button
                    onClick={() => {
                      reset();
                      setAdding(false);
                    }}
                    variant="outline"
                    className="h-11 border-[#7E8C97]/25 bg-transparent text-[#7E8C97] transition-all duration-200 hover:border-[#7E8C97]/45 hover:text-[#EAF1F4]"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {api.loading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg border border-[#7E8C97]/12 bg-[#161E26]"
            />
          ))}
        </div>
      ) : api.methods.length === 0 && !adding ? (
        <Card className="border-dashed border-[#7E8C97]/20 bg-[#161E26]">
          <CardContent className="flex flex-col items-center py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0E1419] text-[#7E8C97]">
              <CreditCard className="h-6 w-6" strokeWidth={1.5} />
            </span>
            <p className="mt-3 text-sm font-medium text-[#EAF1F4]">No payment methods yet</p>
            <p className="mt-1 max-w-xs text-xs text-[#7E8C97]">
              Add a bank account or mobile money wallet to fund and withdraw in seconds.
            </p>
            <Button
              onClick={() => setAdding(true)}
              className="mt-4 h-9 gap-1.5 bg-[#10C97E] text-sm font-semibold text-[#0E1419] hover:bg-[#0fb873]"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              Add method
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {api.methods.map((m) => (
              <MethodRow key={m.id} method={m} api={api} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function MethodRow({
  method,
  api,
}: {
  method: PaymentMethod;
  api: ReturnType<typeof usePaymentMethods>;
}) {
  const Icon = method.type === 'bank_account' ? Landmark : Smartphone;
  const meta = currencyMeta(method.currency);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="border-[#7E8C97]/14 bg-[#161E26] transition-colors duration-200 hover:border-[#7E8C97]/28">
        <CardContent className="flex items-center gap-3 p-3.5">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-[#0E1419] text-[#10C97E]">
            <Icon className="h-5 w-5" strokeWidth={1.5} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-[#EAF1F4]">
                {method.provider ?? method.label ?? 'Account'}
              </p>
              {method.is_default && (
                <Badge className="h-5 gap-0.5 border-[#10C97E]/30 bg-[#10C97E]/12 px-1.5 text-[10px] text-[#10C97E]">
                  <Star className="h-2.5 w-2.5 fill-current" />
                  Default
                </Badge>
              )}
            </div>
            <p className="truncate font-mono text-xs tabular-nums text-[#7E8C97]">
              {meta.flag} {method.account_number_masked ?? '••••'} ·{' '}
              {method.account_name ?? method.currency}
            </p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1">
            {!method.is_default && (
              <Button
                onClick={() => api.setDefault(method.id)}
                variant="ghost"
                size="icon"
                aria-label="Set default"
                className="h-8 w-8 text-[#7E8C97] transition-colors duration-200 hover:bg-[#0E1419] hover:text-[#F4B740]"
              >
                <Star className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove"
                  className="h-8 w-8 text-[#7E8C97] transition-colors duration-200 hover:bg-[#0E1419] hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="border-[#7E8C97]/20 bg-[#161E26] text-[#EAF1F4]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-display text-[#EAF1F4]">
                    Remove this method?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-[#7E8C97]">
                    You can add it again at any time. Pending payouts to this destination are not
                    affected.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-[#7E8C97]/25 bg-transparent text-[#7E8C97] hover:bg-[#0E1419] hover:text-[#EAF1F4]">
                    Keep
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => api.removeMethod(method.id)}
                    className="bg-red-500 text-white hover:bg-red-600"
                  >
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default PaymentMethodsManager;
