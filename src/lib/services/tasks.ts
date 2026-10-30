import { db } from "../db";
import { logActivity } from "./activity";

const DEFAULT_CHECKLIST = [
  "Strip & start laundry",
  "Bathrooms",
  "Kitchen reset",
  "Vacuum & mop",
  "Restock toiletries",
  "Fresh linens",
  "Trash out",
  "Final photos",
];

// Auto-create a turnover task due on checkout for a confirmed booking (idempotent).
export async function ensureTurnoverTask(bookingId: string): Promise<string | null> {
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.status !== "CONFIRMED") return null;

  const existing = await db.cleaningTask.findFirst({ where: { bookingId } });
  if (existing) return existing.id;

  // Find the next check-in for back-to-back turnover context.
  const next = await db.booking.findFirst({
    where: {
      propertyId: booking.propertyId,
      status: "CONFIRMED",
      checkIn: { gte: booking.checkOut },
      id: { not: booking.id },
    },
    orderBy: { checkIn: "asc" },
  });

  const task = await db.cleaningTask.create({
    data: {
      propertyId: booking.propertyId,
      bookingId: booking.id,
      dueDate: booking.checkOut,
      nextCheckIn: next?.checkIn ?? null,
      items: {
        create: DEFAULT_CHECKLIST.map((label, order) => ({ label, order })),
      },
    },
  });
  await logActivity({
    propertyId: booking.propertyId,
    bookingId: booking.id,
    type: "TASK_CREATED",
    message: "Turnover task auto-created for checkout",
  });
  return task.id;
}

// Keep an open task's due date aligned with the booking's checkout.
export async function updateTurnoverDueDate(bookingId: string, newCheckout: Date): Promise<void> {
  const task = await db.cleaningTask.findFirst({
    where: { bookingId, status: { not: "DONE" } },
  });
  if (!task) return;
  if (task.dueDate.getTime() === newCheckout.getTime()) return;
  await db.cleaningTask.update({ where: { id: task.id }, data: { dueDate: newCheckout } });
  await logActivity({
    propertyId: task.propertyId,
    bookingId,
    type: "TASK_UPDATED",
    message: "Turnover due date updated to new checkout date",
  });
}
