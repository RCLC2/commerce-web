import * as React from "react";
import { cn } from "@/lib/utils";

export function BottomActionBar({ className, children, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("sticky bottom-[var(--commerce-bottom-nav-height)] z-20 border-t border-border-subtle bg-surface-raised px-4 pb-5 pt-3", className)} {...props}>
      <div className="mx-auto flex max-w-6xl gap-2">{children}</div>
    </div>
  );
}
