import { DateTime } from "luxon";
import { getOwnerContext } from "@/lib/context";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { MessagesClient, type BookingOpt, type ScheduledRow, type TemplateRow } from "./messages-client";

export const dynamic = "force-dynamic";

function triggerLabel(
  anchor: string | null,
  dir: string | null,
  hours: number | null,
): string {
  if (!anchor || !dir || hours == null) return "manual";
  return `${hours}h ${dir.toLowerCase()} ${anchor === "CHECKIN" ? "check-in" : "checkout"}`;
}

export default async function MessagesPage() {
  const { propertyId, property } = await getOwnerContext();
  const [templates, bookings, scheduled] = await Promise.all([
    db.messageTemplate.findMany({ where: { propertyId }, orderBy: { createdAt: "asc" } }),
    db.booking.findMany({
      where: { propertyId, status: "CONFIRMED" },
      include: { guest: true },
      orderBy: { checkIn: "asc" },
    }),
    db.scheduledMessage.findMany({
      where: { propertyId },
      include: { template: true, booking: { include: { guest: true } } },
      orderBy: { scheduledFor: "asc" },
    }),
  ]);

  const templateRows: TemplateRow[] = templates.map((t) => ({
    id: t.id,
    name: t.name,
    subject: t.subject,
    body: t.body,
    anchor: t.anchor,
    offsetDir: t.offsetDir,
    offsetHours: t.offsetHours,
    trigger: triggerLabel(t.anchor, t.offsetDir, t.offsetHours),
  }));

  const bookingOpts: BookingOpt[] = bookings.map((b) => {
    const first = decrypt(b.guest?.firstName ?? null);
    return {
      id: b.id,
      label: `${first || b.summary || "Guest"} · ${DateTime.fromJSDate(b.checkIn, { zone: property.timezone }).toFormat("LLL d")}`,
      hasEmail: !!decrypt(b.guest?.email ?? null),
    };
  });

  const scheduledRows: ScheduledRow[] = scheduled.map((s) => {
    const first = decrypt(s.booking.guest?.firstName ?? null);
    return {
      id: s.id,
      when: DateTime.fromJSDate(s.scheduledFor, { zone: property.timezone }).toFormat("LLL d HH:mm"),
      templateName: s.template.name,
      guest: first || s.booking.summary || "Guest",
      state: s.state,
      hasEmail: !!decrypt(s.booking.guest?.email ?? null),
    };
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
      <MessagesClient templates={templateRows} bookings={bookingOpts} scheduled={scheduledRows} />
    </div>
  );
}
