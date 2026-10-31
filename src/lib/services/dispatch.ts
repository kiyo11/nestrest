import { db } from "../db";
import { decrypt } from "../crypto";
import { renderTemplate, fmtDate, type MergeContext } from "../merge";
import { logActivity } from "./activity";
import { sendEmail } from "./mailer";

export interface DispatchResult {
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
  reaped: number;
}

// How long a row may sit in SENDING before we assume the sender crashed and
// reset it to PENDING for retry. Must exceed the route maxDuration (60s) plus
// Resend latency; a generous margin avoids reaping an in-flight send.
export const SENDING_STALE_MS = 10 * 60 * 1000; // 10 minutes

// Reset rows stuck in SENDING past the staleness window back to PENDING so a
// crashed/timed-out send is retried. A row that actually sent transitions
// SENDING->SENT inside the same tick and never becomes stale.
export async function reapStaleSending(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - SENDING_STALE_MS);
  const stale = await db.scheduledMessage.updateMany({
    where: { state: "SENDING", claimedAt: { lt: cutoff } },
    data: { state: "PENDING", claimedAt: null },
  });
  return stale.count;
}

// Fire all PENDING scheduled messages whose time has arrived.
//
// Exactly-once + crash safety: a row is first atomically claimed PENDING->SENDING
// (conditional updateMany; only one racing run wins). The real send happens while
// the row is SENDING, and only a confirmed Resend success transitions it to SENT
// (with resendId). Guard/send failures move SENDING->SKIPPED/FAILED. A crash
// between claim and final update leaves the row in SENDING, where the reaper
// recovers it to PENDING on a later tick — no lost sends, and no observable SENT
// row ever exists without a resendId.
export async function dispatchDue(now = new Date()): Promise<DispatchResult> {
  const result: DispatchResult = { processed: 0, sent: 0, skipped: 0, failed: 0, reaped: 0 };

  // Recover crashed sends first so they are eligible in this same tick.
  result.reaped = await reapStaleSending(now);

  const due = await db.scheduledMessage.findMany({
    where: { state: "PENDING", scheduledFor: { lte: now } },
    include: { booking: { include: { guest: true, property: true } }, template: true },
  });

  for (const msg of due) {
    // Claim the row atomically; overlapping cron runs cannot both win this.
    const claimed = await db.scheduledMessage.updateMany({
      where: { id: msg.id, state: "PENDING" },
      data: { state: "SENDING", claimedAt: now },
    });
    if (claimed.count === 0) continue; // another run grabbed it

    result.processed += 1;
    const { booking, template } = msg;
    const tz = booking.property.timezone;
    const guestEmail = decrypt(booking.guest?.email ?? null);

    if (!guestEmail) {
      await db.scheduledMessage.update({
        where: { id: msg.id },
        data: { state: "SKIPPED", error: "No guest email on booking" },
      });
      result.skipped += 1;
      continue;
    }

    const ctx: MergeContext = {
      guest_first_name: decrypt(booking.guest?.firstName ?? null),
      checkin_date: fmtDate(booking.checkIn, tz),
      checkout_date: fmtDate(booking.checkOut, tz),
      door_code: decrypt(booking.property.doorCode),
      wifi: booking.property.wifiInfo,
    };
    const body = renderTemplate(template.body, ctx);
    const subject = renderTemplate(template.subject, ctx);

    if (body.missing.length > 0 || subject.missing.length > 0) {
      const missing = [...new Set([...body.missing, ...subject.missing])].join(", ");
      await db.scheduledMessage.update({
        where: { id: msg.id },
        data: { state: "FAILED", error: `Unresolved merge fields: ${missing}` },
      });
      result.failed += 1;
      continue;
    }

    try {
      const sent = await sendEmail(guestEmail, subject.text, body.text.replace(/\n/g, "<br/>"));
      // Only now, after a confirmed send, is the row observably SENT.
      await db.scheduledMessage.update({
        where: { id: msg.id },
        data: { state: "SENT", sentAt: new Date(), resendId: sent.id },
      });
      await logActivity({
        propertyId: booking.propertyId,
        bookingId: booking.id,
        type: "EMAIL_SENT",
        message: `Scheduled email sent: ${template.name}`,
      });
      result.sent += 1;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "send failed";
      await db.scheduledMessage.update({
        where: { id: msg.id },
        data: { state: "FAILED", error: errMsg },
      });
      result.failed += 1;
    }
  }

  return result;
}
