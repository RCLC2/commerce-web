"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

type ConsoleTableProps = {
  columns: string[];
  rows: ReactNode[][];
  onRowClick?: (index: number) => void;
  rowKeys?: Array<string | number>;
  emptyText?: string;
};

export function ConsoleTable({
  columns,
  rows,
  onRowClick,
  rowKeys,
  emptyText = "표시할 데이터가 없습니다.",
}: ConsoleTableProps) {
  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-white px-5 py-12 text-center text-sm font-bold text-muted">
        {emptyText}
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-line bg-white md:block">
        <table className="w-full min-w-[760px] table-fixed border-collapse text-left">
          <thead className="border-b border-line bg-zinc-50">
            <tr>
              {columns.map((column) => (
                <th key={column} scope="col" className="px-4 py-3 text-xs font-black text-muted">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row, rowIndex) => (
              <tr
                key={rowKeys?.[rowIndex] ?? rowIndex}
                tabIndex={onRowClick ? 0 : undefined}
                className={cn(
                  "align-middle",
                  onRowClick &&
                    "cursor-pointer transition hover:bg-zinc-50 focus:bg-zinc-50 focus:outline-none",
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
              <span className="text-xs font-black text-muted">{columns[cellIndex]}</span>
              <span className="min-w-0 break-words text-sm">{cell}</span>
            </span>
          ));

          return onRowClick ? (
            <button
              key={rowKeys?.[rowIndex] ?? rowIndex}
              type="button"
              className="grid w-full gap-3 rounded-xl border border-line bg-white p-4 text-left shadow-sm transition hover:border-zinc-400"
              onClick={() => onRowClick(rowIndex)}
            >
              {content}
            </button>
          ) : (
            <div
              key={rowKeys?.[rowIndex] ?? rowIndex}
              className="grid gap-3 rounded-xl border border-line bg-white p-4 shadow-sm"
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
      <p className="text-xs font-bold text-muted">총 {total.toLocaleString("ko-KR")}건</p>
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
        <span className="min-w-20 text-center text-sm font-black">
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
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl",
          size === "md" && "sm:max-w-2xl",
          size === "lg" && "sm:max-w-4xl",
          size === "xl" && "sm:max-w-6xl",
        )}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-black">{title}</h2>
            {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
          </div>
          <button
            type="button"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-line text-muted transition hover:bg-zinc-100 hover:text-foreground"
            onClick={onClose}
            aria-label="닫기"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer ? (
          <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-line px-5 py-4 sm:px-6">
            {footer}
          </footer>
        ) : null}
      </section>
    </div>
  );
}

export function DetailGrid({ children }: { children: ReactNode }) {
  return <dl className="grid gap-4 rounded-xl bg-zinc-50 p-4 sm:grid-cols-2">{children}</dl>;
}

export function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-black text-muted">{label}</dt>
      <dd className="mt-1 min-w-0 break-words text-sm font-bold">{children || "-"}</dd>
    </div>
  );
}

export function ModalLoading() {
  return <div className="py-16 text-center text-sm font-bold text-muted">상세 정보를 불러오는 중입니다.</div>;
}

export function useDebouncedValue<T>(value: T, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);
  return debouncedValue;
}

export const consoleInputClass =
  "h-10 min-w-0 rounded-lg border border-line bg-white px-3 text-sm font-bold outline-none transition placeholder:text-muted focus:border-zinc-500";
