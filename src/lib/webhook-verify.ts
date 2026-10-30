import crypto from "crypto";

// Verifies a Svix-format webhook signature (the scheme Resend uses) against
// RESEND_WEBHOOK_SECRET. Implemented manually to avoid adding the `svix` dep.
//
// Signed content is `${svix-id}.${svix-timestamp}.${rawBody}`, HMAC-SHA256 with
// the secret's base64 payload (after the `whsec_` prefix), base64-encoded. The
// `svix-signature` header is a space-separated list of `v1,<sig>` entries.

export type WebhookVerifyResult =
  | { ok: true }
  | { ok: false; status: number; reason: string };

const TOLERANCE_SECONDS = 5 * 60;

export function verifyResendSignature(rawBody: string, headers: Headers): WebhookVerifyResult {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    // Fail closed in production; allow unsigned payloads only in dev convenience.
    if (process.env.NODE_ENV === "production") {
      return { ok: false, status: 500, reason: "RESEND_WEBHOOK_SECRET not configured" };
    }
    return { ok: true };
  }

  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signature = headers.get("svix-signature");
  if (!id || !timestamp || !signature) {
    return { ok: false, status: 401, reason: "missing svix signature headers" };
  }

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > TOLERANCE_SECONDS) {
    return { ok: false, status: 401, reason: "timestamp outside tolerance" };
  }

  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = crypto
    .createHmac("sha256", secretBytes)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest("base64");

  // svix-signature may carry multiple space-separated `v1,<sig>` versions.
  const provided = signature.split(" ").map((part) => {
    const idx = part.indexOf(",");
    return idx === -1 ? part : part.slice(idx + 1);
  });

  const match = provided.some((sig) => safeEqual(sig, expected));
  return match ? { ok: true } : { ok: false, status: 401, reason: "signature mismatch" };
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}
