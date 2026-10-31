import { cn } from "@/lib/utils";

/**
 * Status badge for booking / task / email-delivery states.
 * Color + dot + text label (never color alone — WCAG). Wraps shadcn Badge visually.
 */
type BookingStatus = "confirmed" | "completed" | "cancelled";
type TaskStatus = "todo" | "in_progress" | "done";
type EmailStatus = "sent" | "delivered" | "bounced";

export type StatusKind =
  | { domain: "booking"; status: BookingStatus }
  | { domain: "task"; status: TaskStatus }
  | { domain: "email"; status: EmailStatus };

const STYLES: Record<string, { label: string; cls: string }> = {
  "booking:confirmed": { label: "Confirmed", cls: "bg-primary/10 text-primary border-primary/20" },
  "booking:completed": { label: "Completed", cls: "bg-muted text-muted-foreground border-border" },
  "booking:cancelled": { label: "Cancelled", cls: "bg-transparent text-destructive border-destructive/40" },
  "task:todo": { label: "To do", cls: "bg-transparent text-muted-foreground border-border" },
  "task:in_progress": { label: "In progress", cls: "bg-warning/10 text-warning border-warning/30" },
  "task:done": { label: "Done", cls: "bg-success/10 text-success border-success/30" },
  "email:sent": { label: "Sent", cls: "bg-muted text-muted-foreground border-border" },
  "email:delivered": { label: "Delivered", cls: "bg-success/10 text-success border-success/30" },
  "email:bounced": { label: "Bounced", cls: "bg-destructive/10 text-destructive border-destructive/30" },
};

export function StatusBadge(props: StatusKind) {
  const key = `${props.domain}:${props.status}`;
  const { label, cls } = STYLES[key];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        cls,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden />
      {label}
    </span>
  );
}
