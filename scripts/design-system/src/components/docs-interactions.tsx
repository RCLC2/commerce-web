"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/feedback";
import { Dialog } from "@/components/ui/overlay";

export function ConfirmationDemo({ role }: { role: "seller" | "admin" }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const title = role === "seller" ? "선택한 주문을 출고할까요?" : "선택한 권한을 승인할까요?";
  const impact = role === "seller" ? "3건의 주문 상태가 ‘배송 중’으로 변경됩니다." : "판매자 1명의 운영 권한이 즉시 활성화됩니다.";
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={() => setOpen(true)}>{role === "seller" ? "출고 확인" : "권한 승인"}</Button>
      {done ? <Toast><Check className="mr-2 size-4" aria-hidden="true" />{role === "seller" ? "주문 3건을 출고 처리했어요." : "판매자 권한을 승인했어요."}</Toast> : null}
      <Dialog open={open} onClose={() => setOpen(false)} title={title} description={impact}>
        <div className="mt-5 flex justify-end gap-2"><Button variant="secondary" onClick={() => setOpen(false)}>취소</Button><Button onClick={() => { setOpen(false); setDone(true); }}>{role === "seller" ? "출고 처리" : "승인"}</Button></div>
      </Dialog>
    </div>
  );
}

export function PaginationDemo() {
  const [page, setPage] = useState(1);
  return <div className="flex items-center gap-2"><Button size="sm" className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-0" variant="secondary" disabled={page === 1} aria-label="이전 페이지" onClick={() => setPage((value) => value - 1)}><ChevronLeft className="size-4" /></Button><output aria-live="polite" className="min-w-12 text-center text-sm font-black">{page} / 3</output><Button size="sm" className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-0" variant="secondary" disabled={page === 3} aria-label="다음 페이지" onClick={() => setPage((value) => value + 1)}><ChevronRight className="size-4" /></Button></div>;
}
