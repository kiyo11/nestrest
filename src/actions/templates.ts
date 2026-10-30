"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOwnerContext } from "@/lib/context";
import { decrypt } from "@/lib/crypto";
import { renderTemplate, fmtDate, type MergeContext } from "@/lib/merge";

const templateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  anchor: z.enum(["CHECKIN", "CHECKOUT"]).nullable().optional(),
  offsetDir: z.enum(["BEFORE", "AFTER"]).nullable().optional(),
  offsetHours: z.coerce.number().int().nonnegative().nullable().optional(),
});

export async function upsertTemplate(input: z.infer<typeof templateSchema>) {
  const { propertyId } = await getOwnerContext();
  const data = templateSchema.parse(input);
  const trigger =
    data.anchor && data.offsetDir && data.offsetHours != null
      ? { anchor: data.anchor, offsetDir: data.offsetDir, offsetHours: data.offsetHours }
      : { anchor: null, offsetDir: null, offsetHours: null };

  if (data.id) {
    await db.messageTemplate.updateMany({
      where: { id: data.id, propertyId },
      data: { name: data.name, subject: data.subject, body: data.body, ...trigger },
    });
  } else {
    await db.messageTemplate.create({
      data: { propertyId, name: data.name, subject: data.subject, body: data.body, ...trigger },
    });
  }
  revalidatePath("/messages");
  return { ok: true };
}

export async function deleteTemplate(id: string) {
  const { propertyId } = await getOwnerContext();
  await db.messageTemplate.deleteMany({ where: { id, propertyId } });
  revalidatePath("/messages");
  return { ok: true };
}

// Build the merge context for a booking (server-side; decrypts PII for owner).
export async function buildMergeContext(bookingId: string): Promise<MergeContext> {
  const { propertyId, property } = await getOwnerContext();
  const booking = await db.booking.findFirst({
    where: { id: bookingId, propertyId },
    include: { guest: true },
  });
  if (!booking) throw new Error("Booking not found.");
  return {
    guest_first_name: decrypt(booking.guest?.firstName ?? null),
    checkin_date: fmtDate(booking.checkIn, property.timezone),
    checkout_date: fmtDate(booking.checkOut, property.timezone),
    door_code: decrypt(property.doorCode),
    wifi: property.wifiInfo,
  };
}

export interface PreviewResult {
  subject: string;
  body: string;
  missing: string[];
  hasGuestEmail: boolean;
}

export async function previewTemplate(
  bookingId: string,
  subject: string,
  body: string,
): Promise<PreviewResult> {
  const { propertyId } = await getOwnerContext();
  const ctx = await buildMergeContext(bookingId);
  const booking = await db.booking.findFirst({
    where: { id: bookingId, propertyId },
    include: { guest: true },
  });
  const s = renderTemplate(subject, ctx);
  const b = renderTemplate(body, ctx);
  return {
    subject: s.text,
    body: b.text,
    missing: [...new Set([...s.missing, ...b.missing])],
    hasGuestEmail: !!decrypt(booking?.guest?.email ?? null),
  };
}
