import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeading({ title, description, icon, eyebrow, className }: { title: ReactNode; description?: ReactNode; icon: ReactNode; eyebrow?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 items-start gap-3", className)}>
      <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-control bg-action-secondary text-action-primary [&>svg]:size-6">{icon}</span>
      <div className="min-w-0">
        {eyebrow ? <p className="text-xs font-bold text-action-primary">{eyebrow}</p> : null}
        <h1 className="text-2xl font-bold leading-tight text-content-primary md:text-3xl">{title}</h1>
        {description ? <p className="mt-2 text-sm leading-6 text-content-secondary">{description}</p> : null}
      </div>
    </div>
  );
}
