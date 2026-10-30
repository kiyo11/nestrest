import Link from "next/link";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import { getOwnerContext } from "@/lib/context";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { StatusBadge } from "@/components/status-badge.skeleton";
import { BookingEditForm } from "@/components/bookings/booking-edit-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";

export const dynamic = "force-dynamic";

const STATUS_MAP = { CONFIRMED: "confirmed", COMPLETED: "completed", CANCELLED: "cancelled" } as const;
const NODE_COLOR: Record<string, string> = {
  SYNC_CREATED: "bg-info",
  SYNC_UPDATED: "bg-info",
  SYNC_CANCELLED: "bg-destructive",
  EMAIL_SENT: "bg-primary",
  EMAIL_STATUS: "bg-success",
  TASK_CREATED: "bg-warning",
  TASK_UPDATED: "bg-warning",
  EDITED: "bg-muted-foreground",
  ENRICHED: "bg-primary",
  NOTE: "bg-muted-foreground",
};

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { propertyId, property } = await getOwnerContext();
  const booking = await db.booking.findFirst({
    where: { id, propertyId },
    include: { guest: true, activities: { orderBy: { createdAt: "desc" } } },
  });
  if (!booking) notFound();

  const first = decrypt(booking.guest?.firstName ?? null) ?? "";
  const last = decrypt(booking.guest?.lastName ?? null) ?? "";
  const email = decrypt(booking.guest?.email ?? null) ?? "";
  const phone = decrypt(booking.guest?.phone ?? null) ?? "";
  const name = [first, last].filter(Boolean).join(" ") || booking.summary || "Guest";
  const ci = DateTime.fromJSDate(booking.checkIn, { zone: property.timezone });
  const co = DateTime.fromJSDate(booking.checkOut, { zone: property.timezone });
  const nights = Math.round(co.diff(ci, "days").days);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/bookings" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Bookings
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
        <StatusBadge domain="booking" status={STATUS_MAP[booking.status]} />
        <Badge variant="outline" className="text-airbnb">
          {booking.source}
        </Badge>
      </div>
      <p className="font-mono text-xs text-muted-foreground">
        {booking.reservationCode ? `${booking.reservationCode} · ` : ""}
        {ci.toFormat("LLL d")} → {co.toFormat("LLL d")} · {nights} nights
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Alert variant="info">
              <ShieldCheck className="h-4 w-4" />
              <div>Your edits here are protected from Airbnb sync.</div>
            </Alert>
            <BookingEditForm
              initial={{
                bookingId: booking.id,
                firstName: first,
                lastName: last,
                email,
                phone,
                payout: booking.payout ? String(booking.payout) : "",
                ownerNotes: booking.ownerNotes ?? "",
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Activity timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {booking.activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <ol className="flex flex-col gap-3">
                {booking.activities.map((a) => (
                  <li key={a.id} className="flex gap-3">
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${NODE_COLOR[a.type] ?? "bg-muted-foreground"}`} />
                    <div>
                      <p className="text-sm">{a.message}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {DateTime.fromJSDate(a.createdAt, { zone: property.timezone }).toFormat("LLL d, HH:mm")}
                        {a.actorId ? " · owner" : " · system"}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
