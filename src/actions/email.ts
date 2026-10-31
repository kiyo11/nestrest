"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOwnerContext } from "@/lib/context";
import { decrypt } from "@/lib/crypto";
import { renderTemplate } from "@/lib/merge";
import { sendEmail } from "@/lib/services/mailer";
import { logActivity } from "@/lib/services/activity";
import { buildMergeContext } from "./templates";

const sendSchema = z.object({
  bookingId: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  templateName: z.string().optional(),
});

// Send-now from the composer. Blocks on unresolved merge fields / missing email.
export async function sendNow(input: z.infer<typeof sendSchema>) {
  const { propertyId } = await getOwnerContext();
  const data = sendSchema.parse(input);
  const booking = await db.booking.findFirst({
    where: { id: data.bookingId, propertyId },
    include: { guest: true },
  });
  if (!booking) throw new Error("Booking not found.");

  const guestEmail = decrypt(booking.guest?.email ?? null);
  if (!guestEmail) return { ok: false, reason: "no_email" as const };

  const ctx = await buildMergeContext(data.bookingId);
  const subject = renderTemplate(data.subject, ctx);
  const body = renderTemplate(data.body, ctx);
  const missing = [...new Set([...subject.missing, ...body.missing])];
  if (missing.length > 0) return { ok: false, reason: "unresolved" as const, missing };

  const res = await sendEmail(guestEmail, subject.text, body.text.replace(/\n/g, "<br/>"));
  await logActivity({
    propertyId,
    bookingId: booking.id,
    type: "EMAIL_SENT",
    message: `Email sent${data.templateName ? `: ${data.templateName}` : ""}${res.logged ? " (dev log)" : ""}`,
  });
  revalidatePath(`/bookings/${booking.id}`);
  return { ok: true as const, logged: res.logged };
}

export async function cancelScheduledMessage(id: string) {
  const { propertyId } = await getOwnerContext();
  await db.scheduledMessage.deleteMany({ where: { id, propertyId, state: "PENDING" } });
  revalidatePath("/messages");
  return { ok: true };
}
