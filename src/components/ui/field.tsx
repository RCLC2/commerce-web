import * as React from "react";
import { cn } from "@/lib/utils";

type FieldProps = React.ComponentPropsWithoutRef<"div"> & {
  label: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
};

export function Field({ label, htmlFor, hint, error, required, className, children, ...props }: FieldProps) {
  const hintID = React.useId();
  const describedBy = error || hint ? hintID : undefined;
  const fieldControl = React.isValidElement<{ "aria-describedby"?: string }>(children)
    ? React.cloneElement(children, {
      "aria-describedby": [children.props["aria-describedby"], describedBy].filter(Boolean).join(" ") || undefined,
    })
    : children;
  return (
    <div className={cn("grid gap-2", className)} {...props}>
      <label className="flex items-center gap-1 text-sm font-bold text-content-primary" htmlFor={htmlFor}>
        {label}
        {required ? <span className="text-action-primary" aria-hidden="true">*</span> : null}
      </label>
      {fieldControl}
      {error ? <p id={hintID} className="text-xs font-medium text-status-negative" role="alert">{error}</p> : hint ? <p id={hintID} className="text-xs leading-5 text-content-secondary">{hint}</p> : null}
    </div>
  );
}
