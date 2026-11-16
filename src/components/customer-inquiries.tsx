"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronRight, CircleHelp, MessageCircle, Plus, Send, Star, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-client";
import type { InquiryCategory, InquiryStatus } from "@/lib/api/inquiries";
import { categoryLabel, inquiryCategories, inquiryDate, inquiryStatusMeta, inquirySubcategories, surveyAvailable } from "@/lib/inquiries";
import { useSessionStore } from "@/lib/session-store";
import { BackButton } from "./ui/back-button";
import { Button } from "./ui/button";
import { EmptyState, InlineLoadingState, LoginRequiredState } from "./ui/feedback";
import { Input, Select, Textarea } from "./ui/input";
import { Notice } from "./ui/notice";
import { PageHeading } from "./ui/page-heading";
import { PageLayout } from "./page-layout";
import { InquiryStatusBadge } from "./inquiry-status-badge";

const inquiryKeys = {
  all: (memberID: number | null) => ["my-inquiries", memberID] as const,
  detail: (memberID: number | null, inquiryID: number) => ["my-inquiry", memberID, inquiryID] as const,
};

export function CustomerInquiryListPage() {
  const token = useSessionStore((state) => state.accessToken) ?? "";
  const memberID = useSessionStore((state) => state.memberID);
  const [status, setStatus] = useState<"ALL" | InquiryStatus>("ALL");
  const page = useQuery({
    queryKey: [...inquiryKeys.all(memberID), status],
    queryFn: () => api.listMyInquiries(token, { status: status === "ALL" ? undefined : status, limit: 100 }),
    enabled: Boolean(token),
  });

  if (!token) return <InquiryLoginRequired />;

  return <PageLayout className="max-w-4xl pb-28">
    <BackButton fallbackHref="/mypage" className="mb-4" />
    <div className="flex items-start justify-between gap-4">
      <PageHeading icon={<MessageCircle />} eyebrow="고객센터" title="1:1 문의" description="문의와 답변을 대화처럼 이어서 확인할 수 있어요." />
      <Link href="/mypage/inquiries/new" className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-control bg-button-primary px-4 text-sm font-bold text-button-primary-content shadow-button-primary"><Plus size={17} />새 문의</Link>
    </div>
    <div className="mt-6 flex gap-2 overflow-x-auto pb-2" aria-label="문의 상태 필터">
      {(["ALL", "STARTED", "IN_PROGRESS", "COMPLETED", "CLOSED"] as const).map((value) => <button key={value} type="button" onClick={() => setStatus(value)} className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-bold ${status === value ? "border-action-primary bg-action-secondary text-action-primary" : "border-border-subtle bg-surface-raised text-content-secondary"}`}>{value === "ALL" ? "전체" : inquiryStatusMeta[value].label}</button>)}
    </div>
    {page.isLoading ? <InlineLoadingState className="mt-4" label="문의 내역을 불러오는 중입니다." /> : null}
    {page.error ? <Notice className="mt-4" tone="error">{apiErrorMessage(page.error)}<Button className="mt-3" size="sm" variant="secondary" onClick={() => void page.refetch()}>다시 시도</Button></Notice> : null}
    <div className="mt-4 space-y-3">
      {page.data?.items.map((inquiry) => <Link key={inquiry.id} href={`/mypage/inquiries/${inquiry.id}`} className="block rounded-surface border border-border-subtle bg-surface-raised p-4 shadow-card transition hover:border-action-primary/40 sm:p-5">
        <div className="flex items-center justify-between gap-3"><InquiryStatusBadge status={inquiry.status} /><time className="text-xs text-content-tertiary">{inquiryDate(inquiry.updated_at)}</time></div>
        <p className="mt-3 text-xs font-bold text-action-primary">{categoryLabel(inquiry.category, inquiry.subcategory)}</p>
        <div className="mt-1 flex items-center justify-between gap-3"><h2 className="min-w-0 truncate font-bold">{inquiry.title}</h2><ChevronRight size={18} className="shrink-0 text-content-tertiary" /></div>
        {inquiry.status === "COMPLETED" && surveyAvailable(inquiry.satisfaction_due_at) ? <p className="mt-3 text-xs font-bold text-status-positive">만족도 조사에 참여할 수 있어요</p> : null}
      </Link>)}
      {page.isSuccess && !page.data.items.length ? <EmptyState icon={<MessageCircle className="size-7" />} title="문의 내역이 없습니다" description="도움이 필요한 내용을 새 문의로 남겨주세요." action={<Link href="/mypage/inquiries/new" className="font-bold text-action-primary">새 문의 작성</Link>} /> : null}
    </div>
  </PageLayout>;
}

export function CreateInquiryPage({ initialOrderCode = "", initialLineItemID }: { initialOrderCode?: string; initialLineItemID?: number }) {
  const router = useRouter();
  const token = useSessionStore((state) => state.accessToken) ?? "";
  const memberID = useSessionStore((state) => state.memberID);
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<InquiryCategory>(initialOrderCode ? "ORDER" : "OTHER");
  const [subcategory, setSubcategory] = useState(initialOrderCode ? "DELIVERY" : "OTHER");
  const [orderCode, setOrderCode] = useState(initialOrderCode);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const create = useMutation({
    mutationFn: () => api.createInquiry(token, {
      category,
      subcategory,
      title: title.trim(),
      message: message.trim(),
      order_code: category === "ORDER" ? orderCode.trim() : undefined,
      order_line_item_id: category === "ORDER" ? initialLineItemID : undefined,
    }),
    onSuccess: (inquiry) => {
      void queryClient.invalidateQueries({ queryKey: inquiryKeys.all(memberID) });
      router.push(`/mypage/inquiries/${inquiry.id}`);
    },
  });

  if (!token) return <InquiryLoginRequired next="/mypage/inquiries/new" />;
  const subcategories = inquirySubcategories[category];
  const answerCard = autoAnswerCard(category, subcategory);
  const valid = title.trim().length > 0 && message.trim().length > 0 && (category !== "ORDER" || orderCode.trim().length > 0);

  return <PageLayout className="max-w-3xl pb-28">
    <BackButton fallbackHref="/mypage/inquiries" className="mb-4" />
    <PageHeading icon={<CircleHelp />} eyebrow="고객센터" title="새 문의 작성" description="주문 문의는 주문번호와 상품을 기준으로 담당 판매자에게 전달돼요." />
    <form className="mt-6 space-y-5" onSubmit={(event) => { event.preventDefault(); if (valid) create.mutate(); }}>
      <fieldset><legend className="text-sm font-bold">문의 유형</legend><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{inquiryCategories.map((item) => <button key={item.value} type="button" onClick={() => { setCategory(item.value); setSubcategory(inquirySubcategories[item.value][0].value); }} className={`rounded-control border p-3 text-left ${category === item.value ? "border-action-primary bg-action-secondary" : "border-border-subtle bg-surface-raised"}`}><span className="block text-sm font-bold">{item.label}</span><span className="mt-1 block text-[11px] leading-4 text-content-secondary">{item.description}</span></button>)}</div></fieldset>
      <label className="block text-sm font-bold">세부 유형<Select className="mt-2" value={subcategory} onChange={(event) => setSubcategory(event.target.value)}>{subcategories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></label>
      {category === "ORDER" ? <label className="block text-sm font-bold">주문번호<Input className="mt-2" value={orderCode} onChange={(event) => setOrderCode(event.target.value)} placeholder="예: ORD-20261116-1001" required /></label> : null}
      {answerCard ? <Notice title={answerCard.title}><p>{answerCard.body}</p><Link className="mt-2 inline-block font-bold text-action-primary hover:underline" href={answerCard.href}>{answerCard.link}</Link></Notice> : null}
      <label className="block text-sm font-bold">제목<Input className="mt-2" maxLength={255} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="궁금한 내용을 한 줄로 알려주세요" required /></label>
      <label className="block text-sm font-bold">문의 내용<Textarea className="mt-2 min-h-44" maxLength={5000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="상황을 자세히 적어주시면 더 빠르게 확인할 수 있어요." required /><span className="mt-1 block text-right text-xs font-normal text-content-tertiary">{message.length}/5,000</span></label>
      {create.error ? <Notice tone="error">{apiErrorMessage(create.error)}</Notice> : null}
      <Button className="w-full" size="lg" type="submit" disabled={!valid || create.isPending}>{create.isPending ? "접수 중" : "문의 접수"}</Button>
    </form>
  </PageLayout>;
}

export function CustomerInquiryDetailPage({ inquiryID }: { inquiryID: number }) {
  const token = useSessionStore((state) => state.accessToken) ?? "";
  const memberID = useSessionStore((state) => state.memberID);
  const queryClient = useQueryClient();
  const [reply, setReply] = useState("");
  const lastMarkedRead = useRef<{ inquiryID: number; messageID: number } | null>(null);
  const detail = useQuery({
    queryKey: inquiryKeys.detail(memberID, inquiryID),
    queryFn: () => api.getMyInquiry(token, inquiryID),
    enabled: Boolean(token && inquiryID),
    refetchInterval: 5_000,
  });
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: inquiryKeys.detail(memberID, inquiryID) }),
    queryClient.invalidateQueries({ queryKey: inquiryKeys.all(memberID) }),
  ]);
  const send = useMutation({ mutationFn: () => api.replyToInquiry(token, inquiryID, reply.trim()), onSuccess: async () => { setReply(""); await refresh(); } });
  const close = useMutation({ mutationFn: () => api.closeInquiry(token, inquiryID), onSuccess: refresh });
  const latestOperatorMessage = useMemo(() => [...(detail.data?.messages ?? [])].reverse().find((message) => message.sender_type !== "MEMBER"), [detail.data?.messages]);
  const markRead = useMutation({
    mutationFn: (messageID: number) => api.markInquiryRead(token, inquiryID, messageID),
    onError: (_error, messageID) => {
      if (lastMarkedRead.current?.inquiryID === inquiryID && lastMarkedRead.current.messageID === messageID) lastMarkedRead.current = null;
    },
  });

  useEffect(() => {
    if (!latestOperatorMessage) return;
    const alreadyMarked = lastMarkedRead.current?.inquiryID === inquiryID && lastMarkedRead.current.messageID === latestOperatorMessage.id;
    if (alreadyMarked) return;
    lastMarkedRead.current = { inquiryID, messageID: latestOperatorMessage.id };
    markRead.mutate(latestOperatorMessage.id);
  }, [inquiryID, latestOperatorMessage, markRead]);

  if (!token) return <InquiryLoginRequired next={`/mypage/inquiries/${inquiryID}`} />;
  if (detail.isLoading) return <PageLayout className="max-w-3xl"><InlineLoadingState label="문의 대화를 불러오는 중입니다." /></PageLayout>;
  if (!detail.data) return <PageLayout className="max-w-3xl"><BackButton fallbackHref="/mypage/inquiries" /><Notice className="mt-4" tone="error">{apiErrorMessage(detail.error ?? new Error("문의를 찾을 수 없습니다."))}</Notice></PageLayout>;
  const inquiry = detail.data;
  const canReply = inquiry.status !== "CLOSED";

  return <PageLayout className="max-w-3xl pb-32">
    <BackButton fallbackHref="/mypage/inquiries" className="mb-4" />
    <div className="rounded-surface border border-border-subtle bg-surface-raised p-5 shadow-card">
      <div className="flex items-center justify-between gap-3"><InquiryStatusBadge status={inquiry.status} /><time className="text-xs text-content-tertiary">{inquiryDate(inquiry.created_at)}</time></div>
      <p className="mt-4 text-xs font-bold text-action-primary">{categoryLabel(inquiry.category, inquiry.subcategory)}</p>
      <h1 className="mt-1 text-xl font-bold">{inquiry.title}</h1>
      <p className="mt-3 text-sm leading-6 text-content-secondary">{inquiryStatusMeta[inquiry.status].description}</p>
    </div>
    <section className="mt-6 space-y-4" aria-label="문의 대화">{(inquiry.messages ?? []).map((message) => {
      const mine = message.sender_type === "MEMBER";
      return <article key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] rounded-surface px-4 py-3 ${mine ? "bg-action-primary text-content-on-brand" : message.sender_type === "SYSTEM" ? "border border-border-subtle bg-surface-subtle" : "border border-action-primary/15 bg-action-secondary"}`}><p className={`text-xs font-bold ${mine ? "text-content-on-brand/80" : "text-action-primary"}`}>{mine ? "나" : message.sender_type === "SELLER" ? "판매자" : message.sender_type === "ADMIN" ? "고객센터" : "안내"}</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{message.body}</p><time className={`mt-2 block text-[11px] ${mine ? "text-content-on-brand/70" : "text-content-tertiary"}`}>{inquiryDate(message.created_at)}</time></div></article>;
    })}</section>
    {!inquiry.satisfaction_response && surveyAvailable(inquiry.satisfaction_due_at) && (inquiry.status === "COMPLETED" || inquiry.status === "CLOSED") ? <SatisfactionSurvey inquiryID={inquiry.id} token={token} /> : null}
    {canReply ? <section className="mt-6 rounded-surface border border-border-subtle bg-surface-raised p-4"><label className="text-sm font-bold">추가 메시지<Textarea className="mt-2 min-h-28" value={reply} onChange={(event) => setReply(event.target.value)} placeholder="추가로 궁금한 내용을 남겨주세요." maxLength={5000} /></label>{send.error ? <p className="mt-2 text-sm font-bold text-status-negative">{apiErrorMessage(send.error)}</p> : null}<div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between"><Button variant="secondary" disabled={close.isPending} onClick={() => close.mutate()}><X size={16} />문의 종료</Button><Button disabled={!reply.trim() || send.isPending} onClick={() => send.mutate()}><Send size={16} />답변 보내기</Button></div></section> : <Notice className="mt-6">종료된 문의에는 메시지를 추가할 수 없습니다. 새로운 내용은 새 문의로 접수해주세요.</Notice>}
  </PageLayout>;
}

