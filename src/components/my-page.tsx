"use client";

import { PageHeading } from "./ui/page-heading";
import { UserRound as PageIcon } from "lucide-react";

import { FilterChip } from "./ui/filter-chip";

import { Input } from "./ui/input";

import { useQueries, useQuery } from "@tanstack/react-query";
import { ChevronRight, Heart, Settings2, ShoppingBag, Ticket } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-client";
import { firstOrderItem, orderPaymentAmount, orderStatusLabel } from "@/lib/order-utils";
import { queryKeys } from "@/lib/query-keys";
import { previewInquiries } from "@/lib/inquiry-preview";
import { useSessionStore } from "@/lib/session-store";
import { formatPrice } from "@/lib/utils";
import { PageLayout } from "./page-layout";
import { CommerceMoneyWallet } from "./commerce-money-wallet";
import { MyInquirySummary } from "./my-inquiry-summary";
import { MyPageSupport } from "./my-page-support";
import { SafeImage } from "./safe-image";
import { Button } from "./ui/button";
import { EmptyState, InlineLoadingState, LoadingSpinner, LoginRequiredState } from "./ui/feedback";

const statuses = [
  ["ALL", "전체"], ["PAYMENT_PENDING", "결제 대기"], ["PAID", "결제 완료"], ["PLACED", "주문 접수"],
  ["SHIPPED", "배송 중"], ["DELIVERED", "배송 완료"], ["COMPLETED", "구매 확정"], ["CANCELLED", "취소"],
  ["RETURN_REQUESTED", "반품 요청"], ["RETURN_APPROVED", "반품 승인"], ["RETURN_REJECTED", "반품 거절"], ["RETURN_COMPLETED", "반품 완료"],
] as const;

