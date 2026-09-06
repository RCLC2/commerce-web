import * as React from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const notices = {
  info: { icon: Info, className: "border-status-info-border bg-status-info-subtle text-content-primary" },
  success: { icon: CheckCircle2, className: "border-status-positive-border bg-status-positive-subtle text-content-primary" },
  warning: { icon: TriangleAlert, className: "border-status-warning-border bg-status-warning-subtle text-content-primary" },
  error: { icon: AlertCircle, className: "border-status-negative-border bg-status-negative-subtle text-content-primary" },
} as const;

export type NoticeProps = React.ComponentPropsWithoutRef<"div"> & {
  tone?: keyof typeof notices;
  title?: React.ReactNode;
};

export function Notice({ tone = "info", title, className, children, ...props }: NoticeProps) {
  const { icon: Icon, className: toneClassName } = notices[tone];
  return (
    <div className={cn("flex gap-3 rounded-control border px-4 py-3 text-sm leading-5", toneClassName, className)} role={tone === "error" ? "alert" : "status"} {...props}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>{title ? <p className="font-bold">{title}</p> : null}{children ? <div className={title ? "mt-1" : undefined}>{children}</div> : null}</div>
    </div>
  );
}
