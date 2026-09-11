"use client";

import { Input } from "./ui/input";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { apiErrorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { displayLabel } from "@/lib/display-labels";
import { orderStatusLabel } from "@/lib/order-utils";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Notice } from "./ui/notice";

type ConsoleLink = {
  href: string;
  label: string;
};

export function ConsoleLayout({
  title,
  subtitle,
  links,
  sidebarHeader,
  sidebarFooter,
  children,
}: {
  title: string;
  subtitle?: string;
  links: ConsoleLink[];
  sidebarHeader?: React.ReactNode;
  sidebarFooter?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [mutationError, setMutationError] = useState<unknown>();
  useEffect(() => {
    const clearTimer = window.setTimeout(() => setMutationError(undefined), 0);
    const unsubscribe = queryClient.getMutationCache().subscribe((event) => {
      if (event.mutation?.state.status === "error") {
        setMutationError(event.mutation.state.error);
      } else if (event.mutation?.state.status === "pending" || event.mutation?.state.status === "success") {
        setMutationError(undefined);
      }
    });
    return () => {
      window.clearTimeout(clearTimer);
      unsubscribe();
    };
  }, [pathname, queryClient]);
  const activeQueries = queryClient.getQueryCache().getAll().filter(
    (query) => query.getObserversCount() > 0,
  );
  const activeQueryErrors = activeQueries.filter((query) => query.state.status === "error");
  return (
    <main className="mx-auto grid max-w-7xl gap-5 px-4 pb-24 pt-5 md:grid-cols-[208px_minmax(0,1fr)]">
      <aside className="h-fit min-w-0 rounded-surface border border-border-subtle bg-surface-raised p-3 md:sticky md:top-24">
        <div className="px-3 py-2">
          <h1 className="text-lg font-bold">{title}</h1>
          {subtitle ? <p className="mt-1 text-xs font-bold leading-5 text-content-secondary">{subtitle}</p> : null}
        </div>
        {sidebarHeader ? <div className="mb-3 px-1">{sidebarHeader}</div> : null}
        <nav className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-1">
          {links.map((link) => {
            const active = pathname === link.href || (!["/admin", "/seller"].includes(link.href) && pathname.startsWith(`${link.href}/`));
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-md border border-transparent px-3 py-2.5 text-sm font-bold text-content-secondary transition hover:bg-surface-subtle",
                  active && "border-action-primary bg-action-secondary text-action-primary shadow-card hover:bg-action-secondary",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        {sidebarFooter ? <div className="mt-4 border-t border-border-subtle pt-4">{sidebarFooter}</div> : null}
      </aside>
      <section className="min-w-0 overflow-hidden">
        {activeQueryErrors.length ? (
          <Notice tone="error" title="데이터를 불러오지 못했습니다." className="mb-4">
            <p>{apiErrorMessage(activeQueryErrors[0].state.error)}</p>
            <Button className="mt-3" variant="secondary" size="sm" onClick={() => void queryClient.refetchQueries({ type: "active" })}>다시 시도</Button>
          </Notice>
        ) : null}
        {mutationError ? (
          <Notice tone="error" title="작업을 완료하지 못했습니다." className="mb-4">{apiErrorMessage(mutationError)}</Notice>
        ) : null}
        {children}
      </section>
    </main>
  );
}

export function FilterPanel({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-2 rounded-md border border-border-subtle bg-surface-raised p-3 md:grid-cols-3 xl:grid-cols-4">{children}</div>;
}

export function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-xs font-bold text-content-secondary">
      {label}
      {children}
    </label>
  );
}

export function ConsoleHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="text-3xl font-bold leading-tight">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-content-secondary">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function ConsoleSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("min-w-0 overflow-hidden rounded-surface border border-border-subtle bg-surface-raised p-4", className)}>
      {title || description || action ? (
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            {title ? <h3 className="font-bold">{title}</h3> : null}
            {description ? <p className="mt-1 text-xs leading-5 text-content-secondary">{description}</p> : null}
          </div>
          {action ? <div className="w-full shrink-0 md:w-auto">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function MetricGrid({ metrics }: { metrics: { label: string; value: string; delta?: string }[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-surface border border-border-subtle bg-surface-raised p-4">
          <p className="text-sm font-bold text-content-secondary">{metric.label}</p>
          <p className="mt-2 text-2xl font-bold">{metric.value}</p>
          {metric.delta ? <p className="mt-1 text-xs font-bold text-action-primary">{metric.delta}</p> : null}
        </div>
      ))}
    </div>
  );
}

export function DataTable({
  columns,
  rows,
  emptyText = "표시할 데이터가 없습니다.",
}: {
  columns: string[];
  rows: Array<Array<React.ReactNode>>;
  emptyText?: string;
}) {
  return (
    <div className="rounded-surface border border-border-subtle bg-surface-raised">
      {rows.length ? (
        <div className="grid divide-y divide-border-subtle">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="grid gap-3 p-3 hover:bg-surface-subtle/70" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
              {row.map((cell, cellIndex) => (
                <div key={cellIndex} className="min-w-0">
                  <p className="mb-1 text-xs font-bold text-content-secondary">{columns[cellIndex]}</p>
                  <div className="min-w-0 break-words text-sm">{cell}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 py-8 text-center text-sm font-bold text-content-secondary">{emptyText}</div>
      )}
    </div>
  );
}

export function StatusBadge({ value, context }: { value: string; context?: "settlement" }) {
  const status = statusMeta(value);
  const label = context === "settlement" && value === "PAID" ? "지급 완료" : status.label;
  return <Badge className={status.className}>{label}</Badge>;
}

export function SummaryStrip({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <div className="grid gap-2 md:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-md border border-border-subtle bg-surface-raised px-3 py-3">
          <p className="text-xs font-bold text-content-secondary">{item.label}</p>
          <p className="mt-1 text-lg font-bold">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

export function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <Input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 w-full rounded-control border border-border-interactive bg-surface-raised px-3 text-sm outline-none focus:border-foreground md:w-72"
      placeholder={placeholder}
      aria-label={placeholder}
    />
  );
}

function statusMeta(value: string) {
  const labels: Record<string, string> = {
    ACTIVE: "활성",
    OPEN: "운영 중",
    CLOSED: "운영 종료",
    HIDE: "숨김",
    EXIT: "퇴점",
    WITHDRAWN: "탈퇴",
    PENDING: "대기",
    SUSPENDED: "정지",
    SELLING: "판매 중",
    SOLD_OUT: "품절/소진",
    PLACED: "주문 접수",
    PAYMENT_PENDING: "결제 대기",
    SHIPPED: "배송 중",
    SHIPPING: "배송 중",
    DELIVERED: "배송 완료",
    COMPLETED: "구매 확정",
    CANCELLED: "취소",
    PREPARED: "지급 대기",
    PAID: "결제 완료",
    CONFIRMED: "지급 확정",
    EXCLUDED: "정산 제외",
    SUCCESS: "성공",
    FAILED: "실패",
    PAUSED: "일시중지",
    INFO: "확인",
    WARNING: "주의",
    CRITICAL: "긴급",
    INACTIVE: "비활성",
    ISSUABLE: "발급 가능",
    ISSUED: "발급됨",
    SCHEDULED: "예정",
    ENDED: "종료",
    AVAILABLE: "사용 가능",
    EXPIRED: "만료",
    USED: "사용됨",
    PENALTY: "페널티",
    IMPERSONATING: "대리 접속",
  };
  const tone: Record<string, string> = {
    ACTIVE: "bg-status-positive-subtle text-status-positive",
    OPEN: "bg-status-positive-subtle text-status-positive",
    SELLING: "bg-status-positive-subtle text-status-positive",
    SUCCESS: "bg-status-positive-subtle text-status-positive",
    PAID: "bg-status-positive-subtle text-status-positive",
    DELIVERED: "bg-status-positive-subtle text-status-positive",
    WARNING: "bg-status-warning-subtle text-status-warning",
    PAYMENT_PENDING: "bg-status-warning-subtle text-status-warning",
    PREPARED: "bg-status-warning-subtle text-status-warning",
    PENDING: "bg-status-warning-subtle text-status-warning",
    CRITICAL: "bg-status-negative-subtle text-status-negative",
    FAILED: "bg-status-negative-subtle text-status-negative",
    SUSPENDED: "bg-status-negative-subtle text-status-negative",
    EXCLUDED: "bg-status-negative-subtle text-status-negative",
    SOLD_OUT: "bg-status-negative-subtle text-status-negative",
    CANCELLED: "bg-status-negative-subtle text-status-negative",
    INFO: "bg-status-info-subtle text-status-info",
    SHIPPED: "bg-status-info-subtle text-status-info",
    SHIPPING: "bg-status-info-subtle text-status-info",
    ISSUABLE: "bg-status-info-subtle text-status-info",
    ISSUED: "bg-status-info-subtle text-status-info",
    INACTIVE: "bg-surface-subtle text-content-secondary",
    PAUSED: "bg-surface-subtle text-content-secondary",
    PENALTY: "bg-status-negative-subtle text-status-negative",
    IMPERSONATING: "bg-promotion-subtle text-promotion",
  };

  return {
    label: labels[value] ?? displayLabel(orderStatusLabel(value)),
    className: tone[value] ?? "bg-surface-subtle text-content-secondary",
  };
}
