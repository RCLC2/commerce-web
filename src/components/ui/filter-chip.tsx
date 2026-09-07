"use client";

import type { ButtonHTMLAttributes } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function FilterChip({ selected = false, className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn("inline-flex min-h-11 sm:min-h-9 cursor-pointer items-center shrink-0 gap-1 whitespace-nowrap rounded-full border px-3 text-xs font-bold transition-[background-color,border-color,color] duration-[var(--commerce-motion-fast)] disabled:cursor-not-allowed disabled:opacity-45", selected ? "border-action-primary bg-action-secondary text-action-primary-pressed not-disabled:hover:bg-action-primary/15" : "border-border-interactive bg-surface-raised text-content-secondary not-disabled:hover:border-action-primary not-disabled:hover:bg-action-secondary not-disabled:hover:text-action-primary", className)}
      {...props}
    >
      <Check className={cn("size-3.5 shrink-0", !selected && "invisible")} aria-hidden="true" />{children}
    </button>
  );
}
