"use client";

import { useId, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { useAccessibleOverlay } from "./use-accessible-overlay";

type OverlayProps = { open: boolean; onClose: () => void; title: string; description?: string; children: React.ReactNode; className?: string };

export function Drawer({ open, onClose, title, children, className, id }: OverlayProps & { id?: string }) {
  const dialogRef = useRef<HTMLElement>(null);
  const titleID = useId();
  useAccessibleOverlay(open, onClose, dialogRef);
  return (
    <div className="commerce-drawer fixed inset-0 z-[var(--commerce-z-modal)]" data-open={open} inert={!open} aria-hidden={!open}>
      <button type="button" tabIndex={-1} className="commerce-drawer-backdrop absolute inset-0 bg-black/40" aria-label={`${title} 닫기`} onClick={onClose} />
      <aside ref={dialogRef} id={id} tabIndex={-1} role="dialog" aria-modal={open ? true : undefined} aria-labelledby={titleID} className={cn("commerce-drawer-panel absolute inset-y-0 left-0 flex w-[min(360px,88vw)] min-w-0 flex-col overflow-y-auto border-r border-border-subtle bg-surface-raised p-4 shadow-float", className)}>
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleID} className="text-lg font-bold">{title}</h2>
          <Button variant="ghost" size="icon" aria-label={`${title} 닫기`} onClick={onClose}><X size={20} /></Button>
        </div>
        {children}
      </aside>
    </div>
  );
}

export function Dialog({ open, onClose, title, description, children, className }: OverlayProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const titleID = useId();
  const descriptionID = useId();
  useAccessibleOverlay(open, onClose, dialogRef);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[var(--commerce-z-modal)] grid place-items-center p-4" role="presentation">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="대화상자 닫기" onClick={onClose} />
      <section ref={dialogRef} tabIndex={-1} className={cn("relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-feature bg-surface-raised p-5 shadow-float", className)} role="dialog" aria-modal="true" aria-labelledby={titleID} aria-describedby={description ? descriptionID : undefined}>
        <div className="flex items-start gap-3"><div className="min-w-0 flex-1"><h2 id={titleID} className="text-lg font-bold text-content-primary">{title}</h2>{description ? <p id={descriptionID} className="mt-1 text-sm leading-6 text-content-secondary">{description}</p> : null}</div><Button size="icon" variant="ghost" aria-label="대화상자 닫기" onClick={onClose}><X className="size-5" /></Button></div>
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
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="하단 창 닫기" onClick={onClose} />
      <section ref={dialogRef} tabIndex={-1} className={cn("relative z-10 max-h-[88vh] w-full overflow-y-auto rounded-t-feature bg-surface-raised px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 shadow-float", className)} role="dialog" aria-modal="true" aria-labelledby={titleID} aria-describedby={description ? descriptionID : undefined}>
        <div className="mx-auto h-1 w-9 rounded-full bg-border-strong" />
        <div className="mt-4 flex items-start gap-3"><div className="min-w-0 flex-1"><h2 id={titleID} className="text-lg font-bold text-content-primary">{title}</h2>{description ? <p id={descriptionID} className="mt-1 text-sm leading-6 text-content-secondary">{description}</p> : null}</div><Button size="icon" variant="ghost" aria-label="하단 창 닫기" onClick={onClose}><X className="size-5" /></Button></div>
        <div className="mt-5">{children}</div>
      </section>
    </div>
  );
}
