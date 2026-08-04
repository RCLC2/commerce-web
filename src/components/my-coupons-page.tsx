"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useSessionStore } from "@/lib/session-store";
import { formatPrice } from "@/lib/utils";
import { Button } from "./ui/button";

export function MyCouponsPage() {
  const token = useSessionStore((state) => state.accessToken) ?? "";
  const queryClient = useQueryClient();
  const [issueResolution, setIssueResolution] = useState<string | null>(null);
  const view = useSearchParams().get("view") === "owned" ? "owned" : "issuable";
  const issuable = useQuery({ queryKey: queryKeys.issuableCoupons(token), queryFn: () => api.listIssuableCoupons(token), enabled: Boolean(token) });
  const owned = useQuery({ queryKey: queryKeys.coupons(token), queryFn: () => api.listCoupons(token), enabled: Boolean(token) });
  const issue = useMutation({
    mutationFn: (id: number) => api.issueCoupon(token, id),
    onSuccess: async (_, id) => {
      queryClient.setQueryData<Awaited<ReturnType<typeof api.listIssuableCoupons>>>(
        queryKeys.issuableCoupons(token),
        (current) => current?.filter((coupon) => coupon.id !== id),
      );
      setIssueResolution("쿠폰을 발급했습니다.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.issuableCoupons(token) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.coupons(token) }),
      ]);
    },
  });
  const items = view === "owned" ? owned.data ?? [] : issuable.data ?? [];
  const selectedQuery = view === "owned" ? owned : issuable;

  async function retryIssue() {
    const couponID = issue.variables;
    if (couponID === undefined) return;
    const refreshed = await issuable.refetch();
    if (refreshed.isError) return;
    if (!refreshed.data?.some((coupon) => coupon.id === couponID)) {
      issue.reset();
      setIssueResolution("쿠폰 발급 상태를 확인했습니다.");
      await queryClient.invalidateQueries({ queryKey: queryKeys.coupons(token) });
      return;
    }
    issue.mutate(couponID);
  }

  if (!token) {
    return <main className="mx-auto max-w-3xl px-4 py-16"><h1 className="text-2xl font-black">쿠폰</h1><Link href="/login?next=/mypage/coupons"><Button className="mt-5">로그인하기</Button></Link></main>;
  }

  return <main className="mx-auto max-w-3xl px-4 pb-24 pt-8">
    <Link href="/mypage" className="inline-flex items-center gap-1 text-sm font-bold text-muted"><ArrowLeft size={17} /> 뒤로가기</Link>
    <h1 className="mt-5 text-2xl font-black">쿠폰</h1>
    <div className="mt-5 flex gap-2"><Link href="/mypage/coupons?view=issuable" className={`rounded-full px-4 py-2 text-sm font-black ${view === "issuable" ? "bg-brand text-white" : "bg-zinc-100"}`}>발급 가능한 쿠폰</Link><Link href="/mypage/coupons?view=owned" className={`rounded-full px-4 py-2 text-sm font-black ${view === "owned" ? "bg-brand text-white" : "bg-zinc-100"}`}>발급한 쿠폰</Link></div>
    <div className="mt-6 space-y-3">
      {selectedQuery.isLoading ? <p className="text-sm text-muted">쿠폰을 불러오는 중입니다.</p> : null}
      {selectedQuery.error ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-red-50 p-4 text-sm font-bold text-brand"><p>쿠폰을 불러오지 못했습니다. {apiErrorMessage(selectedQuery.error)}</p><Button size="sm" variant="secondary" onClick={() => void selectedQuery.refetch()}>다시 불러오기</Button></div> : null}
      {issue.error ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-red-50 p-4 text-sm font-bold text-brand"><p>쿠폰을 발급하지 못했습니다. {apiErrorMessage(issue.error)}</p><Button size="sm" variant="secondary" disabled={issue.isPending || issue.variables === undefined} onClick={() => void retryIssue()}>발급 상태 확인 후 다시 시도</Button></div> : null}
      {issueResolution ? <p className="rounded-md bg-emerald-50 p-4 text-sm font-bold text-emerald-900">{issueResolution}</p> : null}
      {view === "issuable" ? (items as Awaited<ReturnType<typeof api.listIssuableCoupons>>).map((coupon) => <article key={coupon.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white p-4"><div><p className="font-black">{coupon.name}</p><p className="mt-1 text-xs text-muted">{coupon.condition_text}</p></div><Button size="sm" disabled={issue.isPending} onClick={() => { setIssueResolution(null); issue.reset(); issue.mutate(coupon.id); }}>{issue.isPending && issue.variables === coupon.id ? "발급 중" : "쿠폰 받기"}</Button></article>) : (items as Awaited<ReturnType<typeof api.listCoupons>>).map((item) => <article key={item.id} className="rounded-xl border border-line bg-white p-4"><p className="font-black">{item.coupon.name}</p><p className="mt-1 text-xs text-muted">{formatPrice(item.coupon.min_order_amount)} 이상 구매 시 · {new Date(item.expires_at).toLocaleDateString("ko-KR")}까지</p></article>)}
      {selectedQuery.isSuccess && !items.length ? <p className="rounded-md border border-line bg-white p-8 text-center text-sm text-muted">표시할 쿠폰이 없습니다.</p> : null}
    </div>
  </main>;
}
