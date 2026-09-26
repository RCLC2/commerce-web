import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type SearchFieldProps = Omit<React.ComponentPropsWithoutRef<"input">, "className"> & {
  /** Classes for the single visual field container. */
  className?: string;
  /** Classes for the native text input only. */
  inputClassName?: string;
  icon?: React.ReactNode;
  endAdornment?: React.ReactNode;
};

/**
 * A search-specific control whose container owns every visible interaction
 * state. The native input stays borderless so nested search UIs cannot create
 * a second hover or focus outline.
 */
export const SearchField = React.forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField({
  className,
  inputClassName,
  icon = <Search className="size-5 shrink-0 text-content-secondary" aria-hidden="true" />,
  endAdornment,
  ...inputProps
}, ref) {
  return (
    <div
      className={cn(
        "flex h-12 min-w-0 items-center gap-2 rounded-control border border-border-interactive bg-surface-raised px-3 text-content-primary transition-[border-color,box-shadow] duration-[var(--commerce-motion-normal)] ease-[var(--commerce-ease-out)] hover:border-action-primary focus-within:border-action-primary focus-within:ring-4 focus-within:ring-action-primary/10 motion-reduce:transition-none",
        className,
      )}
      data-slot="search-field"
    >
      {icon}
      <input
        ref={ref}
        className={cn(
          "min-w-0 flex-1 border-0 bg-transparent p-0 text-sm outline-none placeholder:text-content-tertiary",
          inputClassName,
        )}
        {...inputProps}
      />
      {endAdornment}
    </div>
  );
});
