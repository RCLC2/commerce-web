import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex min-h-5 items-center rounded-md px-1.5 py-0.5 text-[11px] font-bold leading-4", {
  variants: {
    tone: {
      neutral: "bg-surface-subtle text-content-secondary",
      brand: "bg-action-secondary text-action-primary-pressed",
      promotion: "bg-promotion-subtle text-promotion",
      positive: "bg-status-positive-subtle text-status-positive",
      warning: "bg-status-warning-subtle text-status-warning",
      negative: "bg-status-negative-subtle text-status-negative",
      inverse: "bg-content-primary text-content-inverse",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export type BadgeProps = React.ComponentPropsWithoutRef<"span"> & VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
