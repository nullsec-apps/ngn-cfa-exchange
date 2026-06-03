import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  Globe2,
  ShieldCheck,
  Bell,
  LogOut,
  Loader2,
  Check,
  CreditCard,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useProfile } from '../hooks/useProfile';
import { KycStatusBadge } from './KycStatusBadge';
import { PaymentMethodsManager } from './PaymentMethodsManager';
import type { KycStatus } from '../types';
import { cn } from '@/lib/utils';

interface ProfilePanelProps {
  userId: string | null;
  email?: string | null;
  fullName?: string | null;
  kycStatus?: KycStatus;
  onVerify?: () => void;
  onSignOut?: () => void;
  onError?: (msg: string) => void;
  onSaved?: () => void;
}

const COUNTRIES = [
  'Nigeria',
  '\u00C7\u00F4te d\u2019Ivoire',
  'Senegal',
  'Mali',
  'Burkina Faso',
  'Benin',
  'Togo',
  'Niger',
  'Guinea-Bissau',
];

export function ProfilePanel({
  userId,
  email,
  fullName,
  kycStatus = 'unverified',
  onVerify,
  onSignOut,
  onError,
  onSaved,
}: ProfilePanelProps) {
  const { profile, loading, saving, error, update } = useProfile(userId, email, fullName);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [alerts, setAlerts] = useState(true);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.full_name ?? '');
      setPhone(profile.phone ?? '');
      setCountry(profile.country ?? '');
    }
  }, [profile]);

  useEffect(() => {
    if (error) onError?.(error);
  }, [error, onError]);

  const status: KycStatus = profile?.kyc_status ?? kycStatus;
  const dirty =
    profile &&
    (name !== (profile.full_name ?? '') ||
      phone !== (profile.phone ?? '') ||
      country !== (profile.country ?? ''));

  const handleSave = async () => {
    const res = await update({
      full_name: name.trim() || null,
      phone: phone.trim() || null,
      country: country || null,
    });
    if (res.ok) {
      setJustSaved(true);
      onSaved?.();
      setTimeout(() => setJustSaved(false), 2000);
    } else if (res.error) {
      onError?.(res.error);
    }
  };

  const initials =
    (name || profile?.full_name || profile?.email || 'NC')
      .split(/\s+/)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mx-auto w-full max-w-2xl space-y-5"
    >
      {/* Identity header */}
      <Card className="overflow-hidden border-[#7E8C97]/15 bg-[#161E26]">
        <CardContent className="p-5 sm:p-6">
          {loading ? (
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-full bg-[#0E1419]" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40 bg-[#0E1419]" />
                <Skeleton className="h-3 w-56 bg-[#0E1419]" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#10C97E]/12 font-display text-lg font-bold text-[#10C97E] ring-1 ring-[#10C97E]/25">
                  {initials}
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-lg font-bold leading-tight text-[#EAF1F4]">
                    {profile?.full_name || 'Your account'}
                  </h2>
                  <p className="mt-0.5 truncate text-sm text-[#7E8C97]">
                    {profile?.email || email || '\u2014'}
                  </p>
                </div>
              </div>
              <KycStatusBadge status={status} variant="hover" onVerify={onVerify} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* KYC nudge */}
      {status !== 'verified' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-[#10C97E]/20 bg-[#10C97E]/[0.06]">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#10C97E]/15">
                  <ShieldCheck className="h-4 w-4 text-[#10C97E]" strokeWidth={2} />
                </span>
                <div>
                  <p className="font-display text-sm font-semibold text-[#EAF1F4]">
                    {status === 'pending' ? 'Verification in progress' : 'Verify your identity'}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-[#7E8C97]">
                    {status === 'pending'
                      ? 'We are reviewing your documents \u2014 transfers and withdrawals unlock shortly.'
                      : 'Complete KYC to unlock cross-border transfers and withdrawals.'}
                  </p>
                </div>
              </div>
              {status !== 'pending' && onVerify && (
                <Button
                  onClick={onVerify}
                  className="h-9 gap-1.5 bg-[#10C97E] text-sm font-semibold text-[#0E1419] transition-all duration-200 hover:bg-[#0fb873]"
                >
                  Verify now
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Personal details */}
      <Card className="border-[#7E8C97]/15 bg-[#161E26]">
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-[#7E8C97]" strokeWidth={1.5} />
            <h3 className="font-display text-sm font-semibold text-[#EAF1F4]">Personal details</h3>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-11 w-full bg-[#0E1419]" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-[#7E8C97]">Full name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Sarah Chen"
                  className="h-12 border-[#7E8C97]/20 bg-[#0E1419] text-base text-[#EAF1F4] transition-colors duration-200 focus-visible:border-[#10C97E]/50"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs text-[#7E8C97]">
                  <Mail className="h-3 w-3" strokeWidth={1.5} /> Email
                </Label>
                <Input
                  value={profile?.email || email || ''}
                  disabled
                  className="h-12 border-[#7E8C97]/15 bg-[#0E1419]/60 text-base text-[#7E8C97]"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs text-[#7E8C97]">
                    <Phone className="h-3 w-3" strokeWidth={1.5} /> Phone
                  </Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+234 \u2026"
                    className="h-12 border-[#7E8C97]/20 bg-[#0E1419] font-mono text-base tabular-nums text-[#EAF1F4] transition-colors duration-200 focus-visible:border-[#10C97E]/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs text-[#7E8C97]">
                    <Globe2 className="h-3 w-3" strokeWidth={1.5} /> Country
                  </Label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="h-12 w-full rounded-md border border-[#7E8C97]/20 bg-[#0E1419] px-3 text-base text-[#EAF1F4] transition-colors duration-200 focus:border-[#10C97E]/50 focus:outline-none"
                  >
                    <option value="">Select country</option>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={!dirty || saving}
                className={cn(
                  'h-11 w-full gap-2 font-semibold transition-all duration-200 disabled:opacity-50',
                  justSaved
                    ? 'bg-[#10C97E]/20 text-[#10C97E]'
                    : 'bg-[#10C97E] text-[#0E1419] hover:bg-[#0fb873]'
                )}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> Saving\u2026
                  </>
                ) : justSaved ? (
                  <>
                    <Check className="h-4 w-4" strokeWidth={2.5} /> Saved
                  </>
                ) : (
                  'Save changes'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment methods */}
      <Card className="border-[#7E8C97]/15 bg-[#161E26]">
        <CardContent className="p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-[#7E8C97]" strokeWidth={1.5} />
            <h3 className="font-display text-sm font-semibold text-[#EAF1F4]">
              Payment destinations
            </h3>
          </div>
          <PaymentMethodsManager userId={userId} onError={onError} />
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card className="border-[#7E8C97]/15 bg-[#161E26]">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[#7E8C97]" strokeWidth={1.5} />
            <h3 className="font-display text-sm font-semibold text-[#EAF1F4]">Preferences</h3>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-[#7E8C97]/12 bg-[#0E1419] p-3.5">
            <div>
              <p className="text-sm font-medium text-[#EAF1F4]">Security alerts</p>
              <p className="mt-0.5 text-xs text-[#7E8C97]">
                Email me on sign-ins and large transactions.
              </p>
            </div>
            <Switch
              checked={alerts}
              onCheckedChange={setAlerts}
              className="data-[state=checked]:bg-[#10C97E]"
            />
          </div>
        </CardContent>
      </Card>

      <Separator className="bg-[#7E8C97]/12" />

      <Button
        variant="outline"
        onClick={onSignOut}
        className="h-11 w-full gap-2 border-[#7E8C97]/20 bg-transparent text-[#7E8C97] transition-all duration-200 hover:border-red-500/40 hover:text-red-400"
      >
        <LogOut className="h-4 w-4" strokeWidth={1.5} />
        Sign out
      </Button>
    </motion.div>
  );
}

export default ProfilePanel;
