import { describe, it, expect } from "vitest";
import type { Guest } from "@prisma/client";
import { encryptGuest, decryptGuest } from "@/lib/guest";
import { decrypt } from "@/lib/crypto";

describe("guest PII encrypt/decrypt projection", () => {
  it("encrypts every PII column for persistence", () => {
    const enc = encryptGuest({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      phone: "+1-415-555-0100",
      notes: "VIP",
    });
    for (const [k, v] of Object.entries(enc)) {
      expect(v, k).not.toBeNull();
      expect(v!.startsWith("enc:"), k).toBe(true);
    }
    // No plaintext PII survives in the stored payload.
    expect(JSON.stringify(enc)).not.toContain("Ada");
    expect(JSON.stringify(enc)).not.toContain("ada@example.com");
  });

  it("round-trips through decryptGuest", () => {
    const enc = encryptGuest({ firstName: "Ada", email: "ada@example.com" });
    const row = {
      id: "g1",
      propertyId: "p1",
      firstName: enc.firstName,
      lastName: enc.lastName,
      email: enc.email,
      phone: enc.phone,
      notes: enc.notes,
    } as Guest;
    const out = decryptGuest(row);
    expect(out.firstName).toBe("Ada");
    expect(out.email).toBe("ada@example.com");
    expect(out.phone).toBeNull();
  });

  it("the decrypted projection exposes only known guest fields (no payout)", () => {
    const enc = encryptGuest({ firstName: "Ada" });
    const out = decryptGuest({ id: "g1", propertyId: "p1", ...enc } as Guest);
    expect(Object.keys(out).sort()).toEqual([
      "email",
      "firstName",
      "id",
      "lastName",
      "notes",
      "phone",
      "propertyId",
    ]);
    expect(out).not.toHaveProperty("payout");
  });

  it("stored ciphertext is not reversible without decrypt()", () => {
    const enc = encryptGuest({ email: "secret@example.com" });
    expect(enc.email).not.toContain("secret");
    expect(decrypt(enc.email)).toBe("secret@example.com");
  });
});
