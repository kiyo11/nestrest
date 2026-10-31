import type { ActivityType } from "@prisma/client";
import { db } from "../db";

interface LogInput {
  propertyId: string;
  bookingId?: string | null;
  type: ActivityType;
  actorId?: string | null;
  message: string; // must never contain raw guest PII
}

export async function logActivity(input: LogInput) {
  return db.activityLog.create({
    data: {
      propertyId: input.propertyId,
      bookingId: input.bookingId ?? null,
      type: input.type,
      actorId: input.actorId ?? null,
      message: input.message,
    },
  });
}
