import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, ShieldCheck, Lock, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { useAuth } from '../hooks/useAuth';
import { useRateTicker } from '../hooks/useRateTicker';
import { formatRatePair } from '../lib/money';
import { cn } from '@/lib/utils';

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const auth = useAuth();
  const ticker = useRateTicker();
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0E1419]">
        <Loader2 className="w-6 h-6 animate-spin text-[#10C97E]" strokeWidth={2} />
      </div>
    );
  }

  if (auth.user) {
    return <>{children}</>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setNotice(null);
    auth.clearError();
    if (mode === 'signup') {
      const res = await auth.signUp({ email, password, fullName });
      if (res.ok) setNotice('Account created. Check your email to confirm, then sign in.');
    } else {
      await auth.signIn({ email, password });
    }
    setSubmitting(false);
  };

  const updatedSeconds = ticker.lastUpdatedMs
    ? Math.max(0, Math.round((Date.now() - ticker.lastUpdatedMs) / 1000))
    : null;

  return (
    <div className="min-h-screen bg-[#0E1419] text-[#EAF1F4] flex flex-col lg:flex-row overflow-x-hidden">
      {/* Marketing panel */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-16 py-12 lg:py-0 relative"
      >
        <div className="absolute inset-0 pointer-events-none opacity-[0.06]" style={{ background: 'radial-gradient(600px circle at 20% 30%, #10C97E, transparent)' }} />
        <div className="relative max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="flex items-center gap-2 mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-[#10C97E] animate-pulse" />
            <span className="font-display font-bold tracking-tight text-lg">NairaCFA</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="font-display font-bold tracking-tight text-3xl sm:text-4xl lg:text-5xl leading-[1.05]"
          >
            Move money between Naira and CFA — at the{' '}
            <span className="text-[#10C97E]">real rate</span>.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-5 text-[#7E8C97] text-base sm:text-lg leading-relaxed max-w-lg"
          >
            Hold NGN and CFA wallets, convert instantly at live mid-market rates, and send across the border in seconds. Verified, secure, no hidden spread.
          </motion.p>

          {/* Live rate proof strip */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="mt-8 rounded-lg border border-[#7E8C97]/16 bg-[#161E26] p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-[#7E8C97]">
                <span className={cn('w-1.5 h-1.5 rounded-full', ticker.stale ? 'bg-[#F4B740]' : 'bg-[#10C97E] animate-pulse')} />
                Live rate
              </div>
              <span className="text-[11px] text-[#7E8C97]">
                {ticker.loading
                  ? 'fetching…'
                  : updatedSeconds != null
                    ? `updated ${updatedSeconds}s ago`
                    : '—'}
              </span>
            </div>
            <div className="mt-2 font-mono tabular-nums text-lg sm:text-xl text-[#EAF1F4]">
              {ticker.rate && ticker.rate > 0
                ? formatRatePair('NGN', 'XOF', ticker.rate, 1000)
                : 'Rate unavailable'}
            </div>
            <div className="mt-2 text-[11px] text-[#10C97E]">30s locked-rate guarantee</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.36 }}
            className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs text-[#7E8C97]"
          >
            <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-[#10C97E]" strokeWidth={2} /> Instant conversion</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-[#10C97E]" strokeWidth={2} /> KYC verified</span>
            <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-[#10C97E]" strokeWidth={2} /> Secure transfers</span>
          </motion.div>
        </div>
      </motion.div>

      {/* Auth panel */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="w-full lg:w-[480px] flex items-center justify-center px-6 sm:px-10 py-10 lg:py-0 lg:border-l border-[#7E8C97]/12 bg-[#0E1419]"
      >
        <Card className="w-full max-w-sm bg-[#161E26] border-[#7E8C97]/16 shadow-2xl">
          <CardContent className="pt-6">
            <h2 className="font-display font-semibold text-xl tracking-tight">
              {mode === 'signup' ? 'Verify & open wallets' : 'Welcome back'}
            </h2>
            <p className="text-sm text-[#7E8C97] mt-1">
              {mode === 'signup' ? 'Create your account in under a minute.' : 'Sign in to your wallets.'}
            </p>

            <Tabs value={mode} onValueChange={(v) => { setMode(v as 'signin' | 'signup'); setNotice(null); auth.clearError(); }} className="mt-5">
              <TabsList className="grid grid-cols-2 w-full bg-[#0E1419] border border-[#7E8C97]/16">
                <TabsTrigger value="signup" className="data-[state=active]:bg-[#10C97E] data-[state=active]:text-[#0E1419] text-sm">Sign up</TabsTrigger>
                <TabsTrigger value="signin" className="data-[state=active]:bg-[#10C97E] data-[state=active]:text-[#0E1419] text-sm">Sign in</TabsTrigger>
              </TabsList>

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <TabsContent value="signup" className="m-0">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-xs text-[#7E8C97]">Full name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Sarah Adeyemi"
                      className="h-12 bg-[#0E1419] border-[#7E8C97]/20 text-[#EAF1F4] text-base"
                    />
                  </div>
                </TabsContent>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs text-[#7E8C97]">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-12 bg-[#0E1419] border-[#7E8C97]/20 text-[#EAF1F4] text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs text-[#7E8C97]">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-12 bg-[#0E1419] border-[#7E8C97]/20 text-[#EAF1F4] text-base"
                  />
                </div>

                {auth.error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-400">{auth.error}</motion.p>
                )}
                {notice && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-[#10C97E]">{notice}</motion.p>
                )}
                {!auth.configured && (
                  <p className="text-xs text-[#F4B740]">Authentication is not available in this preview.</p>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-12 bg-[#10C97E] hover:bg-[#0fb873] text-[#0E1419] font-semibold text-base transition-all duration-200 group"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      {mode === 'signup' ? 'Verify & open wallets' : 'Sign in'}
                      <ArrowRight className="w-4 h-4 ml-1 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2} />
                    </>
                  )}
                </Button>
              </form>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
