import Link from "next/link";
import { DateTime } from "luxon";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { getOwnerContext } from "@/lib/context";
import { db } from "@/lib/db";
import { CalendarEventChip } from "@/components/calendar-event-chip.skeleton";
import { NewBlockDialog } from "@/components/calendar/new-block-dialog";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface DayEvent {
  label: string;
  source: "airbnb" | "manual";
  bookingId?: string;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { propertyId, property } = await getOwnerContext();
  const { m } = await searchParams;
  const tz = property.timezone;
  const anchor = (m ? DateTime.fromISO(m + "-01", { zone: tz }) : DateTime.now().setZone(tz)).startOf(
    "month",
  );
  const gridStart = anchor.startOf("week"); // Monday
  const gridEnd = anchor.endOf("month").endOf("week");

  const [bookings, blocks] = await Promise.all([
    db.booking.findMany({
      where: {
        propertyId,
        status: { in: ["CONFIRMED", "COMPLETED"] },
        checkIn: { lt: gridEnd.toJSDate() },
        checkOut: { gt: gridStart.toJSDate() },
      },
    }),
    db.calendarBlock.findMany({
      where: { propertyId, start: { lt: gridEnd.toJSDate() }, end: { gt: gridStart.toJSDate() } },
    }),
  ]);

  // Map ISO date -> events occupying that day.
  const byDay = new Map<string, DayEvent[]>();
  const push = (iso: string, e: DayEvent) => {
    const arr = byDay.get(iso) ?? [];
    arr.push(e);
    byDay.set(iso, arr);
  };
  for (const b of bookings) {
    let cur = DateTime.fromJSDate(b.checkIn, { zone: tz }).startOf("day");
    const out = DateTime.fromJSDate(b.checkOut, { zone: tz }).startOf("day");
    while (cur < out) {
      push(cur.toISODate()!, { label: b.summary ?? "Reservation", source: "airbnb", bookingId: b.id });
      cur = cur.plus({ days: 1 });
    }
  }
  for (const bl of blocks) {
    let cur = DateTime.fromJSDate(bl.start, { zone: tz }).startOf("day");
    const end = DateTime.fromJSDate(bl.end, { zone: tz }).startOf("day");
    while (cur < end) {
      push(cur.toISODate()!, { label: bl.reason.toLowerCase(), source: "manual" });
      cur = cur.plus({ days: 1 });
    }
  }

  const days: DateTime[] = [];
  for (let c = gridStart; c <= gridEnd; c = c.plus({ days: 1 })) days.push(c);

  const prev = anchor.minus({ months: 1 }).toFormat("yyyy-MM");
  const next = anchor.plus({ months: 1 }).toFormat("yyyy-MM");
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" aria-label="Previous month">
            <Link href={`/calendar?m=${prev}`}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <span className="min-w-36 text-center text-sm font-medium">{anchor.toFormat("LLLL yyyy")}</span>
          <Button asChild variant="ghost" size="icon" aria-label="Next month">
            <Link href={`/calendar?m=${next}`}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
          <NewBlockDialog />
        </div>
      </div>

      {property.lastSyncError ? (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <div>
            Last sync failed ({property.lastSyncError}). Showing last known data. Use “Sync now”.
          </div>
        </Alert>
      ) : null}

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-airbnb" /> Airbnb reservation
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-manual" /> Manual block
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <div className="grid grid-cols-7 border-b border-border bg-muted/40">
          {weekdays.map((w) => (
            <div key={w} className="px-2 py-1.5 text-center text-xs font-medium text-muted-foreground">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const iso = day.toISODate()!;
            const inMonth = day.month === anchor.month;
            const events = byDay.get(iso) ?? [];
            return (
              <div
                key={iso}
                role="gridcell"
                className={`min-h-24 border-b border-r border-border p-1 ${
                  inMonth ? "" : "bg-muted/30 text-muted-foreground"
                }`}
              >
                <div className="px-1 text-xs tabular-nums">{day.day}</div>
                <div className="mt-1 flex flex-col gap-1">
                  {events.slice(0, 3).map((e, i) =>
                    e.bookingId ? (
                      <Link key={i} href={`/bookings/${e.bookingId}`}>
                        <CalendarEventChip label={e.label} source={e.source} />
                      </Link>
                    ) : (
                      <CalendarEventChip key={i} label={e.label} source={e.source} />
                    ),
                  )}
                  {events.length > 3 ? (
                    <span className="px-1 text-[10px] text-muted-foreground">+{events.length - 3} more</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
