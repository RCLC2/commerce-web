"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, MessageSquareText, Search, Send } from "lucide-react";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-client";
import type { InquiryCategory, InquiryStatus } from "@/lib/api/inquiries";
import { categoryLabel, inquiryCategories, inquiryDate } from "@/lib/inquiries";
import { adminLinks, AdminAuthRequired, useAdminToken } from "./admin-console";
import { ConsoleHeader, ConsoleLayout, ConsoleSection } from "./console-layout";
import { InquiryStatusBadge } from "./inquiry-status-badge";
import { SellerAuthRequiredV2, SellerConsoleLayoutV2, useSellerConsoleContext } from "./seller-shell";
import { Button } from "./ui/button";
import { EmptyState, InlineLoadingState } from "./ui/feedback";
import { Input, Select, Textarea } from "./ui/input";
import { Notice } from "./ui/notice";

export function SellerInquiriesPage() {
  const { token, marketID, marketName } = useSellerConsoleContext();
  if (!token) return <SellerAuthRequiredV2 />;
  return <SellerConsoleLayoutV2 marketName={marketName}><OperatorInquiryContent role="seller" token={token} marketID={marketID} /></SellerConsoleLayoutV2>;
}

export function AdminInquiriesPage() {
  const token = useAdminToken();
  if (!token) return <AdminAuthRequired />;
  return <ConsoleLayout title="관리자" subtitle="플랫폼 운영 콘솔" links={adminLinks}><OperatorInquiryContent role="admin" token={token} /></ConsoleLayout>;
}

