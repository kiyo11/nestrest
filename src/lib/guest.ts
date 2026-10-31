import type { Guest } from "@prisma/client";
import { decrypt, encrypt } from "./crypto";

export interface DecryptedGuest {
  id: string;
  propertyId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
}

// Decrypt the PII columns on a Guest row. Call only in owner-scoped reads.
export function decryptGuest(guest: Guest): DecryptedGuest {
  return {
    id: guest.id,
    propertyId: guest.propertyId,
    firstName: decrypt(guest.firstName),
    lastName: decrypt(guest.lastName),
    email: decrypt(guest.email),
    phone: decrypt(guest.phone),
    notes: decrypt(guest.notes),
  };
}

export interface GuestInput {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}

// Encrypt PII for persistence.
export function encryptGuest(input: GuestInput) {
  return {
    firstName: encrypt(input.firstName),
    lastName: encrypt(input.lastName),
    email: encrypt(input.email),
    phone: encrypt(input.phone),
    notes: encrypt(input.notes),
  };
}
