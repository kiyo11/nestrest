import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva("relative w-full rounded-lg border p-3 text-sm [&>svg]:mr-2 flex gap-2", {
  variants: {
    variant: {
      default: "bg-card text-foreground border-border",
      info: "bg-info/10 text-info border-info/30",
      warning: "bg-warning/10 text-warning-foreground border-warning/40 [&>svg]:text-warning",
      destructive: "bg-destructive/10 text-destructive border-destructive/40",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Alert({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>) {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}
