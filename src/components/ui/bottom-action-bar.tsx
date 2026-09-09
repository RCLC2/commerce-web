import * as React from "react";
import { cn } from "@/lib/utils";

export function BottomActionBar({ className, children, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("sticky bottom-0 z-20 border-t border-border-subtle bg-surface-raised/95 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur", className)} {...props}>
      <div className="mx-auto flex max-w-6xl gap-2">{children}</div>
    </div>
  );
}
