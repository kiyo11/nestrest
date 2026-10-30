"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toggleChecklistItem, completeTask } from "@/actions/tasks";

interface Item {
  id: string;
  label: string;
  done: boolean;
}

export function HelperChecklist({
  taskId,
  initialStatus,
  items: initialItems,
}: {
  taskId: string;
  initialStatus: "TODO" | "IN_PROGRESS" | "DONE";
  items: Item[];
}) {
  const router = useRouter();
  const [items, setItems] = React.useState(initialItems);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [completing, setCompleting] = React.useState(false);
  const doneCount = items.filter((i) => i.done).length;

  async function toggle(id: string, done: boolean) {
    const prev = items;
    setItems((p) => p.map((i) => (i.id === id ? { ...i, done } : i))); // optimistic
    try {
      await toggleChecklistItem({ itemId: id, done });
    } catch {
      setItems(prev);
      toast.error("Couldn't save — retrying.");
    }
  }

  async function finish() {
    setCompleting(true);
    try {
      await completeTask(taskId);
      toast.success("Turnover complete.");
      router.push("/helper");
      router.refresh();
    } catch {
      toast.error("Couldn't complete task.");
      setCompleting(false);
    }
  }

  function onComplete() {
    if (doneCount < items.length) setConfirmOpen(true);
    else finish();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2" aria-live="polite">
        <Progress value={items.length ? (doneCount / items.length) * 100 : 0} className="flex-1" />
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {doneCount}/{items.length}
        </span>
      </div>

      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {items.map((i) => (
          <li key={i.id} className="flex items-center gap-3 px-3 py-3">
            <Checkbox
              id={i.id}
              checked={i.done}
              onCheckedChange={(c) => toggle(i.id, c === true)}
              className="h-6 w-6"
            />
            <label htmlFor={i.id} className={`flex-1 text-sm ${i.done ? "text-muted-foreground line-through" : ""}`}>
              {i.label}
            </label>
          </li>
        ))}
      </ul>

      <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md border-t border-border bg-background p-4">
        <Button className="h-12 w-full text-base" onClick={onComplete} loading={completing} disabled={initialStatus === "DONE"}>
          {initialStatus === "DONE" ? "Completed" : "Mark turnover complete"}
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{items.length - doneCount} items unchecked</DialogTitle>
            <DialogDescription>Complete anyway?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={finish} loading={completing}>Complete anyway</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
