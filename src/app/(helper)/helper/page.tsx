import Link from "next/link";
import { DateTime } from "luxon";
import { requireRole, requirePropertyId } from "@/lib/rbac";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge.skeleton";

export const dynamic = "force-dynamic";

const STATUS_MAP = { TODO: "todo", IN_PROGRESS: "in_progress", DONE: "done" } as const;

export default async function HelperHome() {
  const user = await requireRole(["HELPER", "OWNER"]);
  const propertyId = await requirePropertyId(user.id);
  const property = await db.property.findUniqueOrThrow({ where: { id: propertyId } });

  // Projection: only tasks assigned to this helper, no PII/payout fields selected.
  const tasks = await db.cleaningTask.findMany({
    where: { propertyId, assigneeId: user.id, status: { not: "DONE" } },
    include: { items: { select: { done: true } } },
    orderBy: { dueDate: "asc" },
  });

  const today = DateTime.now().setZone(property.timezone).toISODate();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-medium text-muted-foreground">
          Today · {DateTime.now().setZone(property.timezone).toFormat("ccc LLL d")}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Your turnovers</h1>
      </div>

      {tasks.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Nothing scheduled 🎉
        </Card>
      ) : (
        tasks.map((t) => {
          const due = DateTime.fromJSDate(t.dueDate, { zone: property.timezone });
          const done = t.items.filter((i) => i.done).length;
          const isToday = due.toISODate() === today;
          return (
            <Link key={t.id} href={`/helper/tasks/${t.id}`}>
              <Card className="transition hover:shadow-sm">
                <CardContent className="flex flex-col gap-2 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold">
                      {due.toFormat("HH:mm")} Turnover {isToday ? "· today" : `· ${due.toFormat("LLL d")}`}
                    </span>
                    <StatusBadge domain="task" status={STATUS_MAP[t.status]} />
                  </div>
                  <p className="text-sm text-muted-foreground">{property.address}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {done}/{t.items.length} done
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })
      )}
    </div>
  );
}
