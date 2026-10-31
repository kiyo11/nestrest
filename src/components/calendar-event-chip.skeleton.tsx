import { cn } from "@/lib/utils";

/**
 * Calendar event chip / span bar.
 * Airbnb reservation = solid coral; manual block = violet with diagonal hatch.
 * `continuation` controls rounding so multi-day bars read as one span.
 * Requires tailwind.config colors: airbnb / manual (see ui-spec §1).
 */
export interface CalendarEventChipProps {
  label: string;
  source: "airbnb" | "manual";
  continuation?: "start" | "middle" | "end" | "single";
  selected?: boolean;
  onClick?: () => void;
}

export function CalendarEventChip({
  label,
  source,
  continuation = "single",
  selected,
  onClick,
}: CalendarEventChipProps) {
  const rounding =
    continuation === "single"
      ? "rounded-md"
      : continuation === "start"
        ? "rounded-l-md"
        : continuation === "end"
          ? "rounded-r-md"
          : "rounded-none";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${source === "airbnb" ? "Airbnb reservation" : "Manual block"}: ${label}`}
      className={cn(
        "flex h-6 w-full items-center gap-1 truncate px-2 text-xs font-medium transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        rounding,
        source === "airbnb"
          ? "bg-airbnb/15 text-airbnb border border-airbnb/30 hover:bg-airbnb/25"
          : "bg-manual/15 text-manual border border-manual/30 hover:bg-manual/25 [background-image:repeating-linear-gradient(45deg,transparent,transparent_4px,hsl(var(--source-manual)/0.12)_4px,hsl(var(--source-manual)/0.12)_8px)]",
        selected && "ring-2 ring-ring ring-offset-1",
      )}
    >
      {/* dot carries meaning in addition to color (a11y) */}
      <span
        className={cn("h-1.5 w-1.5 shrink-0 rounded-full", source === "airbnb" ? "bg-airbnb" : "bg-manual")}
        aria-hidden
      />
      <span className="truncate">{label}</span>
    </button>
  );
}
