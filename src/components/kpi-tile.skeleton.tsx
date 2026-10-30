import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * KPI stat tile — Dashboard.
 * Markup + visual states only. Engineer supplies data + onClick deep-link.
 */
export interface KpiTileProps {
  label: string;
  value: string;              // pre-formatted (e.g. "78%", "$4,250") — render tabular-nums
  icon?: LucideIcon;
  trend?: { direction: "up" | "down"; text: string };
  tone?: "default" | "warning"; // warning subtitle for "1 overdue" etc.
  loading?: boolean;
  onClick?: () => void;
}

export function KpiTile({ label, value, icon: Icon, trend, tone = "default", loading, onClick }: KpiTileProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-border p-4 md:p-5">
        <div className="h-3 w-20 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-8 w-24 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-3 w-28 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group block w-full rounded-lg border border-border bg-card p-4 text-left transition md:p-5",
        "hover:shadow-sm hover:border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {Icon ? <Icon className="h-4 w-4 text-muted-foreground" aria-hidden /> : null}
      </div>
      <div className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </div>
      {trend ? (
        <div
          className={cn(
            "mt-2 text-xs tabular-nums",
            tone === "warning"
              ? "text-warning"
              : trend.direction === "up"
                ? "text-success"
                : "text-destructive",
          )}
        >
          <span aria-hidden>{trend.direction === "up" ? "▲" : "▼"}</span> {trend.text}
        </div>
      ) : null}
    </button>
  );
}
