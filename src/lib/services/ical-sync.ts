import ical from "node-ical";
import { db } from "../db";
import { decrypt } from "../crypto";
import { logActivity } from "./activity";
import { enqueueForBooking, recompute } from "./scheduler";
import { ensureTurnoverTask, updateTurnoverDueDate } from "./tasks";

export interface SyncResult {
  propertyId: string;
  ok: boolean;
  created: number;
  updated: number;
  cancelled: number;
  error?: string;
}

// Parse an Airbnb reservation code out of a VEVENT SUMMARY / DESCRIPTION / URL.
function parseReservationCode(...fields: (string | undefined)[]): string | null {
  const re = /\b(H[A-Z0-9]{8,})\b/;
  for (const f of fields) {
    if (!f) continue;
    const m = f.match(re);
    if (m) return m[1];
  }
  return null;
}

async function fetchWithRetry(url: string): Promise<Record<string, ical.CalendarComponent>> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await ical.async.fromURL(url);
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, attempt === 0 ? 1000 : 4000));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("iCal fetch failed");
}

// TODO(test-writer): fixture ICS covering create, date-change (triggers
//   recompute + task due update), vanished UID (soft-cancel), and reactivation.
// TODO(qe): confirm owner-edited fields (payout, guestId, ownerNotes) are never
//   overwritten on update — this is the core "edits survive sync" guarantee.
export async function syncProperty(propertyId: string): Promise<SyncResult> {
  const property = await db.property.findUnique({ where: { id: propertyId } });
  if (!property) return { propertyId, ok: false, created: 0, updated: 0, cancelled: 0, error: "no property" };

  const icalUrl = decrypt(property.icalUrl);
  if (!icalUrl) {
    return { propertyId, ok: false, created: 0, updated: 0, cancelled: 0, error: "no iCal URL configured" };
  }

  let parsed: Record<string, ical.CalendarComponent>;
  try {
    parsed = await fetchWithRetry(icalUrl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown sync error";
    // Never destroy data: keep old lastSyncAt, record the error.
    await db.property.update({ where: { id: propertyId }, data: { lastSyncError: msg } });
    await logActivity({ propertyId, type: "SYNC_UPDATED", message: `Sync failed: ${msg}` });
    return { propertyId, ok: false, created: 0, updated: 0, cancelled: 0, error: msg };
  }

  const events = Object.values(parsed).filter(
    (e): e is ical.VEvent => e.type === "VEVENT" && !!e.uid && !!e.start && !!e.end,
  );
  const seenUids = new Set<string>();
  let created = 0;
  let updated = 0;

  for (const ev of events) {
    const uid = ev.uid;
    seenUids.add(uid);
    const checkIn = new Date(ev.start);
    const checkOut = new Date(ev.end);
    const summary = typeof ev.summary === "string" ? ev.summary : undefined;
    const reservationCode = parseReservationCode(
      summary,
      typeof ev.description === "string" ? ev.description : undefined,
      typeof ev.url === "string" ? ev.url : undefined,
    );

    const existing = await db.booking.findUnique({
      where: { propertyId_icalUid: { propertyId, icalUid: uid } },
    });

    if (!existing) {
      const booking = await db.booking.create({
        data: {
          propertyId,
          source: "AIRBNB",
          status: "CONFIRMED",
          icalUid: uid,
          reservationCode,
          summary: summary ?? "Airbnb reservation",
          checkIn,
          checkOut,
          lastSyncedAt: new Date(),
        },
      });
      created += 1;
      await logActivity({
        propertyId,
        bookingId: booking.id,
        type: "SYNC_CREATED",
        message: "Booking created from Airbnb sync",
      });
      await enqueueForBooking(booking.id);
      await ensureTurnoverTask(booking.id);
    } else {
      const datesChanged =
        existing.checkIn.getTime() !== checkIn.getTime() ||
        existing.checkOut.getTime() !== checkOut.getTime();
      const reactivated = existing.status === "CANCELLED";
      // Only sync-owned fields are written — owner edits (payout, guest, notes) survive.
      await db.booking.update({
        where: { id: existing.id },
        data: {
          checkIn,
          checkOut,
          summary: summary ?? existing.summary,
          reservationCode: reservationCode ?? existing.reservationCode,
          status: reactivated ? "CONFIRMED" : existing.status,
          cancelledAt: reactivated ? null : existing.cancelledAt,
          lastSyncedAt: new Date(),
        },
      });
      if (datesChanged || reactivated) {
        updated += 1;
        await logActivity({
          propertyId,
          bookingId: existing.id,
          type: "SYNC_UPDATED",
          message: datesChanged ? "Dates updated from Airbnb sync" : "Reactivated from Airbnb sync",
        });
        await recompute(existing.id);
        await updateTurnoverDueDate(existing.id, checkOut);
      }
    }
  }

  // Cancellation: confirmed Airbnb bookings whose UID vanished from the feed.
  const toCancel = await db.booking.findMany({
    where: { propertyId, source: "AIRBNB", status: "CONFIRMED", icalUid: { notIn: [...seenUids] } },
  });
  let cancelled = 0;
  for (const b of toCancel) {
    await db.booking.update({
      where: { id: b.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    await logActivity({
      propertyId,
      bookingId: b.id,
      type: "SYNC_CANCELLED",
      message: "Reservation no longer in Airbnb feed — marked cancelled",
    });
    cancelled += 1;
  }

  await db.property.update({
    where: { id: propertyId },
    data: { lastSyncAt: new Date(), lastSyncError: null },
  });

  return { propertyId, ok: true, created, updated, cancelled };
}

export async function syncAll(): Promise<SyncResult[]> {
  const props = await db.property.findMany({ where: { icalUrl: { not: null } }, select: { id: true } });
  const results: SyncResult[] = [];
  for (const p of props) results.push(await syncProperty(p.id));
  return results;
}
