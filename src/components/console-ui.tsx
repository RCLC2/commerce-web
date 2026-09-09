"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { inputVariants } from "./ui/input";
import { useAccessibleOverlay } from "./ui/use-accessible-overlay";


type ConsoleTableProps = {
  columns: string[];
  rows: ReactNode[][];
  onRowClick?: (index: number) => void;
  rowKeys?: Array<string | number>;
  emptyText?: string;
  loading?: boolean;
  emptyAction?: ReactNode;
};

export function ConsoleTable({
  columns,
  rows,
  onRowClick,
  rowKeys,
  emptyText = "표시할 데이터가 없습니다.",
  loading = false,
  emptyAction,
}: ConsoleTableProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-dashed border-border-subtle bg-surface-raised px-5 py-12 text-center text-sm font-bold text-content-secondary" role="status">
        목록을 불러오는 중입니다.
      </div>
    );
  }
  if (!rows.length) {
    return (
      <div className="grid place-items-center gap-3 rounded-xl border border-dashed border-border-subtle bg-surface-raised px-5 py-12 text-center text-sm font-bold text-content-secondary">
        <span>{emptyText}</span>
        {emptyAction}
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-border-subtle bg-surface-raised md:block">
        <table className="w-full min-w-[760px] table-auto border-collapse text-left">
          <thead className="border-b border-border-subtle bg-surface-raised">
            <tr>
              {columns.map((column) => (
                <th key={column} scope="col" className="px-4 py-3 text-xs font-bold text-content-secondary">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {rows.map((row, rowIndex) => (
              <tr
                key={rowKeys?.[rowIndex] ?? rowIndex}
                tabIndex={onRowClick ? 0 : undefined}
                className={cn(
                  "align-middle",
                  onRowClick &&
                    "cursor-pointer transition hover:bg-surface-subtle focus-visible:bg-surface-subtle focus-visible:outline-2 focus-visible:-outline-offset-2",
                )}
                onClick={() => onRowClick?.(rowIndex)}
                onKeyDown={(event) => {
                  if (!onRowClick || (event.key !== "Enter" && event.key !== " ")) return;
                  event.preventDefault();
                  onRowClick(rowIndex);
                }}
              >
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="min-w-0 px-4 py-3 text-sm">
                    <div className="min-w-0 break-words">{cell}</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {rows.map((row, rowIndex) => {
          const content = row.map((cell, cellIndex) => (
            <span key={cellIndex} className="grid grid-cols-[88px_minmax(0,1fr)] gap-3">
              <span className="text-xs font-bold text-content-secondary">{columns[cellIndex]}</span>
              <span className="min-w-0 break-words text-sm">{cell}</span>
            </span>
          ));

          return onRowClick ? (
            <Button variant="ghost"
              key={rowKeys?.[rowIndex] ?? rowIndex}
              type="button"
              className="grid w-full gap-3 rounded-surface border border-border-subtle bg-surface-raised p-4 text-left shadow-card transition hover:border-border-interactive"
              onClick={() => onRowClick(rowIndex)}
            >
              {content}
            </Button>
          ) : (
            <div
              key={rowKeys?.[rowIndex] ?? rowIndex}
              className="grid gap-3 rounded-surface border border-border-subtle bg-surface-raised p-4 shadow-card"
            >
              {content}
            </div>
          );
        })}
      </div>
    </>
  );
}

export function PaginationBar({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const safeTotalPages = Math.max(1, totalPages);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
      <p className="text-xs font-bold text-content-secondary">총 {total.toLocaleString("ko-KR")}건</p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="이전 페이지"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-20 text-center text-sm font-bold">
          {page} / {safeTotalPages}
        </span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={page >= safeTotalPages}
          onClick={() => onChange(page + 1)}
          aria-label="다음 페이지"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function ConsoleModal({
  open,
  title,
  description,
  children,
  onClose,
  footer,
  size = "lg",
}: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  size?: "md" | "lg" | "xl";
}) {
  const dialogRef = useRef<HTMLElement>(null);
  useAccessibleOverlay(open, onClose, dialogRef);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--commerce-z-modal)] flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-surface bg-surface-raised shadow-float sm:rounded-surface",
          size === "md" && "sm:max-w-2xl",
          size === "lg" && "sm:max-w-4xl",
          size === "xl" && "sm:max-w-6xl",
        )}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border-subtle px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="break-words text-lg font-bold">{title}</h2>
            {description ? <p className="mt-1 text-sm text-content-secondary">{description}</p> : null}
          </div>
          <Button variant="ghost" size="icon"
            type="button"
            className="grid size-11 shrink-0 place-items-center rounded-full border border-border-subtle text-content-secondary transition hover:bg-surface-subtle hover:text-content-primary"
            onClick={onClose}
            aria-label="닫기"
          >
            <X className="size-4" />
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer ? (
          <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border-subtle px-5 py-4 sm:px-6">
            {footer}
          </footer>
        ) : null}
      </section>
    </div>
  );
}

type ConsoleConfirmOptions = {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
};

export function useConsoleConfirm() {
  const [request, setRequest] = useState<{
    options: ConsoleConfirmOptions;
    onConfirm: () => void;
  }>();

  function ask(options: ConsoleConfirmOptions, onConfirm: () => void) {
    setRequest({ options, onConfirm });
  }

  const dialog = request ? (
    <ConsoleModal
      open
      size="md"
      title={request.options.title}
      onClose={() => setRequest(undefined)}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={() => setRequest(undefined)}>취소</Button>
          <Button
            type="button"
            variant={request.options.danger ? "danger" : "primary"}
            onClick={() => {
              const onConfirm = request.onConfirm;
              setRequest(undefined);
              onConfirm();
            }}
          >
            {request.options.confirmLabel ?? "확인"}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-6 text-content-secondary">{request.options.message}</p>
    </ConsoleModal>
  ) : null;

  return { ask, dialog };
}

export function DetailGrid({ children }: { children: ReactNode }) {
  return <dl className="grid gap-4 rounded-xl border border-border-subtle bg-surface-raised p-4 sm:grid-cols-2">{children}</dl>;
}

export function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold text-content-secondary">{label}</dt>
      <dd className="mt-1 min-w-0 break-words text-sm font-bold">{children === null || children === undefined || children === "" ? "-" : children}</dd>
    </div>
  );
}

