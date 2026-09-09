import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const surfaceVariants = cva("rounded-surface border", {
  variants: {
    tone: {
      default: "border-border-subtle bg-surface-raised shadow-card",
      subtle: "border-transparent bg-surface-subtle",
      outlined: "border-border-strong bg-surface-raised",
    },
    padding: {
      none: "",
      sm: "p-4",
      md: "p-5",
      lg: "p-6",
    },
  },
  defaultVariants: { tone: "default", padding: "md" },
});

export type SurfaceProps = React.ComponentPropsWithoutRef<"div"> & VariantProps<typeof surfaceVariants>;

export function Surface({ className, tone, padding, ...props }: SurfaceProps) {
  return <div className={cn(surfaceVariants({ tone, padding }), className)} {...props} />;
}

type ListRowProps = React.ComponentPropsWithoutRef<"div"> & {
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
};

export function ListRow({ className, leading, trailing, title, description, ...props }: ListRowProps) {
  return (
    <div className={cn("flex min-h-16 items-center gap-3 px-4 py-3", className)} {...props}>
      {leading ? <div className="grid size-10 shrink-0 place-items-center rounded-control bg-surface-subtle text-content-secondary">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-content-primary">{title}</p>
        {description ? <p className="mt-0.5 truncate text-xs leading-5 text-content-secondary">{description}</p> : null}
      </div>
      {trailing ? <div className="shrink-0 text-sm text-content-secondary">{trailing}</div> : null}
    </div>
  );
}
