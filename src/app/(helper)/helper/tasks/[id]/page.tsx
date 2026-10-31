import Link from "next/link";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { ChevronLeft } from "lucide-react";
import { requireRole, requirePropertyId } from "@/lib/rbac";
import { db } from "@/lib/db";
import { HelperChecklist } from "./checklist";

export const dynamic = "force-dynamic";

export default async function HelperTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole(["HELPER", "OWNER"]);
  const propertyId = await requirePropertyId(user.id);
  const property = await db.property.findUniqueOrThrow({ where: { id: propertyId } });

  const task = await db.cleaningTask.findFirst({
    // Helper may only open their own task — enforced server-side.
    where: {
      id,
      propertyId,
      ...(user.role === "HELPER" ? { assigneeId: user.id } : {}),
    },
    include: { items: { orderBy: { order: "asc" } } },
  });
  if (!task) notFound();

  const co = DateTime.fromJSDate(task.dueDate, { zone: property.timezone });
  const nextCi = task.nextCheckIn
    ? DateTime.fromJSDate(task.nextCheckIn, { zone: property.timezone })
    : null;

  return (
    <div className="flex flex-col gap-4 pb-24">
      <Link href="/helper" className="flex items-center gap-1 text-sm text-muted-foreground">
        <ChevronLeft className="h-4 w-4" /> Today
      </Link>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Turnover</h1>
        <p className="text-sm text-muted-foreground">{property.address}</p>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          Checkout {co.toFormat("HH:mm")}
          {nextCi ? ` → Next check-in ${nextCi.toFormat("HH:mm")}` : ""}
        </p>
      </div>

      {task.accessNotes ? (
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs font-medium text-muted-foreground">Access notes</p>
          <p className="text-sm">{task.accessNotes}</p>
        </div>
      ) : null}

      <HelperChecklist
        taskId={task.id}
        initialStatus={task.status}
        items={task.items.map((i) => ({ id: i.id, label: i.label, done: i.done }))}
      />
    </div>
  );
}
