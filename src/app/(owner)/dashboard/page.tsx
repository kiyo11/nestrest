import Link from "next/link";
import { CalendarCheck, DollarSign, LogIn, ListChecks, AlertTriangle, XCircle, CheckCircle2 } from "lucide-react";
import { getOwnerContext } from "@/lib/context";
import { getDashboard } from "@/lib/services/dashboard";
import { KpiTile } from "@/components/kpi-tile.skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { user, propertyId, property } = await getOwnerContext();
  const d = await getDashboard(propertyId, property.timezone);
  const greeting = (user.email.split("@")[0] || "there").replace(/^\w/, (c) => c.toUpperCase());

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Good day, {greeting}</h1>
        <p className="text-sm text-muted-foreground">State of {property.name}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiTile label="Occupancy (MTD)" value={`${d.occupancyPct}%`} icon={CalendarCheck} />
        <KpiTile label="Revenue MTD" value={`$${d.revenueMtd.toLocaleString()}`} icon={DollarSign} />
        <KpiTile
          label="Check-ins · 7d"
          value={String(d.checkInsNext7)}
          icon={LogIn}
          trend={d.nextCheckInLabel ? { direction: "up", text: `next: ${d.nextCheckInLabel}` } : undefined}
        />
        <KpiTile
          label="Open tasks"
          value={String(d.openTasks)}
          icon={ListChecks}
          tone={d.overdueTasks > 0 ? "warning" : "default"}
          trend={d.overdueTasks > 0 ? { direction: "down", text: `${d.overdueTasks} overdue` } : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Action items</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {d.actionItems.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" /> You&apos;re all caught up
              </div>
            ) : (
              d.actionItems.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                >
                  <span className="flex items-center gap-2 text-sm">
                    {a.severity === "destructive" ? (
                      <XCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-warning" />
                    )}
                    {a.label}
                  </span>
                  <Button asChild size="sm" variant="outline">
                    <Link href={a.href}>Resolve</Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Next 7 days</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {d.upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing scheduled this week.</p>
            ) : (
              d.upcoming.map((e, i) => (
                <div key={i} className="flex items-center gap-3 py-1 text-sm">
                  <span className="w-20 font-mono text-xs text-muted-foreground">{e.date}</span>
                  <span
                    className={
                      e.type === "checkin" ? "font-medium text-primary" : "font-medium text-muted-foreground"
                    }
                  >
                    {e.type === "checkin" ? "▸ check-in" : "◂ check-out"}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
