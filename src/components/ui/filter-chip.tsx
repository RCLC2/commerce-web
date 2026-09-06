"use client";

import type { ButtonHTMLAttributes } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function FilterChip({ selected = false, className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn("inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full border px-3 text-xs font-bold transition-[background-color,border-color,color] duration-[var(--commerce-motion-fast)] disabled:cursor-not-allowed disabled:opacity-45", selected ? "border-action-primary bg-action-secondary text-action-primary-pressed" : "border-border-interactive bg-surface-raised text-content-secondary hover:border-action-primary hover:bg-action-secondary hover:text-action-primary", className)}
      {...props}
    >
      {selected ? <Check className="size-3.5" aria-hidden="true" /> : null}{children}
    </button>
  );
}
