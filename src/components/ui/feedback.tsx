import * as React from "react";
import { Inbox, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return <div className={cn("animate-pulse rounded-control bg-surface-subtle", className)} aria-hidden="true" {...props} />;
}

export function LoadingState({ className, label = "불러오는 중입니다." }: { className?: string; label?: string }) {
  return <div className={cn("flex min-h-28 items-center justify-center gap-2 text-sm font-medium text-content-secondary", className)} role="status"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />{label}</div>;
}

type EmptyStateProps = React.ComponentPropsWithoutRef<"div"> & {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
};

export function EmptyState({ icon = <Inbox className="size-7" />, title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <div className={cn("rounded-surface border border-dashed border-border-strong bg-surface-raised px-5 py-10 text-center", className)} {...props}>
      <div className="mx-auto grid size-12 place-items-center rounded-feature bg-surface-subtle text-content-secondary">{icon}</div>
      <p className="mt-4 text-sm font-bold text-content-primary">{title}</p>
      {description ? <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-content-secondary">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

type ToastProps = React.ComponentPropsWithoutRef<"div"> & {
  tone?: "default" | "success" | "error";
};

const toastTone = {
  default: "bg-content-primary text-content-inverse",
  success: "bg-status-positive text-content-inverse",
  error: "bg-status-negative text-content-inverse",
} as const;

export function Toast({ tone = "default", className, children, ...props }: ToastProps) {
  return <div className={cn("inline-flex min-h-11 items-center rounded-control px-4 py-2 text-sm font-bold shadow-float", toastTone[tone], className)} role="status" {...props}>{children}</div>;
}