function SatisfactionSurvey({ inquiryID, token }: { inquiryID: number; token: string }) {
  const [resolved, setResolved] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [reasons, setReasons] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const submit = useMutation({ mutationFn: () => api.submitInquirySatisfaction(token, inquiryID, { resolved: resolved ?? false, score, reasons, comment: comment.trim() }), onSuccess: () => setSubmitted(true) });
  const dissatisfied = resolved === false || score > 0 && score <= 2;
  const valid = resolved !== null && score > 0 && (!dissatisfied || (reasons.length > 0 && comment.trim().length > 0));
  if (submitted) return <Notice className="mt-6" title="의견을 보내주셔서 감사합니다">남겨주신 만족도는 고객 경험을 개선하는 데 활용할게요.</Notice>;
  return <section className="mt-6 rounded-surface border border-action-primary/25 bg-action-secondary/40 p-5" data-testid="satisfaction-survey">
    <p className="text-xs font-bold text-action-primary">고객 만족도</p><h2 className="mt-1 text-lg font-bold">문의가 잘 해결되었나요?</h2>
    <div className="mt-4 grid grid-cols-2 gap-2"><Button variant={resolved === true ? "primary" : "secondary"} onClick={() => setResolved(true)}><Check size={17} />네, 해결됐어요</Button><Button variant={resolved === false ? "primary" : "secondary"} onClick={() => setResolved(false)}><X size={17} />아니요</Button></div>
    <fieldset className="mt-5"><legend className="text-sm font-bold">답변 만족도</legend><div className="mt-2 flex gap-1">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-label={`${value}점`} onClick={() => setScore(value)} className="grid size-11 place-items-center rounded-control hover:bg-surface-raised"><Star className={value <= score ? "fill-promotion text-promotion" : "text-content-tertiary"} /></button>)}</div></fieldset>
    {dissatisfied ? <fieldset className="mt-4"><legend className="text-sm font-bold">아쉬웠던 점 <span className="text-status-negative">필수</span></legend><div className="mt-2 flex flex-wrap gap-2">{[["SLOW_RESPONSE", "답변이 늦어요"], ["NOT_RESOLVED", "해결되지 않았어요"], ["UNCLEAR_ANSWER", "답변이 이해하기 어려워요"], ["OTHER", "기타"]].map(([value, label]) => <button key={value} type="button" onClick={() => setReasons((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])} className={`min-h-10 rounded-full border px-3 text-xs font-bold ${reasons.includes(value) ? "border-action-primary bg-action-secondary text-action-primary" : "border-border-subtle bg-surface-raised"}`}>{label}</button>)}</div></fieldset> : null}
    <label className="mt-4 block text-sm font-bold">추가 의견 {dissatisfied ? <span className="text-status-negative">필수</span> : <span className="font-normal text-content-tertiary">선택</span>}<Textarea className="mt-2 min-h-24 bg-surface-raised" value={comment} onChange={(event) => setComment(event.target.value)} placeholder={dissatisfied ? "어떤 점이 아쉬웠는지 알려주세요." : "좋았던 점을 남겨주세요."} /></label>
    {submit.error ? <p className="mt-2 text-sm font-bold text-status-negative">{apiErrorMessage(submit.error)}</p> : null}<Button className="mt-4 w-full" disabled={!valid || submit.isPending} onClick={() => submit.mutate()}>만족도 보내기</Button>
  </section>;
}

