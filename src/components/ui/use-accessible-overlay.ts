"use client";

import { useEffect, useRef } from "react";

let activeOverlayCount = 0;
let overflowBeforeOverlay = "";
const overlayStack: { id: symbol; element: HTMLElement }[] = [];

export function useAccessibleOverlay(open: boolean, onClose: () => void, dialogRef: React.RefObject<HTMLElement | null>) {
  const previousFocus = useRef<HTMLElement | null>(null);
  const overlayID = useRef(Symbol("commerce-overlay"));
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const currentOverlayID = overlayID.current;
    const dialog = dialogRef.current;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (activeOverlayCount === 0) {
      overflowBeforeOverlay = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    activeOverlayCount += 1;
    // React runs child effects first when nested dialogs mount together.
    const descendantIndex = overlayStack.findIndex((overlay) => dialog.contains(overlay.element));
    const entry = { id: currentOverlayID, element: dialog };
    if (descendantIndex >= 0) overlayStack.splice(descendantIndex, 0, entry);
    else overlayStack.push(entry);
    const frame = window.requestAnimationFrame(() => {
      if (overlayStack.at(-1)?.id !== currentOverlayID) return;
      const focusable = dialogRef.current?.querySelector<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
      (focusable ?? dialogRef.current)?.focus();
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (overlayStack.at(-1)?.id !== currentOverlayID) return;
      if (event.key === "Escape") {
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
      const stackIndex = overlayStack.findIndex((overlay) => overlay.id === currentOverlayID);
      if (stackIndex >= 0) overlayStack.splice(stackIndex, 1);
      activeOverlayCount = Math.max(0, activeOverlayCount - 1);
      if (activeOverlayCount === 0) document.body.style.overflow = overflowBeforeOverlay;
      previousFocus.current?.focus();
    };
  }, [dialogRef, open]);
}
