"use client";

import { useId, useRef } from "react";
import { cn } from "@/lib/utils";

export type TabItem = {
  value: string;
  label: string;
  count?: number;
  disabled?: boolean;
  content?: React.ReactNode;
};

export function Tabs({ items, value, onValueChange, className, ariaLabel = "탭" }: { items: readonly TabItem[]; value: string; onValueChange: (value: string) => void; className?: string; ariaLabel?: string }) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const id = useId();
  const activeItem = items.find((item) => item.value === value);

  function focusTab(index: number) {
    const enabledIndexes = items.map((item, itemIndex) => item.disabled ? -1 : itemIndex).filter((itemIndex) => itemIndex >= 0);
    const target = enabledIndexes[index] ?? enabledIndexes[0];
    if (target === undefined) return;
    onValueChange(items[target].value);
    tabRefs.current[target]?.focus();
  }

  return (
    <>
      <div className={cn("flex gap-1 overflow-x-auto border-b border-border-subtle", className)} role="tablist" aria-label={ariaLabel}>
        {items.map((item, itemIndex) => {
        const selected = item.value === value;
        const tabId = `${id}-tab-${itemIndex}`;
        const panelId = `${id}-panel-${itemIndex}`;
        return (
          <button
            key={item.value}
            ref={(element) => { tabRefs.current[itemIndex] = element; }}
            id={tabId}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={item.content ? panelId : undefined}
            tabIndex={selected ? 0 : -1}
            disabled={item.disabled}
            className={cn("relative shrink-0 cursor-pointer px-3 py-3 text-sm font-bold text-content-secondary transition-[color] duration-[var(--commerce-motion-fast)] disabled:cursor-not-allowed disabled:opacity-40", selected && "text-content-primary after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-action-primary")}
            onClick={() => onValueChange(item.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") { event.preventDefault(); focusTab((items.filter((entry) => !entry.disabled).findIndex((entry) => entry.value === item.value) + 1) % items.filter((entry) => !entry.disabled).length); }
              if (event.key === "ArrowLeft") { event.preventDefault(); const enabled = items.filter((entry) => !entry.disabled); focusTab((enabled.findIndex((entry) => entry.value === item.value) - 1 + enabled.length) % enabled.length); }
              if (event.key === "Home") { event.preventDefault(); focusTab(0); }
              if (event.key === "End") { event.preventDefault(); focusTab(items.filter((entry) => !entry.disabled).length - 1); }
            }}
          >
            {item.label}{item.count === undefined ? null : <span className="ml-1 text-xs text-content-tertiary">{item.count}</span>}
          </button>
        );
        })}
      </div>
      {activeItem?.content ? <div id={`${id}-panel-${items.indexOf(activeItem)}`} className="pt-4" role="tabpanel" aria-labelledby={`${id}-tab-${items.indexOf(activeItem)}`} tabIndex={0}>{activeItem.content}</div> : null}
    </>
  );
}