export function MyPage() {
  const router = useRouter();
  const token = useSessionStore((state) => state.accessToken) ?? "";
  const memberID = useSessionStore((state) => state.memberID);
  const logout = useSessionStore((state) => state.logout);
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");


  const profileQuery = useQuery({ queryKey: queryKeys.me(memberID), queryFn: () => api.me(token), enabled: Boolean(token) });
  const ordersQuery = useQuery({ queryKey: queryKeys.orders(memberID), queryFn: () => api.listAllOrders(token), enabled: Boolean(token) });
  const couponsQuery = useQuery({ queryKey: queryKeys.coupons(memberID), queryFn: () => api.listCoupons(token), enabled: Boolean(token) });
  const issuableQuery = useQuery({ queryKey: queryKeys.issuableCoupons(memberID), queryFn: () => api.listIssuableCoupons(token), enabled: Boolean(token) });
  const reviewsQuery = useQuery({ queryKey: queryKeys.myReviews(memberID), queryFn: () => api.listMyReviews(token), enabled: Boolean(token) });

  const orders = ordersQuery.data ?? [];
  const productIDs = [...new Set(orders.flatMap((order) => order.market_orders?.flatMap((marketOrder) => marketOrder.line_items.map((item) => item.product_id)) ?? []))];
  const products = useQueries({ queries: productIDs.map((id) => ({ queryKey: queryKeys.product(id), queryFn: () => api.getProduct(id), staleTime: 300000 })) });
  const productByID = new Map(products.flatMap((query, index) => query.data ? [[productIDs[index], query.data] as const] : []));
  const filteredOrders = orders.filter((order) => {
    const item = firstOrderItem(order);
    const product = item ? item.product ?? productByID.get(item.product_id) : undefined;
    const keyword = search.trim().toLowerCase();
    return (status === "ALL" || order.status === status) && (!keyword || order.order_code.toLowerCase().includes(keyword) || product?.name.toLowerCase().includes(keyword));
  });

  if (!token) {
    return (
      <PageLayout>
        <PageHeading icon={<PageIcon />} title="마이페이지" />
        <LoginRequiredState
          className="mt-6"
          icon={<PageIcon className="size-7" />}
          description="로그인하고 주문과 혜택을 확인하세요."
          loginHref="/login?next=/mypage"
        />
      </PageLayout>
    );
  }

  const queryError = profileQuery.error ?? ordersQuery.error ?? couponsQuery.error ?? issuableQuery.error ?? reviewsQuery.error;
  const profile = profileQuery.data;

  return (
    <PageLayout className="pt-7">
      <section>
        <div className="flex items-start justify-between gap-3">
          <PageHeading className="[&_h1]:text-xl sm:[&_h1]:text-3xl" icon={<PageIcon />} eyebrow="마이페이지" title={`${profile?.email?.split("@")[0] || "회원"}님`} />
          <Link href="/mypage/profile" aria-label="회원정보 설정" className="grid size-11 shrink-0 place-items-center rounded-control border border-border-interactive text-action-primary shadow-card hover:bg-action-secondary"><Settings2 size={20} /></Link>
        </div>
        <div className="mt-6 grid grid-cols-6 rounded-surface border border-action-primary/15 bg-action-secondary/45 px-2 text-center sm:grid-cols-5" role="group" aria-label="내 쇼핑 현황">
          <SummaryMetric label="포인트" loadingLabel="포인트를 불러오는 중입니다." value={profileQuery.isSuccess ? `${(profile?.point_balance ?? 0).toLocaleString()}P` : null} />
          <SummaryMetric label="보유 쿠폰" loadingLabel="보유 쿠폰을 불러오는 중입니다." value={couponsQuery.isSuccess ? `${couponsQuery.data.length}장` : null} />
          <SummaryMetric label="전체 주문" loadingLabel="전체 주문을 불러오는 중입니다." value={ordersQuery.isSuccess ? `${orders.length}건` : null} />
          <Link href="/mypage/reviews" className="col-span-3 rounded-control border-t border-border-subtle px-2 py-4 transition hover:bg-action-secondary sm:col-span-1 sm:border-t-0" aria-label="내가 쓴 리뷰">
            <span className="block text-xs text-content-secondary">내가 쓴 리뷰</span><SummaryValue className="mt-1 justify-center" label="작성한 리뷰를 불러오는 중입니다." value={reviewsQuery.isSuccess ? `${reviewsQuery.data.length}건` : reviewsQuery.isError ? "확인 필요" : null} />
          </Link>
          <MyInquirySummary className="col-span-3 border-t border-border-subtle sm:col-span-1 sm:border-t-0" inquiries={process.env.NEXT_PUBLIC_INQUIRY_PREVIEW === "true" ? previewInquiries : undefined} isPreview={process.env.NEXT_PUBLIC_INQUIRY_PREVIEW === "true"} />
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Shortcut href="/cart" icon={<ShoppingBag size={19} />} label="장바구니" />
        <Shortcut href="/likes" icon={<Heart size={19} />} label="좋아요" />
        <Shortcut href="/mypage/coupons?view=issuable" icon={<Ticket size={19} />} label="받을 수 있는 쿠폰" value={issuableQuery.isSuccess ? `${issuableQuery.data.length}장` : null} loadingLabel="발급 가능한 쿠폰을 불러오는 중입니다." />
        <Shortcut href="/mypage/coupons?view=owned" icon={<Ticket size={19} />} label="내 쿠폰함" value={couponsQuery.isSuccess ? `${couponsQuery.data.length}장` : null} loadingLabel="발급한 쿠폰을 불러오는 중입니다." />
      </section>

      {queryError ? <div className="mt-5 rounded-control border border-status-negative-border bg-status-negative-subtle p-4 text-sm" role="alert"><p className="font-bold text-status-negative">{apiErrorMessage(queryError)}</p><Button className="mt-3" size="sm" variant="secondary" onClick={() => { void profileQuery.refetch(); void ordersQuery.refetch(); void couponsQuery.refetch(); void issuableQuery.refetch(); void reviewsQuery.refetch(); }}>다시 시도</Button></div> : null}

      <CommerceMoneyWallet pointBalance={profileQuery.isSuccess ? profileQuery.data.point_balance : null} pointsError={profileQuery.isError} onRetryPoints={() => { void profileQuery.refetch(); }} />

      <aside className="relative mt-6 flex min-h-28 items-center justify-between gap-4 overflow-hidden rounded-surface border border-action-primary/10 bg-action-secondary/40 px-5 py-5 sm:px-7" aria-label="광고 영역">
        <div><p className="text-[10px] font-bold tracking-[0.18em] text-action-primary">FOR YOUR NEXT FAVORITE</p><p className="mt-2 text-base font-bold">나를 위한 새로운 쇼핑 소식</p><p className="mt-1 text-xs text-content-secondary">새로운 혜택으로 곧 찾아올게요.</p></div>
        <span className="absolute right-3 top-3 rounded border border-border-subtle px-1.5 py-0.5 text-[9px] text-content-tertiary">AD</span>
        <Ticket className="mr-3 hidden size-12 -rotate-12 text-action-primary/25 sm:block" strokeWidth={1} aria-hidden="true" />
      </aside>

      <section className="mt-8" aria-labelledby="order-history-title">
        <h2 id="order-history-title" className="text-xl font-bold">주문 내역</h2>
        <p className="mt-1 text-sm text-content-secondary">주문 상태와 상품명으로 내역을 확인하세요.</p>
        <Input className="mt-4 h-11 w-full rounded-control border border-border-interactive px-3 text-sm outline-none md:max-w-sm" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="주문번호 또는 상품명 검색" placeholder="주문번호 또는 상품명 검색" />
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2" role="group" aria-label="주문 상태">
          {statuses.map(([value, label]) => <FilterChip key={value} selected={status === value} onClick={() => setStatus(value)}>{label}</FilterChip>)}
        </div>
        <div className="mt-3 space-y-3">
          {ordersQuery.isLoading ? <InlineLoadingState label="주문 내역을 불러오는 중입니다." /> : null}
          {filteredOrders.map((order) => {
            const item = firstOrderItem(order);
            const product = item ? item.product ?? productByID.get(item.product_id) : undefined;
            return <Link key={order.id} href={`/orders/${order.order_code}`} className="block rounded-surface border border-border-subtle bg-surface-raised p-4 shadow-card transition hover:border-border-interactive"><div className="flex gap-3"><div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-control bg-surface-subtle"><SafeImage src={product?.image_url} alt="" fill sizes="80px" className="object-cover" /></div><div className="min-w-0 flex-1"><div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:gap-3"><div className="min-w-0 max-w-full"><p className="font-bold">{orderStatusLabel(order.status)}</p><p className="mt-1 truncate text-sm font-bold">{product?.name ?? `상품 #${item?.product_id ?? "-"}`}</p></div><div className="shrink-0 whitespace-nowrap sm:text-right"><p className="text-xs text-content-secondary">최초 결제액</p><p className="mt-1 font-bold tabular-nums">{formatPrice(orderPaymentAmount(order))}</p></div></div><p className="mt-2 text-xs text-content-secondary">{order.ordered_at ? new Date(order.ordered_at).toLocaleDateString("ko-KR") : ""} · {order.order_code}</p></div></div></Link>;
          })}
          {ordersQuery.isSuccess && !filteredOrders.length ? <EmptyState icon={<ShoppingBag className="size-7" />} title="조건에 맞는 주문이 없습니다" description="주문 상태를 바꾸거나 다른 상품명으로 검색해보세요." /> : null}
        </div>
      </section>
      <MyPageSupport onLogout={() => { logout(); router.push("/login"); }} />
    </PageLayout>
  );
}

