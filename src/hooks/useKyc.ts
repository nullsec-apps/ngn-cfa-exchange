import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, table, realtimeTopic } from '../lib/supabaseClient';
import { uploadKycDocument, uploadKycSelfie } from '../lib/fileUpload';
import { submitKyc } from '../lib/proxy';
import { sendKycStatusEmail } from '../lib/email';
import { describeError } from '../lib/failureStates';
import type { KycVerification, KycLevel } from '../types';

export interface KycSubmitInput {
  userId: string;
  level?: KycLevel;
  documentType: string;
  documentFile: File;
  selfieFile?: File | null;
  fullName?: string;
  country?: string;
  email?: string;
}

export interface KycSubmitOutcome {
  ok: boolean;
  error?: string;
  record?: KycVerification;
}

export interface UseKycApi {
  records: KycVerification[];
  latest: KycVerification | null;
  loading: boolean;
  submitting: boolean;
  uploadProgress: string | null;
  error: string | null;
  submit: (input: KycSubmitInput) => Promise<KycSubmitOutcome>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

/**
 * Manages KYC submission: uploads document + selfie to /upload, submits to the
 * verification provider via /proxy, and persists records in
 * app_{projectId}_kyc_verifications. Streams status updates via realtime.
 */
export function useKyc(userId: string | null): UseKycApi {
  const [records, setRecords] = useState<KycVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const topic = useRef(`kyc_${realtimeTopic('kyc')}`);
  const mounted = useRef(true);

  const fetchRecords = useCallback(async () => {
    if (!userId) {
      setRecords([]);
      setLoading(false);
      return;
    }
    try {
      const { data, error: err } = await supabase
        .from(table('kyc_verifications'))
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (err) throw err;
      if (mounted.current) setRecords((data as KycVerification[]) ?? []);
    } catch (e) {
      if (mounted.current) setError(describeError(e));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    fetchRecords();

    if (!userId) return;
    const channel = supabase
      .channel(topic.current)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table('kyc_verifications'),
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchRecords();
        }
      )
      .subscribe();

    return () => {
      mounted.current = false;
      supabase.removeChannel(channel);
    };
  }, [userId, fetchRecords]);

  const submit = useCallback(async (input: KycSubmitInput): Promise<KycSubmitOutcome> => {
    setError(null);
    if (!input.userId) {
      const msg = 'You must be signed in to verify.';
      setError(msg);
      return { ok: false, error: msg };
    }
    setSubmitting(true);
    try {
      setUploadProgress('Uploading document\u2026');
      const doc = await uploadKycDocument(input.documentFile);

      let selfieUrl: string | undefined;
      if (input.selfieFile) {
        setUploadProgress('Uploading selfie\u2026');
        const selfie = await uploadKycSelfie(input.selfieFile);
        selfieUrl = selfie.url;
      }

      setUploadProgress('Submitting to verification provider\u2026');
      const level: KycLevel = input.level ?? 'tier1';
      const result = await submitKyc({
        userId: input.userId,
        level,
        documentType: input.documentType,
        documentUrl: doc.url,
        selfieUrl,
        fullName: input.fullName,
        country: input.country,
      });

      const row = {
        user_id: input.userId,
        level,
        status: result.status,
        document_type: input.documentType,
        document_url: doc.url,
        selfie_url: selfieUrl ?? null,
        provider: result.provider,
        provider_reference: result.reference,
        rejection_reason: null,
        raw: result.raw ?? null,
        reviewed_at: null,
      };

      const { data: record, error: insErr } = await supabase
        .from(table('kyc_verifications'))
        .insert(row)
        .select()
        .single();
      if (insErr) throw insErr;

      // Reflect on profile.
      await supabase
        .from(table('profiles'))
        .update({ kyc_status: 'pending' })
        .eq('user_id', input.userId);

      if (input.email) {
        sendKycStatusEmail({ to: input.email, status: 'Submitted for review' }).catch(
          () => undefined
        );
      }

      setUploadProgress(null);
      await fetchRecords();
      return { ok: true, record: record as KycVerification };
    } catch (e) {
      const msg = describeError(e);
      setError(msg);
      setUploadProgress(null);
      return { ok: false, error: msg };
    } finally {
      setSubmitting(false);
    }
  }, [fetchRecords]);

  const clearError = useCallback(() => setError(null), []);

  return {
    records,
    latest: records[0] ?? null,
    loading,
    submitting,
    uploadProgress,
    error,
    submit,
    refresh: fetchRecords,
    clearError,
  };
}
