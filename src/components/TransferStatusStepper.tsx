import { motion } from 'framer-motion';
import { Check, Loader2, Lock, Send, CheckCheck } from 'lucide-react';
import type { TransactionStatus } from '../types';
import { cn } from '@/lib/utils';

interface StepDef {
  key: TransactionStatus;
  label: string;
  description: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const STEPS: StepDef[] = [
  { key: 'initiated', label: 'Initiated', description: 'Transfer created and queued.', Icon: Send },
  { key: 'rate_locked', label: 'Rate locked', description: 'Mid-market rate guaranteed.', Icon: Lock },
  { key: 'cleared', label: 'Cleared', description: 'Funds debited and converted.', Icon: Check },
  { key: 'delivered', label: 'Delivered', description: 'Recipient credited.', Icon: CheckCheck },
];

const ORDER: Record<string, number> = {
  initiated: 0,
  rate_locked: 1,
  processing: 2,
  cleared: 2,
  delivered: 3,
  completed: 3,
};

interface TransferStatusStepperProps {
  status: TransactionStatus;
  timestamps?: Partial<Record<TransactionStatus, string>>;
  orientation?: 'vertical' | 'horizontal';
  className?: string;
}

function fmtTime(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function TransferStatusStepper({
  status,
  timestamps,
  orientation = 'vertical',
  className,
}: TransferStatusStepperProps) {
  const failed = status === 'failed' || status === 'cancelled';
  const activeIndex = ORDER[status] ?? 0;
  const isProcessing = status === 'processing';

  if (orientation === 'horizontal') {
    return (
      <div className={cn('flex w-full items-start', className)}>
        {STEPS.map((step, i) => {
          const done = i < activeIndex || (i === activeIndex && !isProcessing && status !== 'initiated');
          const current = i === activeIndex;
          const reached = i <= activeIndex;
          return (
            <div key={step.key} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                {i > 0 && (
                  <div className="h-0.5 flex-1">
                    <motion.div
                      className={cn('h-full', reached ? 'bg-[#10C97E]' : 'bg-[#7E8C97]/20')}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: reached ? 1 : 0 }}
                      transition={{ duration: 0.4, delay: i * 0.05 }}
                      style={{ originX: 0 }}
                    />
                  </div>
                )}
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.05, type: 'spring', stiffness: 320, damping: 24 }}
                  className={cn(
                    'relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300',
                    reached
                      ? 'border-[#10C97E] bg-[#10C97E]/15 text-[#10C97E]'
                      : 'border-[#7E8C97]/25 bg-[#0E1419] text-[#7E8C97]'
                  )}
                >
                  {current && isProcessing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
                  ) : (
                    <step.Icon className="h-3.5 w-3.5" strokeWidth={2} />
                  )}
                  {reached && (
                    <motion.span
                      className="absolute inset-0 rounded-full border-2 border-[#10C97E]"
                      initial={{ opacity: 0.6, scale: 1 }}
                      animate={{ opacity: 0, scale: 1.6 }}
                      transition={{ duration: 1.2, repeat: current ? Infinity : 0 }}
                    />
                  )}
                </motion.span>
                {i < STEPS.length - 1 && (
                  <div className="h-0.5 flex-1">
                    <motion.div
                      className={cn('h-full', i < activeIndex ? 'bg-[#10C97E]' : 'bg-[#7E8C97]/20')}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: i < activeIndex ? 1 : 0 }}
                      transition={{ duration: 0.4, delay: i * 0.05 }}
                      style={{ originX: 0 }}
                    />
                  </div>
                )}
              </div>
              <p
                className={cn(
                  'mt-2 text-center text-[10px] font-medium uppercase tracking-wide',
                  reached ? 'text-[#EAF1F4]' : 'text-[#7E8C97]'
                )}
              >
                {step.label}
              </p>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {failed && (
        <div className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400">
          Transfer {status === 'cancelled' ? 'cancelled' : 'failed'} — no funds were moved.
        </div>
      )}
      <ol className="relative space-y-0">
        {STEPS.map((step, i) => {
          const reached = i <= activeIndex;
          const current = i === activeIndex;
          const isLast = i === STEPS.length - 1;
          const ts = fmtTime(timestamps?.[step.key]);
          return (
            <motion.li
              key={step.key}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="relative flex gap-3 pb-5 last:pb-0"
            >
              {!isLast && (
                <span
                  className={cn(
                    'absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-0.5',
                    i < activeIndex ? 'bg-[#10C97E]' : 'bg-[#7E8C97]/20'
                  )}
                  aria-hidden
                />
              )}
              <span
                className={cn(
                  'relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300',
                  reached
                    ? 'border-[#10C97E] bg-[#10C97E]/15 text-[#10C97E]'
                    : 'border-[#7E8C97]/25 bg-[#0E1419] text-[#7E8C97]'
                )}
              >
                {current && isProcessing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
                ) : reached && !current ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                ) : (
                  <step.Icon className="h-3.5 w-3.5" strokeWidth={2} />
                )}
                {current && !failed && (
                  <motion.span
                    className="absolute inset-0 rounded-full border-2 border-[#10C97E]"
                    initial={{ opacity: 0.6, scale: 1 }}
                    animate={{ opacity: 0, scale: 1.8 }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                  />
                )}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={cn(
                      'font-display text-sm font-semibold leading-tight',
                      reached ? 'text-[#EAF1F4]' : 'text-[#7E8C97]'
                    )}
                  >
                    {step.label}
                  </p>
                  {ts && reached && (
                    <span className="font-mono text-[10px] tabular-nums text-[#7E8C97]">{ts}</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-[#7E8C97]">{step.description}</p>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}

export default TransferStatusStepper;