function Shortcut({ href, icon, label, value, loadingLabel }: { href: string; icon: React.ReactNode; label: string; value?: string | null; loadingLabel?: string }) {
  return <Link href={href} className="flex min-w-0 items-center gap-2 rounded-control border border-border-subtle bg-surface-raised px-3 py-4 text-xs font-bold shadow-card hover:border-action-primary/30 sm:px-4 sm:text-sm"><span className="text-action-primary">{icon}</span><span className="min-w-0 flex-1">{label}</span>{loadingLabel ? <SummaryValue className="text-xs" label={loadingLabel} value={value ?? null} /> : null}<ChevronRight size={16} className="shrink-0 text-content-tertiary" aria-hidden="true" /></Link>;
}

function SummaryMetric({ label, loadingLabel, value }: { label: string; loadingLabel: string; value: string | null }) {
  return <div className="col-span-2 px-2 py-4 sm:col-span-1"><p className="text-xs text-content-secondary">{label}</p><SummaryValue className="mt-1 justify-center" label={loadingLabel} value={value} /></div>;
}

function SummaryValue({ className, label, value }: { className?: string; label: string; value: string | null }) {
  return <span className={`flex min-h-6 items-center font-bold ${className ?? ""}`}>{value ?? <span className="inline-flex" role="status" aria-label={label}><LoadingSpinner className="size-4" /></span>}</span>;
}
