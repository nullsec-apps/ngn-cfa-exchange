import { motion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, ShieldQuestion, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import type { KycStatus } from '../types';
import { cn } from '@/lib/utils';

interface KycStatusBadgeProps {
  status: KycStatus;
  variant?: 'pill' | 'hover';
  onVerify?: () => void;
  className?: string;
}

interface StatusMeta {
  label: string;
  classes: string;
  Icon: typeof ShieldCheck;
  dot: string;
  title: string;
  description: string;
}

const STATUS_META: Record<KycStatus, StatusMeta> = {
  verified: {
    label: 'Verified',
    classes: 'bg-[#10C97E]/12 text-[#10C97E] border-[#10C97E]/30',
    Icon: ShieldCheck,
    dot: 'bg-[#10C97E]',
    title: 'Identity verified',
    description: 'Your account is fully verified. Transfers and withdrawals are unlocked.',
  },
  pending: {
    label: 'Pending',
    classes: 'bg-[#F4B740]/12 text-[#F4B740] border-[#F4B740]/30',
    Icon: Clock,
    dot: 'bg-[#F4B740]',
    title: 'Verification in progress',
    description: 'We are reviewing your documents. This usually takes a few minutes.',
  },
  rejected: {
    label: 'Rejected',
    classes: 'bg-red-500/12 text-red-400 border-red-500/30',
    Icon: ShieldAlert,
    dot: 'bg-red-500',
    title: 'Verification rejected',
    description: 'Something didn\u2019t match. Re-submit your documents to verify.',
  },
  unverified: {
    label: 'Unverified',
    classes: 'bg-[#7E8C97]/12 text-[#7E8C97] border-[#7E8C97]/25',
    Icon: ShieldQuestion,
    dot: 'bg-[#7E8C97]',
    title: 'Not verified yet',
    description: 'Complete KYC verification to unlock transfers and withdrawals.',
  },
};

export function KycStatusBadge({ status, variant = 'pill', onVerify, className }: KycStatusBadgeProps) {
  const meta = STATUS_META[status] ?? STATUS_META.unverified;
  const { Icon } = meta;

  const pill = (
    <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }}>
      <Badge
        variant="outline"
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium border transition-all duration-200',
          meta.classes,
          className
        )}
      >
        <Icon className="w-3 h-3" strokeWidth={2} />
        {meta.label}
      </Badge>
    </motion.div>
  );

  if (variant === 'hover') {
    return (
      <HoverCard openDelay={120}>
        <HoverCardTrigger asChild>
          <button type="button" className="focus:outline-none">{pill}</button>
        </HoverCardTrigger>
        <HoverCardContent className="w-64 bg-[#161E26] border-[#7E8C97]/20 text-[#EAF1F4]">
          <div className="flex items-start gap-3">
            <span className={cn('mt-1 w-2 h-2 rounded-full shrink-0', meta.dot, status === 'pending' && 'animate-pulse')} />
            <div>
              <p className="text-sm font-medium">{meta.title}</p>
              <p className="mt-1 text-xs text-[#7E8C97] leading-relaxed">{meta.description}</p>
              {onVerify && status !== 'verified' && status !== 'pending' && (
                <button
                  type="button"
                  onClick={onVerify}
                  className="mt-3 text-xs font-medium text-[#10C97E] hover:underline transition-colors"
                >
                  Verify identity \u2192
                </button>
              )}
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" onClick={onVerify} className="focus:outline-none">{pill}</button>
        </TooltipTrigger>
        <TooltipContent className="bg-[#161E26] border-[#7E8C97]/20 text-[#EAF1F4] max-w-[200px]">
          <p className="text-xs">{meta.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
