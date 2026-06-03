import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Upload,
  Camera,
  FileText,
  Loader2,
  Check,
  ChevronRight,
  ChevronLeft,
  CircleAlert,
  CreditCard,
  ScanFace,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useKyc } from '../hooks/useKyc';
import { validateKycFile } from '../lib/fileUpload';
import type { Profile } from '../types';
import { cn } from '@/lib/utils';

interface KycWizardProps {
  userId: string;
  profile: Profile | null;
  onComplete?: () => void;
  onError?: (msg: string) => void;
}

type StepId = 'details' | 'document' | 'id' | 'selfie' | 'review';
const STEPS: { id: StepId; label: string }[] = [
  { id: 'details', label: 'Details' },
  { id: 'document', label: 'Document' },
  { id: 'id', label: 'ID upload' },
  { id: 'selfie', label: 'Selfie' },
  { id: 'review', label: 'Review' },
];

const DOC_TYPES = [
  { value: 'national_id', label: 'National ID card' },
  { value: 'passport', label: 'International passport' },
  { value: 'drivers_license', label: "Driver's licence" },
  { value: 'voters_card', label: "Voter's card" },
];

const COUNTRIES = [
  'Nigeria',
  "Côte d'Ivoire",
  'Senegal',
  'Benin',
  'Burkina Faso',
  'Mali',
  'Togo',
  'Niger',
  'Guinea-Bissau',
];

function FileDrop({
  label,
  icon: Icon,
  file,
  onPick,
  hint,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  file: File | null;
  onPick: (f: File | null) => void;
  hint: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);

  const handle = (f: File | null) => {
    if (!f) {
      onPick(null);
      return;
    }
    const v = validateKycFile(f);
    if (v) {
      setErr(v);
      return;
    }
    setErr(null);
    onPick(f);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center transition-all duration-200',
          file
            ? 'border-[#10C97E]/40 bg-[#10C97E]/8'
            : 'border-[#7E8C97]/25 bg-[#0E1419] hover:border-[#10C97E]/40 hover:bg-[#10C97E]/5'
        )}
      >
        <span
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full',
            file ? 'bg-[#10C97E]/15 text-[#10C97E]' : 'bg-[#161E26] text-[#7E8C97]'
          )}
        >
          {file ? <Check className="h-5 w-5" strokeWidth={2} /> : <Icon className="h-5 w-5" strokeWidth={1.5} />}
        </span>
        <span className="text-sm font-medium text-[#EAF1F4]">
          {file ? file.name : label}
        </span>
        <span className="text-xs text-[#7E8C97]">{file ? 'Tap to replace' : hint}</span>
      </button>
      {err && (
        <p className="mt-2 flex items-center gap-1 text-xs text-red-400">
          <CircleAlert className="h-3 w-3" strokeWidth={2} />
          {err}
        </p>
      )}
    </div>
  );
}

