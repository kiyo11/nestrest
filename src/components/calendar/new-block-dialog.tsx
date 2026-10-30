"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { checkBlockConflicts, createManualBlock } from "@/actions/bookings";

export function NewBlockDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");
  const [reason, setReason] = React.useState<"MAINTENANCE" | "PERSONAL" | "OTHER">("MAINTENANCE");
  const [note, setNote] = React.useState("");
  const [conflicts, setConflicts] = React.useState<{ label: string; range: string }[]>([]);
  const [confirmed, setConfirmed] = React.useState(false);

  React.useEffect(() => {
    if (!start || !end) return setConflicts([]);
    let active = true;
    checkBlockConflicts(start, end).then((r) => active && setConflicts(r.conflicts));
    return () => {
      active = false;
    };
  }, [start, end]);

  async function onSubmit() {
    if (conflicts.length > 0 && !confirmed) {
      setConfirmed(true);
      return;
    }
    setLoading(true);
    try {
      await createManualBlock({ start, end, reason, note });
      toast.success("Block created.");
      setOpen(false);
      setStart("");
      setEnd("");
      setNote("");
      setConfirmed(false);
      router.refresh();
    } catch {
      toast.error("Could not create block.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Block
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New manual block</DialogTitle>
          <DialogDescription>Mark dates unavailable (maintenance or personal use).</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="start">Start</Label>
              <Input id="start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="end">End</Label>
              <Input id="end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as typeof reason)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                <SelectItem value="PERSONAL">Personal use</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note">Note</Label>
            <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {conflicts.length > 0 ? (
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <div>
                Overlaps {conflicts.length} reservation(s):{" "}
                {conflicts.map((c) => `${c.label} (${c.range})`).join("; ")}.
                {confirmed ? " Click again to save anyway." : ""}
              </div>
            </Alert>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            loading={loading}
            disabled={!start || !end}
            variant={conflicts.length > 0 && confirmed ? "destructive" : "default"}
          >
            {conflicts.length > 0 && !confirmed ? "Review conflict" : "Save block"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