function OperatorInquiryContent({ role, token, marketID }: { role: "admin" | "seller"; token: string; marketID?: number }) {
  const queryClient = useQueryClient();
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"" | InquiryStatus>("");
  const [category, setCategory] = useState<"" | InquiryCategory>("");
  const [selectedID, setSelectedID] = useState<number>();
  const [reply, setReply] = useState("");
  const listKey = ["operator-inquiries", role, marketID, query, status, category] as const;
  const list = useQuery({
    queryKey: listKey,
    queryFn: () => api.listOperatorInquiries(token, role, { query: query || undefined, status: status || undefined, category: category || undefined, marketID, limit: 100 }),
    enabled: role === "admin" || Boolean(marketID),
  });
  const detail = useQuery({
    queryKey: ["operator-inquiry", role, marketID, selectedID],
    queryFn: () => api.getOperatorInquiry(token, role, selectedID ?? 0, marketID),
    enabled: Boolean(selectedID && (role === "admin" || marketID)),
    refetchInterval: 5_000,
  });
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["operator-inquiries", role] }),
    queryClient.invalidateQueries({ queryKey: ["operator-inquiry", role, marketID, selectedID] }),
  ]);
  const send = useMutation({ mutationFn: () => api.replyAsOperator(token, role, selectedID ?? 0, reply.trim(), marketID), onSuccess: async () => { setReply(""); await refresh(); } });
  const complete = useMutation({ mutationFn: () => api.completeInquiry(token, role, selectedID ?? 0, marketID), onSuccess: refresh });
  const item = detail.data;

  return <>
    <ConsoleHeader title={role === "admin" ? "고객 문의 통합 검색" : "고객 문의"} description={role === "admin" ? "질문 내용, 회원 이메일, 주문번호를 키워드로 검색하고 플랫폼 문의를 처리합니다." : "내 마켓의 주문·상품 문의를 확인하고 고객에게 답변합니다."} />
    <form className="mt-5 grid gap-2 rounded-surface border border-border-subtle bg-surface-raised p-3 md:grid-cols-[minmax(240px,1fr)_160px_160px_auto]" onSubmit={(event) => { event.preventDefault(); setQuery(queryInput.trim()); }}>
      <label className="relative block"><span className="sr-only">문의 검색</span><Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-content-secondary" /><Input className="pl-9" value={queryInput} onChange={(event) => setQueryInput(event.target.value)} placeholder={role === "admin" ? "예: 배송이 멈춘 주문, member@example.com" : "제목, 주문번호, 회원 이메일"} /></label>
      <Select aria-label="문의 상태" value={status} onChange={(event) => setStatus(event.target.value as "" | InquiryStatus)}><option value="">전체 상태</option><option value="STARTED">접수</option><option value="IN_PROGRESS">처리 중</option><option value="COMPLETED">처리 완료</option><option value="CLOSED">종료</option></Select>
      <Select aria-label="문의 유형" value={category} onChange={(event) => setCategory(event.target.value as "" | InquiryCategory)}><option value="">전체 유형</option>{inquiryCategories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select>
      <Button type="submit">검색</Button>
    </form>
    <div className="mt-5 grid min-h-[620px] gap-4 xl:grid-cols-[minmax(340px,0.85fr)_minmax(480px,1.4fr)]">
      <ConsoleSection title={`문의 목록 ${list.data ? `${list.data.total}건` : ""}`} description={role === "seller" ? "최신 업데이트 순" : "검색 결과와 최신 업데이트 순"}>
        {list.isLoading ? <InlineLoadingState label="문의 목록을 불러오는 중입니다." /> : null}
        {list.error ? <Notice tone="error">{apiErrorMessage(list.error)}</Notice> : null}
        <div className="-mx-1 space-y-2">{list.data?.items.map((inquiry) => <button key={inquiry.id} type="button" onClick={() => setSelectedID(inquiry.id)} className={`w-full rounded-control border p-3 text-left transition ${selectedID === inquiry.id ? "border-action-primary bg-action-secondary" : "border-border-subtle bg-surface-raised hover:border-action-primary/35"}`}>
          <div className="flex items-center justify-between gap-2"><InquiryStatusBadge status={inquiry.status} /><span className="text-[11px] text-content-tertiary">{inquiryDate(inquiry.updated_at)}</span></div>
          <p className="mt-2 truncate text-sm font-bold">{inquiry.title}</p><p className="mt-1 text-xs text-content-secondary">{categoryLabel(inquiry.category, inquiry.subcategory)} · {inquiry.member_email}</p>
          {inquiry.order_code ? <p className="mt-1 text-xs font-bold text-action-primary">주문 {inquiry.order_code}</p> : null}
        </button>)}</div>
        {list.isSuccess && !list.data.items.length ? <EmptyState icon={<MessageSquareText className="size-7" />} title="조건에 맞는 문의가 없습니다" description="검색어나 필터를 바꿔보세요." /> : null}
      </ConsoleSection>
      <ConsoleSection title={item ? `문의 #${item.id}` : "문의 상세"} description={item ? categoryLabel(item.category, item.subcategory) : "왼쪽 목록에서 문의를 선택하세요."} action={item ? <InquiryStatusBadge status={item.status} /> : undefined}>
        {detail.isLoading ? <InlineLoadingState label="문의 상세를 불러오는 중입니다." /> : null}
        {detail.error ? <Notice tone="error">{apiErrorMessage(detail.error)}</Notice> : null}
        {item ? <>
          <div className="grid gap-2 rounded-control bg-surface-subtle p-4 sm:grid-cols-2"><Related label="회원" value={item.member_email} /><Related label="주문" value={item.order_code || "일반 문의"} /><Related label="마켓" value={item.market_name || (role === "admin" ? "플랫폼 담당" : "내 마켓")} /><Related label="접수" value={inquiryDate(item.created_at)} /></div>
          <h3 className="mt-5 text-lg font-bold">{item.title}</h3>
          <div className="mt-5 max-h-[340px] space-y-3 overflow-y-auto rounded-control border border-border-subtle bg-canvas p-4">{(item.messages ?? []).map((message) => {
            const member = message.sender_type === "MEMBER";
            return <article key={message.id} className={`flex ${member ? "justify-start" : "justify-end"}`}><div className={`max-w-[85%] rounded-control px-3 py-2 ${member ? "bg-surface-raised shadow-card" : message.sender_type === "SYSTEM" ? "bg-surface-subtle" : "bg-action-primary text-content-on-brand"}`}><p className={`text-[11px] font-bold ${member ? "text-action-primary" : "text-content-on-brand/75"}`}>{member ? "고객" : message.sender_type === "SYSTEM" ? "시스템" : "담당자"}</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{message.body}</p><time className={`mt-1 block text-[10px] ${member ? "text-content-tertiary" : "text-content-on-brand/65"}`}>{inquiryDate(message.created_at)}</time></div></article>;
          })}</div>
          {item.status !== "CLOSED" ? <div className="mt-4"><Textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="고객에게 전달할 답변을 입력하세요." maxLength={5000} />{send.error ? <p className="mt-2 text-sm font-bold text-status-negative">{apiErrorMessage(send.error)}</p> : null}<div className="mt-3 flex flex-wrap justify-end gap-2"><Button variant="secondary" disabled={item.status === "COMPLETED" || complete.isPending} onClick={() => complete.mutate()}><CheckCircle2 size={16} />처리 완료</Button><Button disabled={!reply.trim() || send.isPending} onClick={() => send.mutate()}><Send size={16} />답변 전송</Button></div></div> : <Notice className="mt-4">고객이 종료했거나 자동 종료된 문의입니다.</Notice>}
        </> : !detail.isLoading ? <EmptyState icon={<MessageSquareText className="size-7" />} title="문의가 선택되지 않았습니다" description="목록에서 처리할 문의를 선택하세요." /> : null}
      </ConsoleSection>
    </div>
  </>;
}

function Related({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[11px] font-bold text-content-tertiary">{label}</p><p className="mt-1 break-words text-sm font-bold">{value}</p></div>;
}
