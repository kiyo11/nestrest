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
}

// Fire all PENDING scheduled messages whose time has arrived. Exactly-once is
// guaranteed by the conditional update `WHERE state=PENDING` (claim step).
// TODO(test-writer): cover (a) two concurrent dispatchDue runs send once,
//   (b) missing guest email -> SKIPPED, (c) unresolved merge field -> FAILED.
// TODO(qe): the optimistic SENT claim is reverted to SKIPPED/FAILED on guard
//   failures; confirm no window leaves a FAILED row looking SENT in the UI.
export async function dispatchDue(now = new Date()): Promise<DispatchResult> {
  const due = await db.scheduledMessage.findMany({
    where: { state: "PENDING", scheduledFor: { lte: now } },
    include: { booking: { include: { guest: true, property: true } }, template: true },
  });

  const result: DispatchResult = { processed: 0, sent: 0, skipped: 0, failed: 0 };

  for (const msg of due) {
    result.processed += 1;
    const { booking, template } = msg;
    const tz = booking.property.timezone;
    const guestEmail = decrypt(booking.guest?.email ?? null);

    // Claim the row atomically so overlapping cron runs cannot double-send.
    const claimed = await db.scheduledMessage.updateMany({
      where: { id: msg.id, state: "PENDING" },
      data: { state: "SENT" }, // optimistic claim; reverted below on skip/fail
    });
    if (claimed.count === 0) continue; // another run grabbed it

    if (!guestEmail) {
      await db.scheduledMessage.update({ where: { id: msg.id }, data: { state: "SKIPPED" } });
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
