import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/services/activity";
import { verifyResendSignature } from "@/lib/webhook-verify";

export const dynamic = "force-dynamic";

// Resend delivery-status webhook. Maps event types to MessageState and logs.
// The Svix signature is verified against RESEND_WEBHOOK_SECRET before any DB
// write; a missing secret fails closed in production.
export async function POST(req: Request) {
  const raw = await req.text();

  const verification = verifyResendSignature(raw, req.headers);
  if (!verification.ok) {
    return NextResponse.json({ ok: false, error: verification.reason }, { status: verification.status });
  }

  let payload: { type?: string; data?: { email_id?: string } } | null = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = null;
  }
  if (!payload?.type || !payload.data?.email_id) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const map: Record<string, "DELIVERED" | "BOUNCED"> = {
    "email.delivered": "DELIVERED",
    "email.bounced": "BOUNCED",
  };
  const state = map[payload.type];
  if (!state) return NextResponse.json({ ok: true, ignored: payload.type });

  const msg = await db.scheduledMessage.findFirst({
    where: { resendId: payload.data.email_id },
  });
  if (msg) {
    // Only advance from a live SENT/DELIVERED row. A late DELIVERED must never
    // clobber a terminal FAILED/BOUNCED row, nor resurrect a reverted send.
    const advanceable = msg.state === "SENT" || msg.state === "DELIVERED";
    if (advanceable) {
      await db.scheduledMessage.update({ where: { id: msg.id }, data: { state } });
      await logActivity({
        propertyId: msg.propertyId,
        bookingId: msg.bookingId,
        type: "EMAIL_STATUS",
        message: `Delivery status: ${state.toLowerCase()}`,
      });
    }
  }
  return NextResponse.json({ ok: true });
}
