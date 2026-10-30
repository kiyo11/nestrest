"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOwnerContext } from "@/lib/context";
import { encryptGuest } from "@/lib/guest";
import { logActivity } from "@/lib/services/activity";
import { recompute } from "@/lib/services/scheduler";
import { ensureTurnoverTask, updateTurnoverDueDate } from "@/lib/services/tasks";

const editSchema = z.object({
  bookingId: z.string().min(1),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().or(z.literal("")).optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
  payout: z.coerce.number().nonnegative().optional(),
  ownerNotes: z.string().optional(),
});

// Edit owner-owned booking fields + guest PII. These survive iCal sync.
export async function editBooking(input: z.infer<typeof editSchema>) {
  const { user, propertyId } = await getOwnerContext();
  const data = editSchema.parse(input);

  const booking = await db.booking.findFirst({
    where: { id: data.bookingId, propertyId },
    include: { guest: true },
  });
  if (!booking) throw new Error(`Booking ${data.bookingId} not found in this property.`);

  const guestData = encryptGuest({
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email || null,
    phone: data.phone,
    notes: data.notes,
  });

  let guestId = booking.guestId;
  if (guestId) {
    await db.guest.update({ where: { id: guestId }, data: guestData });
  } else {
    const guest = await db.guest.create({ data: { propertyId, ...guestData } });
    guestId = guest.id;
  }

  await db.booking.update({
    where: { id: booking.id },
    data: {
      guestId,
      payout: data.payout != null ? data.payout : booking.payout,
      ownerNotes: data.ownerNotes ?? booking.ownerNotes,
    },
  });

  await logActivity({
    propertyId,
    bookingId: booking.id,
    type: "EDITED",
    actorId: user.id,
    message: "Owner edited booking details",
  });
  revalidatePath(`/bookings/${booking.id}`);
  revalidatePath("/bookings");
  return { ok: true };
}

const blockSchema = z.object({
  start: z.string().min(1),
  end: z.string().min(1),
  reason: z.enum(["MAINTENANCE", "PERSONAL", "OTHER"]),
  note: z.string().optional(),
});

export interface ConflictCheck {
  conflicts: { label: string; range: string }[];
}

// Detect reservations overlapping a candidate block range (for the UI warning).
export async function checkBlockConflicts(start: string, end: string): Promise<ConflictCheck> {
  const { propertyId } = await getOwnerContext();
  const s = new Date(start);
  const e = new Date(end);
  const overlapping = await db.booking.findMany({
    where: { propertyId, status: "CONFIRMED", checkIn: { lt: e }, checkOut: { gt: s } },
  });
  return {
    conflicts: overlapping.map((b) => ({
      label: b.summary ?? "Reservation",
      range: `${b.checkIn.toDateString()} – ${b.checkOut.toDateString()}`,
    })),
  };
}

export async function createManualBlock(input: z.infer<typeof blockSchema>) {
  const { user, propertyId } = await getOwnerContext();
  const data = blockSchema.parse(input);
  const block = await db.calendarBlock.create({
    data: {
      propertyId,
      start: new Date(data.start),
      end: new Date(data.end),
      reason: data.reason,
      note: data.note,
    },
  });
  await logActivity({
    propertyId,
    type: "NOTE",
    actorId: user.id,
    message: `Manual block created (${data.reason.toLowerCase()})`,
  });
  revalidatePath("/calendar");
  return { ok: true, id: block.id };
}

export async function deleteManualBlock(blockId: string) {
  const { propertyId } = await getOwnerContext();
  await db.calendarBlock.deleteMany({ where: { id: blockId, propertyId } });
  revalidatePath("/calendar");
  return { ok: true };
}

export async function cancelBooking(bookingId: string) {
  const { user, propertyId } = await getOwnerContext();
  const booking = await db.booking.findFirst({ where: { id: bookingId, propertyId } });
  if (!booking) throw new Error("Booking not found.");
  await db.booking.update({
    where: { id: booking.id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  await logActivity({
    propertyId,
    bookingId: booking.id,
    type: "EDITED",
    actorId: user.id,
    message: "Booking cancelled by owner",
  });
  revalidatePath(`/bookings/${booking.id}`);
  revalidatePath("/bookings");
  return { ok: true };
}

export async function createTurnoverTask(bookingId: string) {
  const { propertyId } = await getOwnerContext();
  const booking = await db.booking.findFirst({ where: { id: bookingId, propertyId } });
  if (!booking) throw new Error("Booking not found.");
  const id = await ensureTurnoverTask(booking.id);
  revalidatePath("/tasks");
  return { ok: true, id };
}

// Re-align scheduled messages + turnover task when owner edits dates manually.
export async function syncDerived(bookingId: string) {
  const { propertyId } = await getOwnerContext();
  const booking = await db.booking.findFirst({ where: { id: bookingId, propertyId } });
  if (!booking) return { ok: false };
  await recompute(booking.id);
  await updateTurnoverDueDate(booking.id, booking.checkOut);
  return { ok: true };
}
