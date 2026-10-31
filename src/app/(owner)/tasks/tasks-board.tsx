"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/status-badge.skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assignTask, setTaskStatus } from "@/actions/tasks";

export interface TaskCard {
  id: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  due: string;
  overdue: boolean;
  done: number;
  total: number;
  assigneeId: string | null;
  assigneeName: string | null;
}
export interface HelperOpt {
  id: string;
  name: string;
}

const STATUS_MAP = { TODO: "todo", IN_PROGRESS: "in_progress", DONE: "done" } as const;
const COLUMNS: { key: TaskCard["status"]; title: string }[] = [
  { key: "TODO", title: "To do" },
  { key: "IN_PROGRESS", title: "In progress" },
  { key: "DONE", title: "Done" },
];

export function TasksBoard({ cards, helpers }: { cards: TaskCard[]; helpers: HelperOpt[] }) {
  const router = useRouter();

  async function reassign(taskId: string, value: string) {
    await assignTask(taskId, value === "none" ? null : value);
    toast.success("Assignment updated.");
    router.refresh();
  }
  async function move(taskId: string, status: TaskCard["status"]) {
    await setTaskStatus(taskId, status);
    router.refresh();
  }

  if (cards.length === 0)
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        No turnover tasks. One is created automatically on each checkout.
      </Card>
    );

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {COLUMNS.map((col) => {
        const items = cards.filter((c) => c.status === col.key);
        return (
          <div key={col.key} className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-muted-foreground">
              {col.title} <span className="tabular-nums">({items.length})</span>
            </h2>
            {items.map((t) => (
              <Card key={t.id}>
                <CardContent className="flex flex-col gap-2 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Due {t.due}</span>
                    <StatusBadge domain="task" status={STATUS_MAP[t.status]} />
                  </div>
                  {t.overdue ? <span className="text-xs font-medium text-warning">⚠ overdue</span> : null}
                  <div className="flex items-center gap-2">
                    <Progress value={t.total ? (t.done / t.total) * 100 : 0} className="flex-1" />
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {t.done}/{t.total}
                    </span>
                  </div>
                  <Select value={t.assigneeId ?? "none"} onValueChange={(v) => reassign(t.id, v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Assign…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {helpers.map((h) => (
                        <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-1">
                    {col.key !== "TODO" ? (
                      <Button size="sm" variant="ghost" onClick={() => move(t.id, "TODO")}>To do</Button>
                    ) : null}
                    {col.key !== "IN_PROGRESS" ? (
                      <Button size="sm" variant="ghost" onClick={() => move(t.id, "IN_PROGRESS")}>Start</Button>
                    ) : null}
                    {col.key !== "DONE" ? (
                      <Button size="sm" variant="ghost" onClick={() => move(t.id, "DONE")}>Done</Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );
      })}
    </div>
  );
}
