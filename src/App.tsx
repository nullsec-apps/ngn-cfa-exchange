import { useState, useCallback } from 'react';
import { AuthGate } from './components/AuthGate';
import { AppShell } from './components/AppShell';
import { ConversionPanel } from './components/ConversionPanel';
import { TransactionHistory } from './components/TransactionHistory';
import { TransactionDetailDrawer } from './components/TransactionDetailDrawer';
import { TransferSheet } from './components/TransferSheet';
import { WithdrawSheet } from './components/WithdrawSheet';
import { DepositSheet } from './components/DepositSheet';
import { ProfilePanel } from './components/ProfilePanel';
import { KycWizard } from './components/KycWizard';
import { PaymentMethodsManager } from './components/PaymentMethodsManager';
import { StatusToast, makeToastId, type ToastItem } from './components/StatusToast';
import { useAuth } from './hooks/useAuth';
import { useProfile } from './hooks/useProfile';
import { useWallets } from './hooks/useWallets';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowLeftRight, Send, ArrowDownToLine, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';
import type { AppView, Currency, KycStatus, Transaction } from './types';

function HomeView({
  userId,
  kycStatus,
  onConvert,
  onSend,
  onDeposit,
  onVerify,
}: {
  userId: string;
  kycStatus: KycStatus;
  onConvert: () => void;
  onSend: () => void;
  onDeposit: () => void;
  onVerify: () => void;
}) {
  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <Card className="relative overflow-hidden border-[#7E8C97]/12 bg-[#161E26]">
          <div
            className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full opacity-[0.08] blur-3xl"
            style={{ background: '#10C97E' }}
          />
          <CardContent className="relative p-5 sm:p-7">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#10C97E]/25 bg-[#10C97E]/8 px-2.5 py-1 text-[11px] font-medium text-[#10C97E]">
              <Sparkles className="h-3 w-3" strokeWidth={2} />
              Real mid-market rate · no hidden spread
            </span>
            <h2 className="mt-4 max-w-xl font-display text-2xl font-bold leading-tight tracking-tight text-[#EAF1F4] sm:text-3xl">
              Move money between Naira and CFA — at the real rate.
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-[#7E8C97]">
              Convert instantly at live rates with a 30-second lock guarantee, then send across the
              border in seconds. Your balances update in real time.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Button
                onClick={onConvert}
                className="h-11 gap-2 bg-[#10C97E] font-semibold text-[#0E1419] transition-all duration-200 hover:bg-[#0fb873]"
              >
                <ArrowLeftRight className="h-4 w-4" strokeWidth={2} />
                Convert now
              </Button>
              <Button
                onClick={onSend}
                variant="outline"
                className="h-11 gap-2 border-[#7E8C97]/25 bg-transparent text-[#EAF1F4] transition-all duration-200 hover:border-[#10C97E]/45 hover:bg-[#0E1419]"
              >
                <Send className="h-4 w-4" strokeWidth={2} />
                Send money
              </Button>
              <Button
                onClick={onDeposit}
                variant="outline"
                className="h-11 gap-2 border-[#7E8C97]/25 bg-transparent text-[#EAF1F4] transition-all duration-200 hover:border-[#10C97E]/45 hover:bg-[#0E1419]"
              >
                <ArrowDownToLine className="h-4 w-4" strokeWidth={2} />
                Fund wallet
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {kycStatus !== 'verified' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <Card className="border-[#F4B740]/25 bg-[#F4B740]/[0.05]">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#F4B740]/15">
                  <ShieldCheck className="h-4 w-4 text-[#F4B740]" strokeWidth={2} />
                </span>
                <div>
                  <p className="font-display text-sm font-semibold text-[#EAF1F4]">
                    {kycStatus === 'pending' ? 'Verification in progress' : 'Verify to unlock transfers'}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-[#7E8C97]">
                    {kycStatus === 'pending'
                      ? 'We are reviewing your documents — sending and withdrawing unlock shortly.'
                      : 'Complete KYC to send across the border and withdraw to your bank or mobile money.'}
                  </p>
                </div>
              </div>
              {kycStatus !== 'pending' && (
                <Button
                  onClick={onVerify}
                  className="h-9 gap-1.5 bg-[#F4B740] text-sm font-semibold text-[#0E1419] transition-all duration-200 hover:bg-[#e6a82e]"
                >
                  Verify now
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <ConversionPanel userId={userId} />
        <TransactionHistory userId={userId} className="max-h-[560px]" />
      </div>
    </div>
  );
}

function AuthedApp() {
  const auth = useAuth();
  const userId = auth.user?.id ?? null;
  const email = auth.user?.email ?? null;
  const metaName =
    (auth.user?.user_metadata?.full_name as string | undefined) ?? null;

  const { profile } = useProfile(userId, email, metaName);
  const walletsApi = useWallets(userId);

  const [view, setView] = useState<AppView>('home');
  const [convertCurrency, setConvertCurrency] = useState<Currency>('NGN');
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [kycOpen, setKycOpen] = useState(false);
  const [methodsOpen, setMethodsOpen] = useState(false);
  const [sheetCurrency, setSheetCurrency] = useState<Currency>('NGN');
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const kycStatus: KycStatus = profile?.kyc_status ?? 'unverified';

  const pushToast = useCallback((t: Omit<ToastItem, 'id'>) => {
    setToasts((prev) => [...prev, { ...t, id: makeToastId() }]);
  }, []);
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const onError = useCallback(
    (msg: string, code?: string) => {
      pushToast({ title: 'Something went wrong', description: msg, tone: 'error', code: code as never });
    },
    [pushToast]
  );
  const onSuccess = useCallback(
    (msg: string) => {
      pushToast({ title: 'Done', description: msg, tone: 'success' });
    },
    [pushToast]
  );

  const handleVerify = useCallback(() => {
    setView('profile');
    setKycOpen(true);
  }, []);

  const handleDeposit = useCallback((c: Currency) => {
    setSheetCurrency(c);
    setDepositOpen(true);
  }, []);
  const handleWithdraw = useCallback((c: Currency) => {
    setSheetCurrency(c);
    setWithdrawOpen(true);
  }, []);
  const handleConvertFor = useCallback((c: Currency) => {
    setConvertCurrency(c);
  }, []);

  if (!userId) return null;

  return (
    <>
      <AppShell
        userId={userId}
        fullName={profile?.full_name ?? metaName}
        kycStatus={kycStatus}
        view={view}
        onViewChange={(v) => {
          setView(v);
          if (v === 'send') setTransferOpen(true);
        }}
        onVerify={handleVerify}
        onDeposit={handleDeposit}
        onWithdraw={handleWithdraw}
        onConvert={handleConvertFor}
        onSignOut={auth.signOut}
      >
        {view === 'home' && (
          <HomeView
            userId={userId}
            kycStatus={kycStatus}
            onConvert={() => setView('convert')}
            onSend={() => setTransferOpen(true)}
            onDeposit={() => handleDeposit('NGN')}
            onVerify={handleVerify}
          />
        )}

        {view === 'convert' && (
          <div className="mx-auto max-w-lg">
            <ConversionPanel
              userId={userId}
              initialFrom={convertCurrency}
              onSuccess={onSuccess}
              onError={onError}
            />
          </div>
        )}

        {view === 'send' && (
          <div className="mx-auto max-w-lg space-y-4">
            <Card className="border-[#7E8C97]/12 bg-[#161E26]">
              <CardContent className="flex flex-col items-center py-10 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#10C97E]/12">
                  <Send className="h-5 w-5 text-[#10C97E]" strokeWidth={1.75} />
                </span>
                <h3 className="mt-3 font-display text-base font-semibold text-[#EAF1F4]">
                  Send across the border
                </h3>
                <p className="mt-1 max-w-xs text-xs leading-relaxed text-[#7E8C97]">
                  Look up a recipient by phone or email and send NGN or CFA at the locked rate.
                </p>
                <Button
                  onClick={() => setTransferOpen(true)}
                  className="mt-5 h-11 gap-2 bg-[#10C97E] font-semibold text-[#0E1419] transition-all duration-200 hover:bg-[#0fb873]"
                >
                  <Send className="h-4 w-4" strokeWidth={2} />
                  New transfer
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {view === 'history' && (
          <TransactionHistory
            userId={userId}
            onSelect={(t) => {
              setSelectedTxn(t);
              setDetailOpen(true);
            }}
            className="max-h-[calc(100vh-220px)]"
          />
        )}

        {view === 'profile' && (
          <>
            <ProfilePanel
              userId={userId}
              email={email}
              fullName={profile?.full_name ?? metaName}
              kycStatus={kycStatus}
              onVerify={() => setKycOpen(true)}
              onSignOut={auth.signOut}
              onError={onError}
              onSaved={() => onSuccess('Profile updated.')}
            />
            {kycOpen && kycStatus !== 'verified' && (
              <div className="mx-auto mt-5 w-full max-w-2xl">
                <KycWizard
                  userId={userId}
                  profile={profile}
                  onComplete={() => {
                    setKycOpen(false);
                    onSuccess('Identity submitted for verification.');
                  }}
                  onError={onError}
                />
              </div>
            )}
            {methodsOpen && (
              <div className="mx-auto mt-5 w-full max-w-2xl">
                <Card className="border-[#7E8C97]/15 bg-[#161E26]">
                  <CardContent className="p-5 sm:p-6">
                    <PaymentMethodsManager userId={userId} onError={onError} />
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </AppShell>

      <DepositSheet
        open={depositOpen}
        onOpenChange={setDepositOpen}
        userId={userId}
        defaultCurrency={sheetCurrency}
        onSuccess={() => {
          onSuccess('Deposit initiated.');
          walletsApi.refresh();
        }}
        onError={onError}
      />

      <WithdrawSheet
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        userId={userId}
        kycStatus={kycStatus}
        defaultCurrency={sheetCurrency}
        onSuccess={onSuccess}
        onError={onError}
        onManageMethods={() => {
          setView('profile');
          setMethodsOpen(true);
        }}
        onVerify={handleVerify}
      />

      <TransferSheet
        open={transferOpen}
        onOpenChange={(o) => {
          setTransferOpen(o);
          if (!o && view === 'send') setView('home');
        }}
        userId={userId}
        kycStatus={kycStatus}
        defaultCurrency={sheetCurrency}
        onVerify={handleVerify}
        onSuccess={onSuccess}
        onError={onError}
      />

      <TransactionDetailDrawer
        transaction={selectedTxn}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        email={email}
        onToast={(msg, tone) => pushToast({ title: tone === 'error' ? 'Error' : 'Done', description: msg, tone: tone ?? 'info' })}
      />

      <StatusToast toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

export default function App() {
  return (
    <AuthGate>
      <AuthedApp />
    </AuthGate>
  );
}
