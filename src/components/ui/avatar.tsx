import { cn } from "@/lib/utils";

export function Avatar({ initials, className }: { initials: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary",
        className,
      )}
      aria-hidden
    >
      {initials}
    </span>
  );
}
