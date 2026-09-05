"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export function QuantityStepper({ value, min = 1, max, onValueChange, className, label = "수량" }: { value: number; min?: number; max?: number; onValueChange: (value: number) => void; className?: string; label?: string }) {
  const decrementDisabled = value <= min;
  const incrementDisabled = max !== undefined && value >= max;
  return (
    <div className={cn("inline-flex items-center rounded-control border border-border-interactive bg-surface-raised shadow-card", className)} role="group" aria-label={label}>
      <Button type="button" size="icon" variant="ghost" aria-label={`${label} 줄이기`} disabled={decrementDisabled} onClick={() => onValueChange(Math.max(min, value - 1))}><Minus className="size-4" aria-hidden="true" /></Button>
      <output className="grid min-w-9 place-items-center px-1 text-sm font-bold text-content-primary" aria-live="polite">{value}</output>
      <Button type="button" size="icon" variant="ghost" aria-label={`${label} 늘리기`} disabled={incrementDisabled} onClick={() => onValueChange(max === undefined ? value + 1 : Math.min(max, value + 1))}><Plus className="size-4" aria-hidden="true" /></Button>
    </div>
  );
}