export function ModalLoading() {
  return <div className="py-16 text-center text-sm font-bold text-content-secondary">상세 정보를 불러오는 중입니다.</div>;
}

export function ModalQueryState({
  isLoading,
  error,
  onRetry,
}: {
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  if (isLoading) return <ModalLoading />;
  if (!error) return <div className="py-16 text-center text-sm font-bold text-content-secondary">상세 정보를 찾을 수 없습니다.</div>;
  return (
    <div className="grid place-items-center gap-3 py-16 text-center">
      <p className="text-sm font-bold text-status-negative">상세 정보를 불러오지 못했습니다.</p>
      <Button type="button" size="sm" variant="secondary" onClick={onRetry}>상세 다시 불러오기</Button>
    </div>
  );
}

export function useDebouncedValue<T>(value: T, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);
  return debouncedValue;
}

export function useConsoleUrlFilters(
  values: Record<string, string | number | undefined>,
  onExternalChange?: (searchParams: URLSearchParams) => void,
) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const serialized = JSON.stringify(Object.entries(values).sort(([left], [right]) => left.localeCompare(right)));
  const previousQueryRef = useRef(searchParams.toString());
  const onExternalChangeRef = useRef(onExternalChange);

  useEffect(() => {
    onExternalChangeRef.current = onExternalChange;
  }, [onExternalChange]);

  useEffect(() => {
    const currentQuery = searchParams.toString();
    const next = new URLSearchParams(currentQuery);
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined || value === "" || value === 0 || value === "ALL") next.delete(key);
      else next.set(key, String(value));
    }
    const nextQuery = next.toString();
    if (nextQuery === currentQuery) {
      previousQueryRef.current = currentQuery;
      return;
    }
    if (previousQueryRef.current !== currentQuery && onExternalChangeRef.current) {
      onExternalChangeRef.current(new URLSearchParams(currentQuery));
      previousQueryRef.current = currentQuery;
      return;
    }
    if (nextQuery !== currentQuery) {
      previousQueryRef.current = nextQuery;
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }
  }, [pathname, router, searchParams, serialized, values]);
}

export function consoleUrlValue(searchParams: { get: (key: string) => string | null }, key: string, fallback = "") {
  return searchParams.get(key) ?? fallback;
}

export const consoleInputClass = cn(inputVariants(), "h-11 min-w-0 font-medium");
