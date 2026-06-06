"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

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

  return (
    <main className="mx-auto grid max-w-7xl gap-5 px-4 pb-24 pt-5 md:grid-cols-[228px_1fr]">
      <aside className="h-fit rounded-md border border-line bg-white p-3 md:sticky md:top-24">
        <div className="px-3 py-2">
          <h1 className="text-lg font-black">{title}</h1>
          {subtitle ? <p className="mt-1 text-xs font-bold leading-5 text-muted">{subtitle}</p> : null}
        </div>
        {sidebarHeader ? <div className="mb-3 px-1">{sidebarHeader}</div> : null}
        <nav className="mt-2 grid gap-1">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md border border-transparent px-3 py-2.5 text-sm font-bold text-zinc-600 transition hover:bg-zinc-50",
                  active && "border-brand bg-brand text-white shadow-sm hover:bg-brand",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        {sidebarFooter ? <div className="mt-4 border-t border-line pt-4">{sidebarFooter}</div> : null}
      </aside>
      <section className="min-w-0">{children}</section>
    </main>
  );
}

export function FilterPanel({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-2 rounded-md bg-zinc-50 p-3 md:grid-cols-3 xl:grid-cols-4">{children}</div>;
}

export function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-xs font-black text-muted">
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
        <h2 className="text-2xl font-black">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-muted">{description}</p> : null}
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
    <section className={cn("rounded-md border border-line bg-white p-4", className)}>
      {title || description || action ? (
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            {title ? <h3 className="font-black">{title}</h3> : null}
            {description ? <p className="mt-1 text-xs leading-5 text-muted">{description}</p> : null}
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
        <div key={metric.label} className="rounded-md border border-line bg-white p-4">
          <p className="text-sm font-bold text-muted">{metric.label}</p>
          <p className="mt-2 text-2xl font-black">{metric.value}</p>
          {metric.delta ? <p className="mt-1 text-xs font-black text-brand">{metric.delta}</p> : null}
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
    <div className="rounded-md border border-line bg-white">
      {rows.length ? (
        <div className="grid divide-y divide-line">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="grid gap-3 p-4 hover:bg-zinc-50/70 md:grid-cols-2 xl:grid-cols-3">
              {row.map((cell, cellIndex) => (
                <div key={cellIndex} className="min-w-0">
                  <p className="mb-1 text-[11px] font-black text-muted">{columns[cellIndex]}</p>
                  <div className="min-w-0 break-words text-sm">{cell}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 py-8 text-center text-sm font-bold text-muted">{emptyText}</div>
      )}
    </div>
  );
}

export function StatusBadge({ value }: { value: string }) {
  const status = statusMeta(value);

  return <span className={cn("rounded-sm px-2 py-1 text-xs font-black", status.className)}>{status.label}</span>;
}

export function SummaryStrip({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <div className="grid gap-2 md:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-md bg-zinc-50 px-3 py-3">
          <p className="text-xs font-bold text-muted">{item.label}</p>
          <p className="mt-1 text-lg font-black">{item.value}</p>
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
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-foreground md:w-72"
      placeholder={placeholder}
      aria-label={placeholder}
    />
  );
}

function statusMeta(value: string) {
  const labels: Record<string, string> = {
    ACTIVE: "활성",
    PENDING: "대기",
    SUSPENDED: "정지",
    SELLING: "판매중",
    SOLD_OUT: "품절",
    PLACED: "주문 접수",
    PAYMENT_COMPLETED: "결제 완료",
    READY_TO_SHIP: "배송 준비중",
    SHIPPING: "배송중",
    DELIVERED: "배송 완료",
    CANCELLED: "취소",
    PREPARED: "지급 대기",
    PAID: "지급 완료",
    EXCLUDED: "정산 제외",
    SUCCESS: "성공",
    FAILED: "실패",
    PAUSED: "일시중지",
    INFO: "확인",
    WARNING: "주의",
    CRITICAL: "긴급",
    INACTIVE: "비활성",
    ISSUED: "발급됨",
    ISSUABLE: "발급 가능",
    USED: "사용됨",
    PENALTY: "페널티",
    IMPERSONATING: "대리 접속",
  };
  const tone: Record<string, string> = {
    ACTIVE: "bg-emerald-50 text-emerald-700",
    SELLING: "bg-emerald-50 text-emerald-700",
    SUCCESS: "bg-emerald-50 text-emerald-700",
    PAID: "bg-emerald-50 text-emerald-700",
    DELIVERED: "bg-emerald-50 text-emerald-700",
    PAYMENT_COMPLETED: "bg-emerald-50 text-emerald-700",
    WARNING: "bg-amber-50 text-amber-700",
    READY_TO_SHIP: "bg-amber-50 text-amber-700",
    PREPARED: "bg-amber-50 text-amber-700",
    PENDING: "bg-amber-50 text-amber-700",
    CRITICAL: "bg-red-50 text-red-700",
    FAILED: "bg-red-50 text-red-700",
    SUSPENDED: "bg-red-50 text-red-700",
    EXCLUDED: "bg-red-50 text-red-700",
    SOLD_OUT: "bg-red-50 text-red-700",
    CANCELLED: "bg-red-50 text-red-700",
    INFO: "bg-sky-50 text-sky-700",
    SHIPPING: "bg-sky-50 text-sky-700",
    ISSUABLE: "bg-sky-50 text-sky-700",
    INACTIVE: "bg-zinc-100 text-zinc-600",
    PAUSED: "bg-zinc-100 text-zinc-600",
    PENALTY: "bg-red-50 text-red-700",
    IMPERSONATING: "bg-violet-50 text-violet-700",
  };

  return {
    label: labels[value] ?? value,
    className: tone[value] ?? "bg-zinc-100 text-zinc-700",
  };
}
