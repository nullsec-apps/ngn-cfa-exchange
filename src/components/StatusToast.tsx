import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  WifiOff,
  Clock,
  ShieldAlert,
  CircleDollarSign,
  XCircle,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react';
import { getFailureState, toneStyle } from '../lib/failureStates';
import type { FailureCode, FailureState } from '../types';
import { cn } from '@/lib/utils';

export interface ToastItem {
  id: string;
  code?: FailureCode;
  title?: string;
  description?: string;
  tone?: FailureState['tone'] | 'success';
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

interface StatusToastProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

const CODE_ICON: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  offline: WifiOff,
  rate_stale: Clock,
  rate_lock_expired: Clock,
  kyc_pending: ShieldAlert,
  insufficient_funds: CircleDollarSign,
  payment_processor_error: XCircle,
  error: AlertTriangle,
  empty: Info,
  loading: Info,
  success: CheckCircle2,
};

function resolveToast(t: ToastItem): {
  title: string;
  description: string;
  tone: FailureState['tone'] | 'success';
  actionLabel?: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
} {
  if (t.code) {
    const fs = getFailureState(t.code);
    return {
      title: t.title ?? fs.title,
      description: t.description ?? fs.description,
      tone: t.tone ?? fs.tone,
      actionLabel: t.actionLabel ?? fs.actionLabel,
      Icon: CODE_ICON[t.code] ?? AlertTriangle,
    };
  }
  const tone = t.tone ?? 'info';
  return {
    title: t.title ?? 'Notice',
    description: t.description ?? '',
    tone,
    actionLabel: t.actionLabel,
    Icon: tone === 'success' ? CheckCircle2 : tone === 'error' ? XCircle : Info,
  };
}

const SUCCESS_STYLE = {
  bg: 'bg-[#10C97E]/10',
  border: 'border-[#10C97E]/35',
  text: 'text-[#10C97E]',
  dot: 'bg-[#10C97E]',
};

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const { title, description, tone, actionLabel, Icon } = resolveToast(toast);
  const style = tone === 'success' ? SUCCESS_STYLE : toneStyle(tone as FailureState['tone']);

  useEffect(() => {
    const duration = toast.duration ?? (tone === 'error' ? 8000 : 5000);
    if (duration <= 0) return;
    const id = setTimeout(() => onDismiss(toast.id), duration);
    return () => clearTimeout(id);
  }, [toast.id, toast.duration, tone, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className={cn(
        'pointer-events-auto w-full max-w-sm rounded-lg border bg-[#161E26] shadow-2xl shadow-black/40 backdrop-blur-sm',
        'overflow-hidden'
      )}
    >
      <div className={cn('flex items-start gap-3 p-4 border-l-2', style.border.replace('border-', 'border-l-'))}>
        <span className={cn('mt-0.5 flex-shrink-0 rounded-md p-1.5', style.bg)}>
          <Icon className={cn('h-4 w-4', style.text)} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-semibold leading-tight text-[#EAF1F4]">{title}</p>
          {description && (
            <p className="mt-1 text-xs leading-relaxed text-[#7E8C97]">{description}</p>
          )}
          {actionLabel && toast.onAction && (
            <button
              type="button"
              onClick={() => {
                toast.onAction?.();
                onDismiss(toast.id);
              }}
              className={cn(
                'mt-2.5 text-xs font-semibold transition-colors duration-200 hover:underline',
                style.text
              )}
            >
              {actionLabel}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss"
          className="flex-shrink-0 rounded-md p-1 text-[#7E8C97] transition-colors duration-200 hover:bg-[#0E1419] hover:text-[#EAF1F4]"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
    </motion.div>
  );
}

export function StatusToast({ toasts, onDismiss }: StatusToastProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+88px)] sm:bottom-4 sm:right-4 sm:left-auto sm:items-end sm:px-0 sm:pb-0">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

let toastSeq = 0;
export function makeToastId(prefix = 't'): string {
  toastSeq += 1;
  return `${prefix}_${Date.now()}_${toastSeq}`;
}

export default StatusToast;
