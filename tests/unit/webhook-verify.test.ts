import { afterEach, describe, expect, it, vi } from "vitest";
import crypto from "crypto";
import { verifyResendSignature } from "../../src/lib/webhook-verify";

const SECRET = "whsec_" + Buffer.from("super-secret-signing-key").toString("base64");

function sign(body: string, id: string, ts: string, secret = SECRET): string {
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  return crypto.createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64");
}

function headers(h: Record<string, string>): Headers {
  return new Headers(h);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("verifyResendSignature", () => {
  it("accepts a valid v1 signature", () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", SECRET);
    const body = JSON.stringify({ type: "email.delivered" });
    const id = "msg_1";
    const ts = String(Math.floor(Date.now() / 1000));
    const res = verifyResendSignature(
      body,
      headers({ "svix-id": id, "svix-timestamp": ts, "svix-signature": `v1,${sign(body, id, ts)}` }),
    );
    expect(res.ok).toBe(true);
  });

  it("rejects a tampered body", () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", SECRET);
    const id = "msg_1";
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = sign("{}", id, ts);
    const res = verifyResendSignature(
      '{"type":"email.bounced"}',
      headers({ "svix-id": id, "svix-timestamp": ts, "svix-signature": `v1,${sig}` }),
    );
    expect(res.ok).toBe(false);
  });

  it("rejects missing svix headers", () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", SECRET);
    const res = verifyResendSignature("{}", headers({}));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(401);
  });

  it("rejects an out-of-tolerance timestamp", () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", SECRET);
    const body = "{}";
    const id = "msg_1";
    const ts = String(Math.floor(Date.now() / 1000) - 3600);
    const res = verifyResendSignature(
      body,
      headers({ "svix-id": id, "svix-timestamp": ts, "svix-signature": `v1,${sign(body, id, ts)}` }),
    );
    expect(res.ok).toBe(false);
  });

  it("fails closed in production when the secret is unset", () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");
    const res = verifyResendSignature("{}", headers({}));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(500);
  });

  it("allows unsigned payloads in non-production when the secret is unset", () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "");
    vi.stubEnv("NODE_ENV", "test");
    const res = verifyResendSignature("{}", headers({}));
    expect(res.ok).toBe(true);
  });
});
