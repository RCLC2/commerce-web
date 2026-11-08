"use client";

import { CheckCircle2, ChevronRight, Clock3, MessageSquareText } from "lucide-react";
import { useState } from "react";
import type { CustomerInquiry } from "@/lib/inquiry-preview";
import { ButtonLink } from "./ui/button-link";
import { BottomSheet } from "./ui/overlay";
import { Tabs } from "./ui/tabs";

const statusDetails = {
  WAITING: { label: "답변 대기", icon: Clock3, className: "bg-surface-subtle text-content-secondary", message: "문의가 접수되었어요. 순서대로 답변드릴게요." },
  IN_PROGRESS: { label: "확인 중", icon: MessageSquareText, className: "bg-action-secondary text-action-primary", message: "담당자가 내용을 확인하고 있어요. 확인이 끝나면 답변드릴게요." },
  ANSWERED: { label: "답변 완료", icon: CheckCircle2, className: "bg-status-positive-subtle text-status-positive", message: "" },
};

const dateFormatter = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Seoul" });

export function MyInquirySummary({ className, inquiries, isPreview = false }: { className?: string; inquiries?: readonly CustomerInquiry[]; isPreview?: boolean }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const activeCount = inquiries?.filter((inquiry) => inquiry.status !== "ANSWERED").length ?? 0;
  const answeredCount = (inquiries?.length ?? 0) - activeCount;
  const filtered = inquiries?.filter((inquiry) => filter === "all" || (filter === "active" ? inquiry.status !== "ANSWERED" : inquiry.status === "ANSWERED")) ?? [];

  const list = <div className="space-y-3" role={filtered.length ? "list" : undefined} aria-label={filtered.length ? "문의 내역" : undefined}>
    {filtered.map((inquiry) => {
      const status = statusDetails[inquiry.status];
      const Icon = status.icon;
      return <article key={inquiry.id} role="listitem" className="min-w-0 rounded-surface border border-border-subtle p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${status.className}`}><Icon size={14} />{status.label}</span>
          <time className="text-xs text-content-tertiary" dateTime={inquiry.createdAt}>{dateFormatter.format(new Date(inquiry.createdAt))}</time>
        </div>
        <p className="mt-4 text-xs text-content-secondary">{inquiry.category}</p>
        <h3 className="mt-1 break-words text-sm font-bold">{inquiry.title}</h3>
        <p className="mt-3 whitespace-pre-line break-words text-sm leading-6 text-content-secondary">{inquiry.content}</p>
        {inquiry.productName ? <p className="mt-3 rounded-control bg-surface-subtle px-3 py-2 text-xs text-content-secondary">{inquiry.productName}</p> : null}
        <div className="mt-4 border-t border-border-subtle pt-4">
          {inquiry.status === "ANSWERED" ? <>
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="flex items-center gap-2 text-xs font-bold text-action-primary"><MessageSquareText size={15} />고객센터 답변</p><time dateTime={inquiry.answer.createdAt} className="text-xs text-content-tertiary">{dateFormatter.format(new Date(inquiry.answer.createdAt))}</time></div>
            <p className="mt-3 whitespace-pre-line break-words text-sm leading-6">{inquiry.answer.content}</p>
          </> : <p className="text-xs leading-5 text-content-secondary">{status.message}</p>}
        </div>
      </article>;
    })}
    {!filtered.length ? <div className="rounded-surface bg-surface-subtle p-6 text-center"><MessageSquareText size={24} className="mx-auto text-content-tertiary" /><p className="mt-3 text-sm font-bold">{filter === "active" ? "진행 중인 문의가 없습니다" : filter === "answered" ? "답변 완료된 문의가 없습니다" : "문의 내역이 없습니다"}</p><p className="mt-2 text-xs text-content-secondary">접수한 문의가 있으면 이곳에서 확인할 수 있어요.</p></div> : null}
  </div>;

  return <div className={className}>
    <button type="button" className="w-full rounded-control px-2 py-4 text-center transition hover:bg-action-secondary" aria-haspopup="dialog" aria-expanded={open} onClick={() => { setFilter("all"); setOpen(true); }}>
      <span className="block text-xs text-content-secondary">진행 중인 문의</span>
      <span className="mt-1 inline-flex min-h-6 items-center justify-center gap-1 text-sm font-bold">{inquiries ? `${activeCount}건` : "준비 중"}<ChevronRight size={14} className="text-content-tertiary" /></span>
    </button>
    <BottomSheet open={open} onClose={() => setOpen(false)} title="진행 중인 문의" description={inquiries ? `진행 중 ${activeCount}건 · 답변 완료 ${answeredCount}건` : "도움이 필요한 내용을 확인해보세요."} className="mx-auto max-w-6xl text-left">
      {inquiries ? <>
        {isPreview ? <div className="mb-4 flex flex-wrap items-center gap-2 rounded-control bg-action-secondary px-3 py-2 text-xs"><span className="font-bold text-action-primary">임시 데이터</span><span className="text-content-secondary">문의 내용과 답변 상태를 미리 확인해보세요.</span></div> : null}
        <Tabs value={filter} onValueChange={setFilter} ariaLabel="문의 상태" items={[
          { value: "all", label: "전체", count: inquiries.length, content: list },
          { value: "active", label: "진행 중", count: activeCount, content: list },
          { value: "answered", label: "답변 완료", count: answeredCount, content: list },
        ]} />
      </> : <div className="rounded-surface bg-surface-subtle p-5"><MessageSquareText size={24} className="text-action-primary" /><h3 className="mt-3 font-bold">문의 내역은 준비 중이에요</h3><p className="mt-2 text-sm leading-6 text-content-secondary">주문·배송·반품 정보는 주문 상세에서 확인할 수 있어요.</p><ButtonLink href="#order-history-title" variant="secondary" className="mt-4 w-full" onClick={() => setOpen(false)}>주문 내역 확인<ChevronRight size={16} /></ButtonLink></div>}
    </BottomSheet>
  </div>;
}
