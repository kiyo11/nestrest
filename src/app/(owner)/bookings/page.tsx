import Link from "next/link";
import { DateTime } from "luxon";
import { AlertTriangle } from "lucide-react";
import { getOwnerContext } from "@/lib/context";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { StatusBadge } from "@/components/status-badge.skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const STATUS_MAP = {
  CONFIRMED: "confirmed",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export default async function BookingsPage() {
  const { propertyId, property } = await getOwnerContext();
  const bookings = await db.booking.findMany({
    where: { propertyId },
    include: { guest: true },
    orderBy: { checkIn: "desc" },
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>
      {bookings.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No bookings yet — they&apos;ll appear after your first sync.
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Checkout</TableHead>
                <TableHead>Nights</TableHead>
                <TableHead>Payout</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((b) => {
                const first = decrypt(b.guest?.firstName ?? null);
                const last = decrypt(b.guest?.lastName ?? null);
                const email = decrypt(b.guest?.email ?? null);
                const ci = DateTime.fromJSDate(b.checkIn, { zone: property.timezone });
                const co = DateTime.fromJSDate(b.checkOut, { zone: property.timezone });
                const nights = Math.round(co.diff(ci, "days").days);
                const name = [first, last].filter(Boolean).join(" ") || b.summary || "Guest";
                return (
                  <TableRow key={b.id} className="cursor-pointer">
                    <TableCell>
                      <Link href={`/bookings/${b.id}`} className="flex items-center gap-1.5 font-medium">
                        {name}
                        {b.status === "CONFIRMED" && !email ? (
                          <AlertTriangle className="h-3.5 w-3.5 text-warning" aria-label="Missing guest email" />
                        ) : null}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{ci.toFormat("LLL d")}</TableCell>
                    <TableCell className="font-mono text-xs">{co.toFormat("LLL d")}</TableCell>
                    <TableCell className="tabular-nums">{nights}</TableCell>
                    <TableCell className="font-mono tabular-nums">
                      {b.payout ? `$${Number(b.payout).toLocaleString()}` : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge domain="booking" status={STATUS_MAP[b.status]} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
