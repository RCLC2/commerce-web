"use client";

import { Fragment, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";

export function Pagination({ page, totalPages, hasNext = false, disabled = false, onChange, label = "상품 페이지" }: { page: number; totalPages?: number; hasNext?: boolean; disabled?: boolean; onChange: (page: number) => void; label?: string }) {
  const [draft, setDraft] = useState("");
  const lastPage = totalPages === undefined ? page + Number(hasNext) : Math.max(1, totalPages);
  const pages = [...new Set([1, ...Array.from({ length: 3 }, (_, index) => page + index - 1), lastPage])].filter((value) => value >= 1 && value <= lastPage).sort((a, b) => a - b);
  const requestedPage = Number(draft);
  const valid = Number.isSafeInteger(requestedPage) && requestedPage >= 1 && (totalPages === undefined || requestedPage <= lastPage);

  if (lastPage <= 1 && totalPages !== undefined) return null;
  return (
    <nav aria-label={label} className="mt-8 grid justify-items-center gap-3">
      <div className="flex flex-wrap items-center justify-center gap-1">
        <Button variant="secondary" size="icon" aria-label="이전 페이지" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft size={18} /></Button>
        {pages.map((value, index) => (
          <Fragment key={value}>
            {index > 0 && value - pages[index - 1] > 1 ? <span aria-hidden="true" className="px-1 text-content-secondary">…</span> : null}
            <Button variant={page === value ? "primary" : "secondary"} size="icon" aria-label={`${value}페이지`} aria-current={page === value ? "page" : undefined} disabled={disabled} onClick={() => onChange(value)}>{value}</Button>
          </Fragment>
        ))}
        <Button variant="secondary" size="icon" aria-label="다음 페이지" disabled={disabled || page >= lastPage} onClick={() => onChange(page + 1)}><ChevronRight size={18} /></Button>
      </div>
      <form className="flex items-center gap-2 text-sm text-content-secondary" onSubmit={(event) => { event.preventDefault(); if (valid && !disabled) { onChange(requestedPage); setDraft(""); } }}>
        <Input type="number" min={1} max={totalPages === undefined ? undefined : lastPage} step={1} value={draft} onChange={(event) => setDraft(event.target.value)} aria-label="이동할 페이지" placeholder={String(page)} className="w-20" disabled={disabled} />
        <span>{totalPages === undefined ? "페이지" : `/ ${lastPage}페이지`}</span>
        <Button type="submit" variant="secondary" disabled={disabled || !valid}>이동</Button>
      </form>
    </nav>
  );
}
