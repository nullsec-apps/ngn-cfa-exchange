import { useState, useMemo, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  ArrowLeftRight,
  Send,
  Receipt,
  User,
  ShieldCheck,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { LiveRateTicker } from './LiveRateTicker';
import { WalletRail } from './WalletRail';
import { KycStatusBadge } from './KycStatusBadge';
import type { AppView, Currency, KycStatus } from '../types';
import { cn } from '@/lib/utils';

interface AppShellProps {
  userId: string | null;
  fullName: string | null;
  kycStatus: KycStatus;
  view: AppView;
  onViewChange: (v: AppView) => void;
  onVerify?: () => void;
  onDeposit?: (currency: Currency) => void;
  onWithdraw?: (currency: Currency) => void;
  onConvert?: (currency: Currency) => void;
  onSignOut?: () => void;
  children: ReactNode;
}

const NAV: { view: AppView; label: string; Icon: typeof Home }[] = [
  { view: 'home', label: 'Home', Icon: Home },
  { view: 'convert', label: 'Convert', Icon: ArrowLeftRight },
  { view: 'send', label: 'Send', Icon: Send },
  { view: 'history', label: 'History', Icon: Receipt },
  { view: 'profile', label: 'Profile', Icon: User },
];

const VIEW_TITLE: Record<AppView, string> = {
  home: 'Overview',
  convert: 'Convert',
  send: 'Send money',
  history: 'Transactions',
  profile: 'Profile',
};

function Logo({ className }: { className?: string }) {
  const logoUrl = typeof window !== 'undefined' ? window.__NULLSEC__?.logoUrl : undefined;
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt="logo"
        className={cn('h-7 w-7', className)}
        style={{ filter: 'brightness(0) invert(1)' }}
      />
    );
  }
  return (
    <span
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-md bg-[#10C97E] font-display text-sm font-bold text-[#0E1419]',
        className
      )}
    >
      ₦
    </span>
  );
}

export function AppShell({
  userId,
  fullName,
  kycStatus,
  view,
  onViewChange,
  onVerify,
  onDeposit,
  onWithdraw,
  onConvert,
  onSignOut,
  children,
}: AppShellProps) {
  const [mobileRailOpen, setMobileRailOpen] = useState(false);

  const initials = useMemo(() => {
    if (!fullName) return 'U';
    return fullName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  }, [fullName]);

  const rail = (
    <WalletRail
      userId={userId}
      kycStatus={kycStatus}
      onVerify={onVerify}
      onDeposit={onDeposit}
      onWithdraw={onWithdraw}
      onConvert={(c) => {
        onConvert?.(c);
        onViewChange('convert');
        setMobileRailOpen(false);
      }}
    />
  );

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-[#0E1419] text-[#EAF1F4]">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-[#7E8C97]/12 bg-[#0E1419]/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            {/* Mobile rail trigger */}
            <Sheet open={mobileRailOpen} onOpenChange={setMobileRailOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 border-[#7E8C97]/20 bg-transparent text-[#7E8C97] transition-colors duration-200 hover:border-[#10C97E]/40 hover:text-[#EAF1F4] lg:hidden"
                  aria-label="Open wallets"
                >
                  <Menu className="h-4 w-4" strokeWidth={2} />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[88vw] max-w-sm border-[#7E8C97]/15 bg-[#0E1419] p-4"
              >
                <SheetHeader className="mb-2 flex flex-row items-center justify-between">
                  <SheetTitle className="font-display text-[#EAF1F4]">Wallets</SheetTitle>
                </SheetHeader>
                {rail}
              </SheetContent>
            </Sheet>

            <Logo />
            <div className="hidden sm:block">
              <p className="font-display text-sm font-bold leading-none tracking-tight text-[#EAF1F4]">
                Naira · CFA
              </p>
              <p className="mt-0.5 text-[10px] text-[#7E8C97]">Real-rate cross-border wallet</p>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map(({ view: v, label, Icon }) => {
              const active = view === v;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => onViewChange(v)}
                  className={cn(
                    'group flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200',
                    active
                      ? 'bg-[#10C97E]/12 text-[#10C97E]'
                      : 'text-[#7E8C97] hover:bg-[#161E26] hover:text-[#EAF1F4]'
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={2} />
                  {label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <KycStatusBadge status={kycStatus} onVerify={onVerify} />
            </div>
            <button
              type="button"
              onClick={() => onViewChange('profile')}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#161E26] text-xs font-semibold text-[#EAF1F4] ring-1 ring-[#7E8C97]/20 transition-all duration-200 hover:ring-[#10C97E]/50"
              aria-label="Profile"
            >
              {initials}
            </button>
            {onSignOut && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onSignOut}
                className="hidden h-9 w-9 text-[#7E8C97] transition-colors duration-200 hover:bg-[#161E26] hover:text-red-400 md:flex"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" strokeWidth={2} />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Live rate ticker strip */}
      <div className="mx-auto w-full max-w-[1400px] px-4 pt-4 sm:px-6">
        <LiveRateTicker />
      </div>

      {/* Main split layout */}
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 gap-6 px-4 py-4 sm:px-6 sm:py-6">
        {/* Left wallet rail (desktop) */}
        <div className="hidden w-[320px] flex-shrink-0 lg:block">
          <div className="sticky top-[84px] max-h-[calc(100vh-104px)]">{rail}</div>
        </div>

        {/* Action canvas */}
        <main className="min-w-0 flex-1 pb-24 md:pb-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-xl font-bold tracking-tight text-[#EAF1F4] sm:text-2xl">
                {VIEW_TITLE[view]}
              </h1>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#7E8C97]">
                <ShieldCheck className="h-3 w-3 text-[#10C97E]" strokeWidth={2} />
                Verified · secure · no hidden spread
              </p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#7E8C97]/12 bg-[#0E1419]/95 backdrop-blur-md md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {NAV.map(({ view: v, label, Icon }) => {
            const active = view === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => onViewChange(v)}
                className={cn(
                  'relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 py-2 transition-colors duration-200',
                  active ? 'text-[#10C97E]' : 'text-[#7E8C97] active:text-[#EAF1F4]'
                )}
              >
                {active && (
                  <motion.span
                    layoutId="mobileTabIndicator"
                    className="absolute top-0 h-0.5 w-8 rounded-full bg-[#10C97E]"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default AppShell;
