"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, MessageSquareText, Search, Send, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-client";
import type { InquiryCategory, InquiryStatus, NaturalLanguageInquirySearchResponse, OperatorInquiry } from "@/lib/api/inquiries";
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
  const [searchMode, setSearchMode] = useState<"ai" | "keyword">("ai");
  const [selectedID, setSelectedID] = useState<number>();
  const [reply, setReply] = useState("");
  const aiActive = role === "admin" && searchMode === "ai" && Boolean(query);
  const listKey = ["operator-inquiries", role, marketID, query, status, category] as const;
  const list = useQuery({
    queryKey: listKey,
    queryFn: () => api.listOperatorInquiries(token, role, { query: query || undefined, status: status || undefined, category: category || undefined, marketID, limit: 100 }),
    enabled: (role === "admin" || Boolean(marketID)) && !aiActive,
  });
  const aiSearch = useMutation({
    mutationFn: (searchQuery: string) => api.searchAdminInquiries(token, {
      query: searchQuery,
      status: status || undefined,
      category: category || undefined,
      limit: 30,
    }),
    meta: { suppressConsoleError: true },
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
  const page = aiActive ? aiSearch.data : list.data;
  const pageLoading = aiActive ? aiSearch.isPending : list.isLoading;
  const pageError = aiActive ? aiSearch.error : list.error;
  const item = detail.data;

  const submitSearch = () => {
    const nextQuery = queryInput.trim();
    setQuery(nextQuery);
    setSelectedID(undefined);
    if (role === "admin" && searchMode === "ai" && nextQuery) aiSearch.mutate(nextQuery);
  };

  const useKeywordFallback = () => {
    aiSearch.reset();
    setSearchMode("keyword");
    setQuery(queryInput.trim());
    setSelectedID(undefined);
  };

  return <>
    <ConsoleHeader title={role === "admin" ? "고객 문의 AI 검색" : "고객 문의"} description={role === "admin" ? "자연어 요청을 AI가 검색 조건으로 해석하고, 결과마다 찾은 이유를 설명합니다." : "내 마켓의 주문·상품 문의를 확인하고 고객에게 답변합니다."} />
    {role === "admin" ? <div className="mt-5 flex flex-wrap gap-2" aria-label="검색 방식">
      <Button size="sm" variant={searchMode === "ai" ? "primary" : "secondary"} aria-pressed={searchMode === "ai"} onClick={() => { setSearchMode("ai"); setQuery(""); setSelectedID(undefined); aiSearch.reset(); }}><Sparkles size={15} />AI 자연어 검색</Button>
      <Button size="sm" variant={searchMode === "keyword" ? "primary" : "secondary"} aria-pressed={searchMode === "keyword"} onClick={useKeywordFallback}>기본 키워드 검색</Button>
    </div> : null}
    <form className="mt-3 grid gap-2 rounded-surface border border-border-subtle bg-surface-raised p-3 md:grid-cols-[minmax(240px,1fr)_160px_160px_auto]" onSubmit={(event) => { event.preventDefault(); submitSearch(); }}>
      <label className="relative block"><span className="sr-only">문의 검색</span><Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-content-secondary" /><Input className="pl-9" value={queryInput} onChange={(event) => setQueryInput(event.target.value)} placeholder={role === "admin" ? "예: 지난주 처리 중인 배송 지연 문의" : "제목, 주문번호, 회원 이메일"} /></label>
      <Select aria-label="문의 상태" value={status} onChange={(event) => setStatus(event.target.value as "" | InquiryStatus)}><option value="">전체 상태</option><option value="STARTED">접수</option><option value="IN_PROGRESS">처리 중</option><option value="COMPLETED">처리 완료</option><option value="CLOSED">종료</option></Select>
      <Select aria-label="문의 유형" value={category} onChange={(event) => setCategory(event.target.value as "" | InquiryCategory)}><option value="">전체 유형</option>{inquiryCategories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
      <Button type="submit" disabled={aiSearch.isPending}>{role === "admin" && searchMode === "ai" ? <><Sparkles size={16} />{aiSearch.isPending ? "AI가 분석 중" : "AI 검색"}</> : "검색"}</Button>
    </form>
    {aiActive && aiSearch.data ? <AISearchExplanation result={aiSearch.data} /> : null}
    {aiActive && aiSearch.error ? <Notice className="mt-4" tone="error" title="AI 검색을 완료하지 못했습니다"><p>{apiErrorMessage(aiSearch.error)}</p><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={() => aiSearch.mutate(query)}>AI 검색 다시 시도</Button><Button size="sm" variant="secondary" onClick={useKeywordFallback}>기본 키워드 검색으로 전환</Button></div></Notice> : null}
    <div className="mt-5 grid min-h-[620px] gap-4 xl:grid-cols-[minmax(340px,0.85fr)_minmax(480px,1.4fr)]">
      <ConsoleSection title={`문의 목록 ${page ? `${page.total}건` : ""}`} description={aiActive ? "AI가 각 결과의 관련성을 설명합니다." : role === "seller" ? "최신 업데이트 순" : "검색 결과와 최신 업데이트 순"}>
        {pageLoading ? <InlineLoadingState label={aiActive ? "AI가 요청과 검색 결과를 분석하고 있습니다." : "문의 목록을 불러오는 중입니다."} /> : null}
        {!aiActive && pageError ? <Notice tone="error">{apiErrorMessage(pageError)}</Notice> : null}
        <div className="-mx-1 space-y-2">{page?.items.map((inquiry) => <button key={inquiry.id} type="button" onClick={() => setSelectedID(inquiry.id)} className={`w-full rounded-control border p-3 text-left transition ${selectedID === inquiry.id ? "border-action-primary bg-action-secondary" : "border-border-subtle bg-surface-raised hover:border-action-primary/35"}`}>
          <div className="flex items-center justify-between gap-2"><InquiryStatusBadge status={inquiry.status} /><span className="text-[11px] text-content-tertiary">{inquiryDate(inquiry.updated_at)}</span></div>
          <p className="mt-2 truncate text-sm font-bold">{inquiry.title}</p><p className="mt-1 text-xs text-content-secondary">{categoryLabel(inquiry.category, inquiry.subcategory)} · {inquiry.member_email}</p>
          {inquiry.order_code ? <p className="mt-1 text-xs font-bold text-action-primary">주문 {inquiry.order_code}</p> : null}
          {isAISearchItem(inquiry) ? <div className="mt-3 rounded-control bg-action-secondary px-3 py-2"><p className="text-[11px] font-bold text-action-primary">AI가 찾은 이유</p><p className="mt-1 text-xs leading-5 text-content-secondary">{inquiry.match_reason}</p>{inquiry.highlights?.length ? <div className="mt-2 flex flex-wrap gap-1">{inquiry.highlights.map((highlight) => <span key={highlight} className="rounded-full bg-surface-raised px-2 py-1 text-[10px] font-bold">{highlight}</span>)}</div> : null}</div> : null}
        </button>)}</div>
        {page && !page.items.length ? <EmptyState icon={<MessageSquareText className="size-7" />} title="조건에 맞는 문의가 없습니다" description={aiActive ? aiSearch.data?.summary ?? "검색 조건을 바꿔보세요." : "검색어나 필터를 바꿔보세요."} /> : null}
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

function AISearchExplanation({ result }: { result: Awaited<ReturnType<typeof api.searchAdminInquiries>> }) {
  const period = interpretationPeriod(result.interpretation.created_from, result.interpretation.created_to);
  return <section data-testid="ai-search-explanation" className="mt-4 rounded-surface border border-action-primary/25 bg-action-secondary p-4">
    <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-action-primary text-content-on-brand"><Sparkles size={17} /></span><div><p className="text-xs font-bold text-action-primary">AI 검색 해석</p><p className="mt-1 font-bold">{result.interpretation.summary}</p><p className="mt-2 text-sm leading-6 text-content-secondary">{result.summary}</p></div></div>
    <div className="mt-3 flex flex-wrap gap-2">{result.interpretation.keywords.map((keyword) => <span key={keyword} className="rounded-full border border-action-primary/20 bg-surface-raised px-3 py-1 text-xs font-bold text-action-primary">{keyword}</span>)}{result.interpretation.status ? <span className="rounded-full bg-surface-raised px-3 py-1 text-xs font-bold">상태 · {result.interpretation.status}</span> : null}{result.interpretation.category ? <span className="rounded-full bg-surface-raised px-3 py-1 text-xs font-bold">유형 · {categoryLabel(result.interpretation.category)}</span> : null}{period ? <span className="rounded-full bg-surface-raised px-3 py-1 text-xs font-bold">기간 · {period}</span> : null}</div>
  </section>;
}

function interpretationPeriod(from?: string, to?: string) {
  if (!from && !to) return "";
  const formatter = new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", timeZone: "Asia/Seoul" });
  return `${from ? formatter.format(new Date(from)) : "이전"} ~ ${to ? formatter.format(new Date(to)) : "현재"}`;
}

type AISearchItem = NaturalLanguageInquirySearchResponse["items"][number];

function isAISearchItem(inquiry: OperatorInquiry | AISearchItem): inquiry is AISearchItem {
  return "match_reason" in inquiry && typeof inquiry.match_reason === "string";
}

function Related({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[11px] font-bold text-content-tertiary">{label}</p><p className="mt-1 break-words text-sm font-bold">{value}</p></div>;
}
