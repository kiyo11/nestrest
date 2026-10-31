import { describe, it, expect, afterEach } from "vitest";
import { encrypt, decrypt } from "@/lib/crypto";

const GOOD_KEY = Buffer.alloc(32, 7).toString("base64");

afterEach(() => {
  process.env.ENCRYPTION_KEY = GOOD_KEY;
});

describe("crypto AES-256-GCM", () => {
  it("round-trips a plaintext string", () => {
    const ct = encrypt("guest@example.com");
    expect(ct).not.toBeNull();
    expect(decrypt(ct)).toBe("guest@example.com");
  });

  it("round-trips unicode", () => {
    const secret = "José 🏠 房间 código";
    expect(decrypt(encrypt(secret))).toBe(secret);
  });

  it("prefixes ciphertext with enc: and does not leak plaintext", () => {
    const ct = encrypt("+1-415-555-0100")!;
    expect(ct.startsWith("enc:")).toBe(true);
    expect(ct).not.toContain("415");
    expect(ct).not.toContain("555");
  });

  it("produces a different ciphertext each call (random IV)", () => {
    expect(encrypt("same")).not.toBe(encrypt("same"));
  });

  it("returns null for null / undefined / empty input", () => {
    expect(encrypt(null)).toBeNull();
    expect(encrypt(undefined)).toBeNull();
    expect(encrypt("")).toBeNull();
    expect(decrypt(null)).toBeNull();
    expect(decrypt("")).toBeNull();
  });

  it("passes through legacy plaintext (no enc: prefix)", () => {
    expect(decrypt("plain-legacy-value")).toBe("plain-legacy-value");
  });

  it("throws when the auth tag is tampered (integrity failure)", () => {
    const ct = encrypt("sensitive")!;
    // Flip a byte inside the base64 body to corrupt the GCM auth tag.
    const body = Buffer.from(ct.slice(4), "base64");
    body[13] = body[13] ^ 0xff;
    const tampered = "enc:" + body.toString("base64");
    expect(() => decrypt(tampered)).toThrow();
  });

  it("throws when decrypting with a different key", () => {
    const ct = encrypt("sensitive")!;
    process.env.ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");
    expect(() => decrypt(ct)).toThrow();
  });

  it("throws when ENCRYPTION_KEY is missing", () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt("x")).toThrow(/ENCRYPTION_KEY is not set/);
  });

  it("throws when ENCRYPTION_KEY is not 32 bytes", () => {
    process.env.ENCRYPTION_KEY = Buffer.alloc(16, 1).toString("base64");
    expect(() => encrypt("x")).toThrow(/32 bytes/);
  });
});
