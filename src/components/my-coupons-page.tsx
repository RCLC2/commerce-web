"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useSessionStore } from "@/lib/session-store";
import { formatPrice } from "@/lib/utils";
import { Button } from "./ui/button";

export function MyCouponsPage() {
  const token = useSessionStore((state) => state.accessToken) ?? "";
  const queryClient = useQueryClient();
  const view = useSearchParams().get("view") === "owned" ? "owned" : "issuable";
  const issuable = useQuery({ queryKey: queryKeys.issuableCoupons(token), queryFn: () => api.listIssuableCoupons(token), enabled: Boolean(token) });
  const owned = useQuery({ queryKey: queryKeys.coupons(token), queryFn: () => api.listCoupons(token), enabled: Boolean(token) });
  const issue = useMutation({ mutationFn: (id: number) => api.issueCoupon(token, id), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: queryKeys.issuableCoupons(token) }); void queryClient.invalidateQueries({ queryKey: queryKeys.coupons(token) }); } });
  const items = view === "owned" ? owned.data ?? [] : issuable.data ?? [];

  return <main className="mx-auto max-w-3xl px-4 pb-24 pt-8">
    <Link href="/mypage" className="inline-flex items-center gap-1 text-sm font-bold text-muted"><ArrowLeft size={17} /> 뒤로가기</Link>
    <h1 className="mt-5 text-2xl font-black">쿠폰</h1>
    <div className="mt-5 flex gap-2"><Link href="/mypage/coupons?view=issuable" className={`rounded-full px-4 py-2 text-sm font-black ${view === "issuable" ? "bg-brand text-white" : "bg-zinc-100"}`}>발급 가능한 쿠폰</Link><Link href="/mypage/coupons?view=owned" className={`rounded-full px-4 py-2 text-sm font-black ${view === "owned" ? "bg-brand text-white" : "bg-zinc-100"}`}>발급한 쿠폰</Link></div>
    <div className="mt-6 space-y-3">
      {view === "issuable" ? (items as Awaited<ReturnType<typeof api.listIssuableCoupons>>).map((coupon) => <article key={coupon.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white p-4"><div><p className="font-black">{coupon.name}</p><p className="mt-1 text-xs text-muted">{coupon.condition_text}</p></div><Button size="sm" disabled={issue.isPending} onClick={() => issue.mutate(coupon.id)}>쿠폰 받기</Button></article>) : (items as Awaited<ReturnType<typeof api.listCoupons>>).map((item) => <article key={item.id} className="rounded-xl border border-line bg-white p-4"><p className="font-black">{item.coupon.name}</p><p className="mt-1 text-xs text-muted">{formatPrice(item.coupon.min_order_amount)} 이상 구매 시 · {new Date(item.expires_at).toLocaleDateString("ko-KR")}까지</p></article>)}
      {!items.length ? <p className="rounded-md border border-line bg-white p-8 text-center text-sm text-muted">표시할 쿠폰이 없습니다.</p> : null}
    </div>
  </main>;
}
