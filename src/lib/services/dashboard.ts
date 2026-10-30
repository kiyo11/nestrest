import { DateTime } from "luxon";
import { db } from "../db";

export interface DashboardData {
  occupancyPct: number;
  revenueMtd: number;
  checkInsNext7: number;
  nextCheckInLabel: string | null;
  openTasks: number;
  overdueTasks: number;
  actionItems: ActionItem[];
  upcoming: UpcomingEvent[];
}

export interface ActionItem {
  kind: "missing_email" | "overdue_task" | "sync_failed";
  severity: "warning" | "destructive";
  label: string;
  href: string;
}

export interface UpcomingEvent {
  date: string; // ISO date
  type: "checkin" | "checkout";
  label: string;
}

export function overlapNights(start: Date, end: Date, monthStart: Date, monthEnd: Date): number {
  const s = Math.max(start.getTime(), monthStart.getTime());
  const e = Math.min(end.getTime(), monthEnd.getTime());
  if (e <= s) return 0;
  return Math.round((e - s) / (24 * 60 * 60 * 1000));
}

export async function getDashboard(propertyId: string, tz: string): Promise<DashboardData> {
  const now = DateTime.now().setZone(tz);
  const monthStart = now.startOf("month");
  const monthEnd = now.endOf("month");
  const msStart = monthStart.toJSDate();
  const msEnd = monthEnd.toJSDate();

  const [bookings, blocks, property, tasks] = await Promise.all([
    db.booking.findMany({
      where: { propertyId, status: { in: ["CONFIRMED", "COMPLETED"] } },
      include: { guest: true },
    }),
    db.calendarBlock.findMany({ where: { propertyId } }),
    db.property.findUnique({ where: { id: propertyId } }),
    db.cleaningTask.findMany({ where: { propertyId } }),
  ]);

  const daysInMonth = monthEnd.diff(monthStart, "days").days;
  const blockedNights = blocks.reduce(
    (sum, b) => sum + overlapNights(b.start, b.end, msStart, msEnd),
    0,
  );
  const bookedNights = bookings.reduce(
    (sum, b) => sum + overlapNights(b.checkIn, b.checkOut, msStart, msEnd),
    0,
  );
  const availableNights = Math.max(1, Math.round(daysInMonth) - blockedNights);
  const occupancyPct = Math.min(100, Math.round((bookedNights / availableNights) * 100));

  const revenueMtd = bookings
    .filter((b) => b.checkOut >= msStart && b.checkOut <= msEnd)
    .reduce((sum, b) => sum + (b.payout ? Number(b.payout) : 0), 0);

  const in7 = now.plus({ days: 7 });
  const checkIns = bookings
    .filter((b) => b.status === "CONFIRMED")
    .filter((b) => {
      const d = DateTime.fromJSDate(b.checkIn, { zone: tz });
      return d >= now.startOf("day") && d <= in7;
    })
    .sort((a, b) => a.checkIn.getTime() - b.checkIn.getTime());

  const upcoming: UpcomingEvent[] = [];
  for (const b of bookings) {
    if (b.status === "CANCELLED") continue;
    const ci = DateTime.fromJSDate(b.checkIn, { zone: tz });
    const co = DateTime.fromJSDate(b.checkOut, { zone: tz });
    const name = b.guest?.firstName ? "guest" : (b.summary ?? "Reservation");
    if (ci >= now.startOf("day") && ci <= in7)
      upcoming.push({ date: ci.toISODate()!, type: "checkin", label: name });
    if (co >= now.startOf("day") && co <= in7)
      upcoming.push({ date: co.toISODate()!, type: "checkout", label: name });
  }
  upcoming.sort((a, b) => a.date.localeCompare(b.date));

  const openTasks = tasks.filter((t) => t.status !== "DONE").length;
  const todayStart = now.startOf("day").toJSDate();
  const overdueTasks = tasks.filter(
    (t) => t.status !== "DONE" && t.dueDate < todayStart,
  ).length;

  const actionItems: ActionItem[] = [];
  const missingEmail = bookings.filter(
    (b) => b.status === "CONFIRMED" && !b.guest?.email,
  ).length;
  if (missingEmail > 0)
    actionItems.push({
      kind: "missing_email",
      severity: "warning",
      label: `${missingEmail} booking${missingEmail > 1 ? "s" : ""} missing guest email`,
      href: "/bookings",
    });
  if (overdueTasks > 0)
    actionItems.push({
      kind: "overdue_task",
      severity: "warning",
      label: `${overdueTasks} turnover task${overdueTasks > 1 ? "s" : ""} overdue`,
      href: "/tasks",
    });
  if (property?.lastSyncError)
    actionItems.push({
      kind: "sync_failed",
      severity: "destructive",
      label: `iCal sync failed: ${property.lastSyncError.slice(0, 60)}`,
      href: "/calendar",
    });

  return {
    occupancyPct,
    revenueMtd,
    checkInsNext7: checkIns.length,
    nextCheckInLabel: checkIns[0]
      ? DateTime.fromJSDate(checkIns[0].checkIn, { zone: tz }).toFormat("ccc")
      : null,
    openTasks,
    overdueTasks,
    actionItems,
    upcoming,
  };
}