function InquiryLoginRequired({ next = "/mypage/inquiries" }: { next?: string }) {
  return <PageLayout className="max-w-3xl"><PageHeading icon={<MessageCircle />} title="1:1 문의" /><LoginRequiredState className="mt-6" icon={<MessageCircle className="size-7" />} description="문의 내역을 확인하려면 로그인해주세요." loginHref={`/login?next=${encodeURIComponent(next)}`} /></PageLayout>;
}

function autoAnswerCard(category: InquiryCategory, subcategory: string) {
  if (category === "ORDER" && subcategory === "DELIVERY") return { title: "배송 위치를 먼저 확인해보세요", body: "주문 상세에서 택배사와 운송장 번호, 현재 배송 상태를 바로 확인할 수 있어요.", href: "/mypage", link: "주문 내역 보기" };
  if (category === "ORDER" && subcategory === "RETURN") return { title: "반품 신청은 주문 상세에서 가능해요", body: "상품별 반품 가능 수량과 환불 예정 금액을 확인한 뒤 바로 신청할 수 있어요.", href: "/mypage", link: "반품 가능한 주문 찾기" };
  if (category === "PROMOTION") return { title: "쿠폰 사용 조건을 확인해보세요", body: "쿠폰함에서 최소 주문금액, 유효기간과 적용 가능한 상품을 확인할 수 있어요.", href: "/mypage/coupons", link: "내 쿠폰함 보기" };
  return null;
}
