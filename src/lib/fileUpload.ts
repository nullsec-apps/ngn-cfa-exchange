function projectId(): string {
  return (typeof window !== 'undefined' && window.__NULLSEC__?.projectId) || 'local';
}

const UPLOAD_ENDPOINT = 'https://api.nullsec.studio/upload';

export interface UploadResult {
  url: string;
}

export interface UploadError {
  error: string;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to read file'));
        return;
      }
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

export function validateKycFile(file: File): string | null {
  if (file.size > MAX_BYTES) return 'File is too large (max 8MB).';
  if (file.type && !ALLOWED.includes(file.type)) {
    return 'Unsupported file. Use JPG, PNG, WEBP or PDF.';
  }
  return null;
}

export async function uploadFile(file: File, prefix = 'kyc'): Promise<UploadResult> {
  const base64Data = await fileToBase64(file);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filename = `${prefix}/${projectId()}/${Date.now()}-${safeName}`;
  const res = await fetch(UPLOAD_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appId: projectId(),
      filename,
      base64Data,
      contentType: file.type || 'application/octet-stream',
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Upload failed (${res.status})`);
  }
  const data = (await res.json()) as Partial<UploadResult>;
  if (!data.url) throw new Error('Upload succeeded but no URL was returned.');
  return { url: data.url };
}

export async function uploadKycDocument(file: File): Promise<UploadResult> {
  const err = validateKycFile(file);
  if (err) throw new Error(err);
  return uploadFile(file, 'kyc-documents');
}

export async function uploadKycSelfie(file: File): Promise<UploadResult> {
  const err = validateKycFile(file);
  if (err) throw new Error(err);
  return uploadFile(file, 'kyc-selfies');
}
