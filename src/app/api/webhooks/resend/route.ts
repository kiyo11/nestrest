import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/services/activity";

export const dynamic = "force-dynamic";

// Resend delivery-status webhook. Maps event types to MessageState and logs.
// TODO(qe): verify the Svix signature using RESEND_WEBHOOK_SECRET before trusting payloads.
export async function POST(req: Request) {
  const payload = (await req.json().catch(() => null)) as
    | { type?: string; data?: { email_id?: string } }
    | null;
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
    await db.scheduledMessage.update({ where: { id: msg.id }, data: { state } });
    await logActivity({
      propertyId: msg.propertyId,
      bookingId: msg.bookingId,
      type: "EMAIL_STATUS",
      message: `Delivery status: ${state.toLowerCase()}`,
    });
  }
  return NextResponse.json({ ok: true });
}
