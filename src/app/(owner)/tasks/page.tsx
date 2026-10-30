import { DateTime } from "luxon";
import { getOwnerContext } from "@/lib/context";
import { db } from "@/lib/db";
import { TasksBoard, type TaskCard, type HelperOpt } from "./tasks-board";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const { propertyId, property } = await getOwnerContext();
  const [tasks, helpers] = await Promise.all([
    db.cleaningTask.findMany({
      where: { propertyId },
      include: { items: true, assignee: true },
      orderBy: { dueDate: "asc" },
    }),
    db.userProperty.findMany({
      where: { propertyId, role: "HELPER" },
      include: { user: true },
    }),
  ]);

  const now = Date.now();
  const cards: TaskCard[] = tasks.map((t) => ({
    id: t.id,
    status: t.status,
    due: DateTime.fromJSDate(t.dueDate, { zone: property.timezone }).toFormat("LLL d"),
    overdue: t.status !== "DONE" && t.dueDate.getTime() < now,
    done: t.items.filter((i) => i.done).length,
    total: t.items.length,
    assigneeId: t.assigneeId,
    assigneeName: t.assignee?.name ?? t.assignee?.email ?? null,
  }));

  const helperOpts: HelperOpt[] = helpers.map((h) => ({
    id: h.user.id,
    name: h.user.name ?? h.user.email,
  }));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Turnover tasks</h1>
      <TasksBoard cards={cards} helpers={helperOpts} />
    </div>
  );
}