export function KycWizard({ userId, profile, onComplete, onError }: KycWizardProps) {
  const kyc = useKyc(userId);
  const [stepIndex, setStepIndex] = useState(0);
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [country, setCountry] = useState(profile?.country ?? 'Nigeria');
  const [docType, setDocType] = useState('national_id');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [done, setDone] = useState(false);

  const step = STEPS[stepIndex];
  const progressPct = ((stepIndex + 1) / STEPS.length) * 100;

  const canAdvance = (): boolean => {
    switch (step.id) {
      case 'details':
        return fullName.trim().length > 1 && country.trim().length > 1;
      case 'document':
        return Boolean(docType);
      case 'id':
        return Boolean(docFile);
      case 'selfie':
        return Boolean(selfieFile);
      default:
        return true;
    }
  };

  const next = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  const back = () => setStepIndex((i) => Math.max(i - 1, 0));

  const handleSubmit = async () => {
    if (!docFile) return;
    const res = await kyc.submit({
      userId,
      level: 'tier1',
      documentType: docType,
      documentFile: docFile,
      selfieFile,
      fullName,
      country,
      email: profile?.email ?? undefined,
    });
    if (res.ok) {
      setDone(true);
      onComplete?.();
    } else {
      onError?.(res.error ?? 'Verification submission failed.');
    }
  };

  if (done) {
    return (
      <Card className="border-[#10C97E]/30 bg-[#161E26]">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 18 }}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-[#10C97E]/15"
          >
            <ShieldCheck className="h-8 w-8 text-[#10C97E]" strokeWidth={1.5} />
          </motion.div>
          <h3 className="mt-5 font-display text-xl font-bold text-[#EAF1F4]">
            Submitted for review
          </h3>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#7E8C97]">
            Your identity verification is in progress. We'll notify you by email and unlock
            transfers &amp; withdrawals once it's approved — usually within minutes.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[#7E8C97]/16 bg-[#161E26]">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#10C97E]/12 text-[#10C97E]">
            <ShieldCheck className="h-4 w-4" strokeWidth={2} />
          </span>
          <div>
            <h3 className="font-display text-base font-bold text-[#EAF1F4]">Verify your identity</h3>
            <p className="text-xs text-[#7E8C97]">Tier 1 — unlocks transfers &amp; withdrawals</p>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-[11px] text-[#7E8C97]">
            <span className="font-medium">
              Step {stepIndex + 1} of {STEPS.length} · {step.label}
            </span>
            <span className="font-mono tabular-nums">{Math.round(progressPct)}%</span>
          </div>
          <Progress
            value={progressPct}
            className="h-1.5 bg-[#0E1419] [&>div]:bg-[#10C97E]"
          />
        </div>

        <div className="mt-6 min-h-[220px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
            >
              {step.id === 'details' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-[#7E8C97]">Full legal name</Label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="As shown on your ID"
                      className="h-12 border-[#7E8C97]/20 bg-[#0E1419] text-base text-[#EAF1F4]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-[#7E8C97]">Country of residence</Label>
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger className="h-12 border-[#7E8C97]/20 bg-[#0E1419] text-base text-[#EAF1F4]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-[#7E8C97]/20 bg-[#161E26] text-[#EAF1F4]">
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {step.id === 'document' && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#7E8C97]">Choose a document type</Label>
                  <RadioGroup value={docType} onValueChange={setDocType} className="mt-2 space-y-2">
                    {DOC_TYPES.map((d) => (
                      <Label
                        key={d.value}
                        htmlFor={`doc_${d.value}`}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 rounded-lg border p-3.5 transition-all duration-200',
                          docType === d.value
                            ? 'border-[#10C97E]/40 bg-[#10C97E]/8'
                            : 'border-[#7E8C97]/16 bg-[#0E1419] hover:border-[#7E8C97]/30'
                        )}
                      >
                        <RadioGroupItem
                          id={`doc_${d.value}`}
                          value={d.value}
                          className="border-[#7E8C97]/40 text-[#10C97E]"
                        />
                        <CreditCard className="h-4 w-4 text-[#7E8C97]" strokeWidth={1.5} />
                        <span className="text-sm font-medium text-[#EAF1F4]">{d.label}</span>
                      </Label>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {step.id === 'id' && (
                <FileDrop
                  label="Upload your ID document"
                  icon={FileText}
                  file={docFile}
                  onPick={setDocFile}
                  hint="JPG, PNG, WEBP or PDF · max 8MB"
                />
              )}

              {step.id === 'selfie' && (
                <FileDrop
                  label="Upload a clear selfie"
                  icon={ScanFace}
                  file={selfieFile}
                  onPick={setSelfieFile}
                  hint="Face clearly visible, good lighting"
                />
              )}

              {step.id === 'review' && (
                <div className="space-y-3">
                  <p className="text-xs text-[#7E8C97]">Confirm your details before submitting.</p>
                  {[
                    { k: 'Name', v: fullName },
                    { k: 'Country', v: country },
                    {
                      k: 'Document',
                      v: DOC_TYPES.find((d) => d.value === docType)?.label ?? docType,
                    },
                    { k: 'ID file', v: docFile?.name ?? '—' },
                    { k: 'Selfie', v: selfieFile?.name ?? '—' },
                  ].map((row) => (
                    <div
                      key={row.k}
                      className="flex items-center justify-between gap-3 border-b border-[#7E8C97]/12 pb-2.5"
                    >
                      <span className="text-xs text-[#7E8C97]">{row.k}</span>
                      <span className="truncate text-sm font-medium text-[#EAF1F4]">{row.v}</span>
                    </div>
                  ))}
                  {kyc.uploadProgress && (
                    <p className="flex items-center gap-2 pt-1 text-xs text-[#10C97E]">
                      <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
                      {kyc.uploadProgress}
                    </p>
                  )}
                  {kyc.error && (
                    <p className="flex items-center gap-1.5 pt-1 text-xs text-red-400">
                      <CircleAlert className="h-3.5 w-3.5" strokeWidth={2} />
                      {kyc.error}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-6 flex items-center gap-2">
          {stepIndex > 0 && (
            <Button
              onClick={back}
              variant="outline"
              disabled={kyc.submitting}
              className="h-11 gap-1.5 border-[#7E8C97]/25 bg-transparent text-[#7E8C97] transition-all duration-200 hover:border-[#7E8C97]/45 hover:text-[#EAF1F4]"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
              Back
            </Button>
          )}
          {step.id === 'review' ? (
            <Button
              onClick={handleSubmit}
              disabled={kyc.submitting}
              className="h-11 flex-1 gap-2 bg-[#10C97E] font-semibold text-[#0E1419] transition-all duration-200 hover:bg-[#0fb873] disabled:opacity-50"
            >
              {kyc.submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
              ) : (
                <ShieldCheck className="h-4 w-4" strokeWidth={2} />
              )}
              Submit for verification
            </Button>
          ) : (
            <Button
              onClick={next}
              disabled={!canAdvance()}
              className="h-11 flex-1 gap-1.5 bg-[#10C97E] font-semibold text-[#0E1419] transition-all duration-200 hover:bg-[#0fb873] disabled:opacity-50"
            >
              Continue
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default KycWizard;
