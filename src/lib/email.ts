interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
}

function projectId(): string {
  return (typeof window !== 'undefined' && window.__NULLSEC__?.projectId) || 'local';
}

const EMAIL_ENDPOINT = 'https://api.nullsec.studio/email';

export interface EmailResult {
  ok: boolean;
  error?: string;
}

async function sendEmail({ to, subject, html }: SendEmailArgs): Promise<EmailResult> {
  if (!to) return { ok: false, error: 'Missing recipient' };
  try {
    const res = await fetch(EMAIL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html, appId: projectId() }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, error: text || `Email failed (${res.status})` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

const BRAND = '#10C97E';
const BG = '#0E1419';
const SURFACE = '#161E26';
const TEXT = '#EAF1F4';
const MUTED = '#7E8C97';

function shell(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:${BG};font-family:'Inter Tight',Arial,sans-serif;color:${TEXT};padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:${SURFACE};border:1px solid rgba(126,140,151,0.16);border-radius:12px;overflow:hidden;">
    <div style="padding:20px 24px;border-bottom:1px solid rgba(126,140,151,0.16);">
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${BRAND};margin-right:8px;"></span>
      <span style="font-weight:700;letter-spacing:-0.02em;font-size:16px;">NairaCFA</span>
    </div>
    <div style="padding:24px;">
      <h1 style="font-size:18px;margin:0 0 12px;color:${TEXT};">${title}</h1>
      ${body}
    </div>
    <div style="padding:16px 24px;border-top:1px solid rgba(126,140,151,0.16);color:${MUTED};font-size:12px;">
      Move money between Naira and CFA — at the real rate.
    </div>
  </div>
</body></html>`;
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:6px 0;color:${MUTED};font-size:13px;">${label}</td><td style="padding:6px 0;text-align:right;font-family:'JetBrains Mono',monospace;font-size:13px;color:${TEXT};">${value}</td></tr>`;
}

export interface ReceiptArgs {
  to: string;
  reference: string;
  type: string;
  status: string;
  amount: string;
  fee?: string;
  rate?: string;
  date: string;
  counterparty?: string;
}

export async function sendTransactionReceipt(args: ReceiptArgs): Promise<EmailResult> {
  const rows = [
    row('Reference', args.reference),
    row('Type', args.type),
    row('Status', args.status),
    row('Amount', args.amount),
    args.fee ? row('Fee', args.fee) : '',
    args.rate ? row('Rate', args.rate) : '',
    args.counterparty ? row('Counterparty', args.counterparty) : '',
    row('Date', args.date),
  ]
    .filter(Boolean)
    .join('');
  const body = `<p style="color:${MUTED};font-size:14px;margin:0 0 16px;">Here is your transaction receipt.</p>
  <table style="width:100%;border-collapse:collapse;"><tbody>${rows}</tbody></table>`;
  return sendEmail({
    to: args.to,
    subject: `Receipt · ${args.type} · ${args.reference}`,
    html: shell('Transaction receipt', body),
  });
}

export interface KycEmailArgs {
  to: string;
  status: string;
  reason?: string;
}

export async function sendKycStatusEmail(args: KycEmailArgs): Promise<EmailResult> {
  const body = `<p style="color:${MUTED};font-size:14px;margin:0 0 12px;">Your identity verification status has been updated.</p>
  <p style="font-size:16px;font-weight:600;color:${BRAND};margin:0 0 8px;">Status: ${args.status}</p>
  ${args.reason ? `<p style="color:${MUTED};font-size:13px;margin:0;">${args.reason}</p>` : ''}`;
  return sendEmail({
    to: args.to,
    subject: `KYC update · ${args.status}`,
    html: shell('Verification update', body),
  });
}

export interface SecurityAlertArgs {
  to: string;
  event: string;
  detail?: string;
}

export async function sendSecurityAlert(args: SecurityAlertArgs): Promise<EmailResult> {
  const body = `<p style="color:${MUTED};font-size:14px;margin:0 0 12px;">We noticed activity on your account.</p>
  <p style="font-size:15px;font-weight:600;color:${TEXT};margin:0 0 8px;">${args.event}</p>
  ${args.detail ? `<p style="color:${MUTED};font-size:13px;margin:0;">${args.detail}</p>` : ''}
  <p style="color:${MUTED};font-size:12px;margin-top:16px;">If this wasn't you, secure your account immediately.</p>`;
  return sendEmail({
    to: args.to,
    subject: `Security alert · ${args.event}`,
    html: shell('Security alert', body),
  });
}

export { sendEmail };
