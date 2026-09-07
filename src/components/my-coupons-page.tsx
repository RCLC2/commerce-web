"use client";

import { PageHeading } from "./ui/page-heading";
import { Ticket as PageIcon } from "lucide-react";

import { ButtonLink } from "@/components/ui/button-link";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useSessionStore } from "@/lib/session-store";
import type { CouponDefinition } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { Button } from "./ui/button";

export function MyCouponsPage() {
  const token = useSessionStore((state) => state.accessToken) ?? "";
  const memberID = useSessionStore((state) => state.memberID);
  const queryClient = useQueryClient();
  const [issueResolution, setIssueResolution] = useState<{ message: string; tone: "success" | "warning" } | null>(null);
  const view = useSearchParams().get("view") === "owned" ? "owned" : "issuable";
  const issuable = useQuery({ queryKey: queryKeys.issuableCoupons(memberID), queryFn: () => api.listIssuableCoupons(token), enabled: Boolean(token) });
  const owned = useQuery({ queryKey: queryKeys.coupons(memberID), queryFn: () => api.listCoupons(token), enabled: Boolean(token) });
  const issue = useMutation({
    mutationFn: (id: number) => api.issueCoupon(token, id),
    onSuccess: async (_, id) => {
      queryClient.setQueryData<Awaited<ReturnType<typeof api.listIssuableCoupons>>>(
        queryKeys.issuableCoupons(memberID),
        (current) => current?.filter((coupon) => coupon.id !== id),
      );
      setIssueResolution({ message: "쿠폰을 발급했습니다.", tone: "success" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.issuableCoupons(memberID) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.coupons(memberID) }),
      ]);
    },
  });
  const items = view === "owned" ? owned.data ?? [] : issuable.data ?? [];
  const selectedQuery = view === "owned" ? owned : issuable;

  async function retryIssue() {
    const couponID = issue.variables;
    if (couponID === undefined) return;
    const [refreshedIssuable, refreshedOwned] = await Promise.all([
      issuable.refetch(),
      owned.refetch(),
    ]);
    if (refreshedIssuable.isError || refreshedOwned.isError) return;
    if (refreshedOwned.data?.some((coupon) => coupon.coupon_id === couponID)) {
      issue.reset();
      setIssueResolution({ message: "발급된 쿠폰을 확인했습니다.", tone: "success" });
      return;
    }
    if (!refreshedIssuable.data?.some((coupon) => coupon.id === couponID)) {
      setIssueResolution({ message: "보유·발급 가능 목록 어디에서도 쿠폰 상태를 확인하지 못했습니다. 다른 쿠폰을 발급하기 전에 상태를 다시 확인해주세요.", tone: "warning" });
      return;
    }
    issue.mutate(couponID);
  }

  if (!token) {
    return <main className="mx-auto max-w-3xl px-4 py-16"><h1 className="text-2xl font-bold">쿠폰</h1><ButtonLink href="/login?next=/mypage/coupons" className="mt-5">로그인하기</ButtonLink></main>;
  }

  return <main className="mx-auto max-w-3xl px-4 pb-24 pt-8">
    <Link href="/mypage" className="inline-flex items-center gap-1 text-sm font-bold text-content-secondary"><ArrowLeft size={17} /> 뒤로가기</Link>
    <PageHeading className="mt-5" icon={<PageIcon />} title="쿠폰" description="발급 가능한 혜택과 보유한 쿠폰을 확인하세요." />
    <nav className="mt-5 flex flex-wrap gap-2" aria-label="쿠폰 목록">
      <ButtonLink href="/mypage/coupons?view=issuable" variant={view === "issuable" ? "primary" : "secondary"} aria-current={view === "issuable" ? "page" : undefined} className="rounded-full">발급 가능한 쿠폰</ButtonLink>
      <ButtonLink href="/mypage/coupons?view=owned" variant={view === "owned" ? "primary" : "secondary"} aria-current={view === "owned" ? "page" : undefined} className="rounded-full">발급한 쿠폰</ButtonLink>
    </nav>
    <div className="mt-6 space-y-3">
      {selectedQuery.isLoading ? <p className="text-sm text-content-secondary">쿠폰을 불러오는 중입니다.</p> : null}
      {selectedQuery.error ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-status-negative-subtle p-4 text-sm font-bold text-status-negative"><p>쿠폰을 불러오지 못했습니다. {apiErrorMessage(selectedQuery.error)}</p><Button size="sm" variant="secondary" onClick={() => void selectedQuery.refetch()}>다시 불러오기</Button></div> : null}
      {issue.error ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-status-negative-subtle p-4 text-sm font-bold text-status-negative"><p>쿠폰을 발급하지 못했습니다. {apiErrorMessage(issue.error)}</p><Button size="sm" variant="secondary" disabled={issue.isPending || issue.variables === undefined} onClick={() => void retryIssue()}>발급 상태 확인 후 다시 시도</Button></div> : null}
      {issueResolution ? <p className={`rounded-md p-4 text-sm font-bold ${issueResolution.tone === "success" ? "bg-status-positive-subtle text-status-positive" : "bg-status-warning-subtle text-status-warning"}`}>{issueResolution.message}</p> : null}
      {view === "issuable" ? (issuable.data ?? []).map((coupon) => (
        <article key={coupon.id} className="rounded-surface border border-border-subtle bg-surface-raised p-4">
          <CouponHeading coupon={coupon} />
          <p className="mt-2 text-xs leading-5 text-content-secondary">{coupon.condition_text || `${formatPrice(coupon.min_order_amount)} 이상 구매 시`}</p>
          <div className="mt-4 flex justify-end">
            <Button disabled={issue.isPending || issue.isError} onClick={() => { setIssueResolution(null); issue.reset(); issue.mutate(coupon.id); }}>{issue.isPending && issue.variables === coupon.id ? "발급 중" : "쿠폰 받기"}</Button>
          </div>
        </article>
      )) : (owned.data ?? []).map((item) => (
        <article key={item.id} className="rounded-surface border border-border-subtle bg-surface-raised p-4">
          <CouponHeading coupon={item.coupon} />
          <p className="mt-2 text-xs leading-5 text-content-secondary">{formatPrice(item.coupon.min_order_amount)} 이상 구매 시 · {new Date(item.expires_at).toLocaleDateString("ko-KR")}까지</p>
        </article>
      ))}
      {selectedQuery.isSuccess && !items.length ? <p className="rounded-md border border-border-subtle bg-surface-raised p-8 text-center text-sm text-content-secondary">표시할 쿠폰이 없습니다.</p> : null}
    </div>
  </main>;
}

function CouponHeading({ coupon }: { coupon: CouponDefinition }) {
  const benefit = coupon.discount_type === "PERCENT"
    ? `${coupon.discount_value.toLocaleString("ko-KR")}% 할인`
    : coupon.discount_type === "AMOUNT" ? `${formatPrice(coupon.discount_value)} 할인` : null;
  return (
    <div className="min-w-0">
      <h2 className="text-sm font-medium text-content-secondary">{coupon.name}</h2>
      {benefit ? <p className="mt-2 break-keep text-[32px] font-bold leading-tight tracking-tight text-action-primary">{benefit}</p> : null}
    </div>
  );
}
