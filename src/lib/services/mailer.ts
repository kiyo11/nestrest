import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM ?? "NestRest <onboarding@resend.dev>";

const resend = apiKey ? new Resend(apiKey) : null;

export interface SendResult {
  id: string | null;
  delivered: boolean;
  logged: boolean; // true when we only logged (no API key)
}

// Send a transactional email. With no RESEND_API_KEY we log instead of sending
// so local dev works end-to-end without a real key.
export async function sendEmail(to: string, subject: string, html: string): Promise<SendResult> {
  if (!resend) {
    // eslint-disable-next-line no-console
    console.info(`\n[mailer:dev] → ${to}\n  subject: ${subject}\n  (set RESEND_API_KEY to actually send)\n`);
    return { id: `dev_${Date.now()}`, delivered: false, logged: true };
  }
  const { data, error } = await resend.emails.send({ from, to, subject, html });
  if (error) throw new Error(`Resend send failed: ${error.message}`);
  return { id: data?.id ?? null, delivered: false, logged: false };
}

// Auth.js magic-link transport. Logs the link in dev; sends via Resend in prod.
export async function sendMagicLink(to: string, url: string): Promise<void> {
  const subject = "Sign in to NestRest";
  const html = `<p>Click to sign in to NestRest:</p><p><a href="${url}">${url}</a></p><p>This link expires in 24 hours.</p>`;
  if (!resend) {
    // eslint-disable-next-line no-console
    console.info(`\n[auth:magic-link] ${to}\n  ${url}\n`);
    return;
  }
  await sendEmail(to, subject, html);
}
