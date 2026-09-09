"use client";

import type { ButtonHTMLAttributes } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function FilterChip({ selected = false, variant = "filter", className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean; variant?: "filter" | "navigation" }) {
  const navigation = variant === "navigation";
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap px-3 text-xs font-bold transition-[background-color,border-color,color] duration-[var(--commerce-motion-fast)] disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-9",
        navigation ? "rounded-md border border-transparent" : "rounded-full border",
        selected
          ? navigation
            ? "bg-action-secondary text-action-primary-pressed not-disabled:hover:bg-action-primary/15"
            : "border-action-primary bg-action-secondary text-action-primary-pressed not-disabled:hover:bg-action-primary/15"
          : navigation
            ? "text-content-secondary not-disabled:hover:bg-surface-subtle not-disabled:hover:text-content-primary"
            : "border-border-interactive bg-surface-raised text-content-secondary not-disabled:hover:border-action-primary not-disabled:hover:bg-action-secondary not-disabled:hover:text-action-primary",
        className,
      )}
      {...props}
    >
      {!navigation ? <Check className={cn("size-3.5 shrink-0", !selected && "invisible")} aria-hidden="true" /> : null}{children}
    </button>
  );
}
