import type { Booking, MessageTemplate, ScheduleAnchor, ScheduleOffsetDir } from "@prisma/client";
import { db } from "../db";

// Compute the absolute fire time for a schedule rule against a booking.
export function computeScheduledFor(
  booking: Pick<Booking, "checkIn" | "checkOut">,
  anchor: ScheduleAnchor,
  dir: ScheduleOffsetDir,
  offsetHours: number,
): Date {
  const base = anchor === "CHECKIN" ? booking.checkIn : booking.checkOut;
  const ms = offsetHours * 60 * 60 * 1000;
  return new Date(base.getTime() + (dir === "BEFORE" ? -ms : ms));
}

// Enqueue one ScheduledMessage per template that carries a trigger, for a booking.
// Idempotent via dedupeKey = `${bookingId}:${templateId}`.
export async function enqueueForBooking(bookingId: string): Promise<number> {
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.status !== "CONFIRMED") return 0;

  const templates = await db.messageTemplate.findMany({
    where: {
      propertyId: booking.propertyId,
      anchor: { not: null },
      offsetDir: { not: null },
      offsetHours: { not: null },
    },
  });

  let created = 0;
  for (const t of templates) {
    if (t.anchor == null || t.offsetDir == null || t.offsetHours == null) continue;
    const dedupeKey = `${booking.id}:${t.id}`;
    const scheduledFor = computeScheduledFor(booking, t.anchor, t.offsetDir, t.offsetHours);
    const res = await db.scheduledMessage.upsert({
      where: { dedupeKey },
      // Only (re)write timing while still pending; never touch sent rows.
      update: {},
      create: {
        propertyId: booking.propertyId,
        bookingId: booking.id,
        templateId: t.id,
        anchor: t.anchor,
        offsetDir: t.offsetDir,
        offsetHours: t.offsetHours,
        scheduledFor,
        dedupeKey,
      },
    });
    if (res) created += 1;
  }
  return created;
}

// Recompute scheduledFor for all still-PENDING messages of a booking (date change).
export async function recompute(bookingId: string): Promise<number> {
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return 0;
  const pending = await db.scheduledMessage.findMany({
    where: { bookingId, state: "PENDING" },
  });
  let updated = 0;
  for (const m of pending) {
    const scheduledFor = computeScheduledFor(booking, m.anchor, m.offsetDir, m.offsetHours);
    if (scheduledFor.getTime() !== m.scheduledFor.getTime()) {
      await db.scheduledMessage.update({ where: { id: m.id }, data: { scheduledFor } });
      updated += 1;
    }
  }
  return updated;
}

export type { MessageTemplate };
