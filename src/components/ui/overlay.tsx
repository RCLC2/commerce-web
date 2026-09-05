"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

let activeOverlayCount = 0;
let overflowBeforeOverlay = "";
const overlayStack: symbol[] = [];

function useAccessibleOverlay(open: boolean, onClose: () => void, dialogRef: React.RefObject<HTMLElement | null>) {
  const previousFocus = useRef<HTMLElement | null>(null);
  const overlayID = useRef(Symbol("commerce-overlay"));
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const currentOverlayID = overlayID.current;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (activeOverlayCount === 0) {
      overflowBeforeOverlay = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    activeOverlayCount += 1;
    overlayStack.push(currentOverlayID);
    const frame = window.requestAnimationFrame(() => {
      const focusable = dialogRef.current?.querySelector<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
      (focusable ?? dialogRef.current)?.focus();
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (overlayStack.at(-1) !== currentOverlayID) return;
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleKeyDown);
      const stackIndex = overlayStack.lastIndexOf(currentOverlayID);
      if (stackIndex >= 0) overlayStack.splice(stackIndex, 1);
      activeOverlayCount = Math.max(0, activeOverlayCount - 1);
      if (activeOverlayCount === 0) document.body.style.overflow = overflowBeforeOverlay;
      previousFocus.current?.focus();
    };
  }, [dialogRef, open]);
}

type OverlayProps = { open: boolean; onClose: () => void; title: string; description?: string; children: React.ReactNode; className?: string };

export function Dialog({ open, onClose, title, description, children, className }: OverlayProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const titleID = useId();
  const descriptionID = useId();
  useAccessibleOverlay(open, onClose, dialogRef);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[var(--commerce-z-modal)] grid place-items-center p-4" role="presentation">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="대화상자 닫기" onClick={onClose} />
      <section ref={dialogRef} tabIndex={-1} className={cn("relative z-10 w-full max-w-md rounded-feature bg-surface-raised p-5 shadow-float", className)} role="dialog" aria-modal="true" aria-labelledby={titleID} aria-describedby={description ? descriptionID : undefined}>
        <div className="flex items-start gap-3"><div className="min-w-0 flex-1"><h2 id={titleID} className="text-lg font-black text-content-primary">{title}</h2>{description ? <p id={descriptionID} className="mt-1 text-sm leading-6 text-content-secondary">{description}</p> : null}</div><Button size="icon" variant="ghost" aria-label="대화상자 닫기" onClick={onClose}><X className="size-5" /></Button></div>
        <div className="mt-5">{children}</div>
      </section>
    </div>
  );
}

export function BottomSheet({ open, onClose, title, description, children, className }: OverlayProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const titleID = useId();
  const descriptionID = useId();
  useAccessibleOverlay(open, onClose, dialogRef);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[var(--commerce-z-modal)] flex items-end" role="presentation">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="바텀시트 닫기" onClick={onClose} />
      <section ref={dialogRef} tabIndex={-1} className={cn("relative z-10 max-h-[88vh] w-full overflow-y-auto rounded-t-feature bg-surface-raised px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 shadow-float", className)} role="dialog" aria-modal="true" aria-labelledby={titleID} aria-describedby={description ? descriptionID : undefined}>
        <div className="mx-auto h-1 w-9 rounded-full bg-border-strong" />
        <div className="mt-4 flex items-start gap-3"><div className="min-w-0 flex-1"><h2 id={titleID} className="text-lg font-black text-content-primary">{title}</h2>{description ? <p id={descriptionID} className="mt-1 text-sm leading-6 text-content-secondary">{description}</p> : null}</div><Button size="icon" variant="ghost" aria-label="바텀시트 닫기" onClick={onClose}><X className="size-5" /></Button></div>
        <div className="mt-5">{children}</div>
      </section>
    </div>
  );
}
