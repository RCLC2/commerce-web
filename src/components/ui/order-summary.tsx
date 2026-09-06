import * as React from "react";
import { cn } from "@/lib/utils";
import { Surface } from "./surface";

export type OrderSummaryItem = { label: React.ReactNode; value: React.ReactNode; emphasis?: "default" | "positive" | "negative" };

export function OrderSummary({ title = "주문 금액", items, totalLabel = "총 결제 예정", total, className, footer }: { title?: React.ReactNode; items: readonly OrderSummaryItem[]; totalLabel?: React.ReactNode; total: React.ReactNode; className?: string; footer?: React.ReactNode }) {
  return (
    <Surface className={cn("h-fit", className)}>
      <h2 className="font-bold text-content-primary">{title}</h2>
      <dl className="mt-5 space-y-3 text-sm">
        {items.map((item, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <dt className="text-content-secondary">{item.label}</dt>
            <dd className={cn("shrink-0 font-bold text-content-primary", item.emphasis === "positive" && "text-status-positive", item.emphasis === "negative" && "text-status-negative")}>{item.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 flex items-end justify-between gap-4 border-t border-border-subtle pt-5">
        <p className="font-bold text-content-primary">{totalLabel}</p>
        <strong className="text-xl font-black tracking-tight text-content-primary">{total}</strong>
      </div>
      {footer ? <div className="mt-5">{footer}</div> : null}
    </Surface>
  );
}
