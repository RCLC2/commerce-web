"use client";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Heart, MapPin, MessageSquareText, Settings2, ShoppingBag, Ticket, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-client";
import { getEffectiveToken } from "@/lib/auth-token";
import { firstOrderItem, orderStatusLabel } from "@/lib/order-utils";
import { queryKeys } from "@/lib/query-keys";
import { useSessionStore } from "@/lib/session-store";
import { formatPrice } from "@/lib/utils";
import { SafeImage } from "./safe-image";
import { Button } from "./ui/button";

export function MyPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useSessionStore((state) => state.accessToken);
  const logout = useSessionStore((state) => state.logout);
  const effectiveToken = getEffectiveToken(token) ?? "";
  const [orderStatus, setOrderStatus] = useState("ALL");
  const [orderQuery, setOrderQuery] = useState("");
  const [orderPeriod, setOrderPeriod] = useState("ALL");
  const profileQuery = useQuery({ queryKey: queryKeys.me(effectiveToken), queryFn: () => api.me(effectiveToken), enabled: Boolean(effectiveToken) });
  const ordersQuery = useQuery({
    queryKey: queryKeys.orders(effectiveToken),
    queryFn: () => api.listAllOrders(effectiveToken),
    enabled: Boolean(effectiveToken),
  });
  const myCouponsQuery = useQuery({ queryKey: queryKeys.coupons(effectiveToken), queryFn: () => api.listCoupons(effectiveToken), enabled: Boolean(effectiveToken) });
  const issuableCouponsQuery = useQuery({ queryKey: queryKeys.issuableCoupons(effectiveToken), queryFn: () => api.listIssuableCoupons(effectiveToken), enabled: Boolean(effectiveToken) });
  const addressesQuery = useQuery({ queryKey: queryKeys.addresses(effectiveToken), queryFn: () => api.listAddresses(effectiveToken), enabled: Boolean(effectiveToken) });
  const profile = profileQuery.data;
  const orders = ordersQuery.data ?? [];
  const myCoupons = myCouponsQuery.data ?? [];
  const issuableCoupons = issuableCouponsQuery.data ?? [];
  const addresses = addressesQuery.data ?? [];
  const issueCoupon = useMutation({
    mutationFn: (couponID: number) => api.issueCoupon(effectiveToken, couponID),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.coupons(effectiveToken) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.issuableCoupons(effectiveToken) });
    },
  });
  const orderProductIDs = [...new Set(orders.flatMap((order) =>
    order.market_orders?.flatMap((marketOrder) => marketOrder.line_items.map((item) => item.product_id)) ?? []))];
  const orderProducts = useQueries({
    queries: orderProductIDs.map((id) => ({
      queryKey: queryKeys.product(id),
      queryFn: () => api.getProduct(id),
      staleTime: 5 * 60 * 1000,
    })),
  });
  const productByID = new Map(orderProducts.flatMap((query, index) =>
    query.data ? [[orderProductIDs[index], query.data] as const] : []));

  const defaultAddress = addresses.find((address) => address.is_default) ?? addresses[0];
  const hasOrderTimestamps = orders.length > 0 && orders.every((order) => Boolean(order.ordered_at));
  const filteredOrders = (() => {
    const query = orderQuery.trim().toLowerCase();
    const cutoff = hasOrderTimestamps ? orderPeriodCutoff(orderPeriod) : null;
    return orders.filter((order) => {
      const item = firstOrderItem(order);
      const product = item ? item.product ?? productByID.get(item.product_id) : undefined;
      const matchesQuery = !query || order.order_code.toLowerCase().includes(query) || product?.name.toLowerCase().includes(query) || String(item?.product_id ?? "").includes(query);
      const orderedAt = order.ordered_at ? new Date(order.ordered_at) : null;
      const matchesStatus = orderStatus === "ALL" || order.status === orderStatus;
      return matchesQuery && matchesStatus && (!cutoff || (orderedAt !== null && orderedAt >= cutoff));
    });
  })();
  const orderSummary = [
    { label: "전체 주문", value: orders.length },
    { label: "배송 중", value: orders.filter((order) => order.status === "SHIPPED" || order.status === "DELIVERED" || order.market_orders?.some((marketOrder) => ["SHIPPED", "DELIVERED"].includes(marketOrder.status))).length },
    { label: "구매 확정", value: orders.filter((order) => order.status === "COMPLETED" || order.market_orders?.some((marketOrder) => marketOrder.line_items.some((item) => item.status === "COMPLETED"))).length },
  ];

  if (!token) {
    return <main className="mx-auto max-w-3xl px-4 py-16"><h1 className="text-2xl font-black">마이페이지</h1><p className="mt-2 text-sm text-muted">로그인하고 주문과 혜택을 확인하세요.</p><Link href="/login"><Button className="mt-5">로그인하기</Button></Link></main>;
  }
  const queryError = profileQuery.error ?? ordersQuery.error ?? myCouponsQuery.error ?? issuableCouponsQuery.error ?? addressesQuery.error;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-28 pt-7">
      <section className="overflow-hidden rounded-3xl bg-zinc-950 p-6 text-white shadow-xl md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand text-xl font-black">{(profile?.email ?? "M").slice(0, 1).toUpperCase()}</span>
            <div className="min-w-0"><p className="text-sm font-bold text-white/60">반가워요</p><h1 className="mt-1 truncate text-2xl font-black">{profile?.email?.split("@")[0] || "회원"}님</h1><p className="mt-1 truncate text-xs text-white/55">{profile?.email ?? "회원 정보를 불러오는 중입니다"}</p></div>
          </div>
          <Button className="border-white/20 bg-white/10 text-white hover:bg-white/20" variant="secondary" size="sm" onClick={() => { logout(); router.push("/login"); }}>로그아웃</Button>
        </div>
        <div className="mt-7 grid grid-cols-3 divide-x divide-white/15 rounded-2xl bg-white/10 px-2 py-4 text-center">
          <div><p className="text-xs text-white/55">포인트</p><p className="mt-1 font-black">{profileQuery.error ? "-" : formatPrice(profile?.point_balance ?? 0)}</p></div>
          <div><p className="text-xs text-white/55">보유 쿠폰</p><p className="mt-1 font-black">{myCouponsQuery.error ? "-" : `${myCoupons.length}장`}</p></div>
          <div><p className="text-xs text-white/55">주문</p><p className="mt-1 font-black">{ordersQuery.error ? "-" : `${orders.length}건`}</p></div>
        </div>
      </section>
      <section className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <MyShortcut href="/cart" icon={<ShoppingBag size={19} />} label="장바구니" description="담아둔 상품 보기" />
          <MyShortcut href="/likes" icon={<Heart size={19} />} label="좋아요" description="관심 상품 모아보기" />
          <MyShortcut href="/mypage/profile" icon={<Settings2 size={19} />} label="회원정보" description="프로필·배송지 관리" />
          <MyShortcut href="/mypage/reviews" icon={<MessageSquareText size={19} />} label="리뷰 관리" description="작성한 리뷰 확인" />
      </section>
      {queryError ? <div className="mt-5 rounded-xl border border-brand/30 bg-red-50 p-4 text-sm"><p className="font-bold text-brand">{apiErrorMessage(queryError)}</p><Button className="mt-3" size="sm" variant="secondary" onClick={() => { void profileQuery.refetch(); void ordersQuery.refetch(); void myCouponsQuery.refetch(); void issuableCouponsQuery.refetch(); void addressesQuery.refetch(); }}>다시 시도</Button></div> : null}
      <section className="mt-6 grid gap-3 md:grid-cols-3"><Metric icon={<Ticket size={16} />} label="발급 가능한 쿠폰" value={issuableCouponsQuery.error ? "-" : `${issuableCoupons.length}장`} /><Metric icon={<Wallet size={16} />} label="사용 가능한 포인트" value={profileQuery.error ? "-" : formatPrice(profile?.point_balance ?? 0)} /><Metric icon={<Ticket size={16} />} label="보유 쿠폰" value={myCouponsQuery.error ? "-" : `${myCoupons.length}장`} /></section>
      <section className="mt-4 rounded-md border border-line bg-white p-4">
        <details>
          <summary className="flex cursor-pointer list-none items-center justify-between font-black">
            쿠폰 지갑<ChevronRight size={18} />
          </summary>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <h2 className="text-sm font-black">받을 수 있는 쿠폰</h2>
              <div className="mt-3 space-y-2">
                {issuableCouponsQuery.error ? (
                  <p className="text-sm font-bold text-brand">발급 가능한 쿠폰을 불러오지 못했습니다.</p>
                ) : issuableCoupons.map((coupon) => (
                  <div key={coupon.id} className="rounded-md bg-zinc-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="font-bold">{coupon.name}</p><p className="mt-1 text-xs text-muted">{coupon.condition_text}</p></div>
                      <Button size="sm" disabled={issueCoupon.isPending} onClick={() => issueCoupon.mutate(coupon.id)}>쿠폰 받기</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-sm font-black">보유 쿠폰</h2>
              <div className="mt-3 space-y-2">
                {myCouponsQuery.error ? (
                  <p className="text-sm font-bold text-brand">보유 쿠폰을 불러오지 못했습니다.</p>
                ) : myCoupons.map((owned) => (
                  <div key={owned.id} className="rounded-md bg-zinc-50 p-3">
                    <p className="font-bold">{owned.coupon.name}</p>
                    <p className="mt-1 text-xs text-muted">{owned.coupon.condition_text ?? `${formatPrice(owned.coupon.min_order_amount)} 이상 구매 시`}</p>
                    <p className="mt-1 text-xs text-muted">{new Date(owned.expires_at).toLocaleDateString("ko-KR")}까지 · {owned.status}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </details>
      </section>
      <section className="mt-4 rounded-2xl border border-line bg-white p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="font-black">리뷰 관리</h2><p className="mt-1 text-sm text-muted">내가 작성한 상품 리뷰를 확인하세요.</p></div><Link href="/mypage/reviews" className="text-sm font-bold text-brand">관리하기</Link></div></section>
      <section className="mt-4 rounded-2xl border border-line bg-white p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-black">기본 배송지</h2><Link href="/mypage/profile" className="text-sm font-bold text-brand">관리하기</Link></div>{addressesQuery.error ? <p className="mt-3 text-sm font-bold text-brand">배송지를 불러오지 못했습니다.</p> : defaultAddress ? <div className="mt-3 flex gap-3 text-sm"><MapPin size={18} className="mt-0.5 shrink-0 text-brand" /><div><p className="font-bold">{defaultAddress.receiver} / {defaultAddress.phone}</p><p className="mt-1 text-muted">({defaultAddress.zip_code}) {defaultAddress.line1} {defaultAddress.line2}</p></div></div> : <p className="mt-3 text-sm text-muted">등록된 배송지가 없습니다.</p>}</section>
      <section className="mt-8"><div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><h2 className="text-xl font-black">주문 내역</h2><p className="mt-1 text-sm text-muted">주문 상태와 주문번호·상품명으로 찾아보세요. 기간 필터는 서버가 주문 시각을 제공할 때 사용할 수 있습니다.</p></div><div className="grid gap-2 md:grid-cols-[180px_140px_140px]"><input className="h-10 rounded-md border border-line px-3 text-sm outline-none" value={orderQuery} onChange={(event) => setOrderQuery(event.target.value)} placeholder="주문번호 또는 상품명" aria-label="주문 검색" /><select className="h-10 rounded-md border border-line bg-white px-3 text-sm font-bold" value={orderStatus} onChange={(event) => setOrderStatus(event.target.value)} aria-label="주문 상태"><option value="ALL">전체 상태</option><option value="PAYMENT_PENDING">결제 대기</option><option value="PAID">결제 완료</option><option value="PLACED">주문 접수</option><option value="SHIPPED">배송 중</option><option value="DELIVERED">배송 완료</option><option value="COMPLETED">구매 확정</option><option value="CANCELLED">취소</option></select><select className="h-10 rounded-md border border-line bg-white px-3 text-sm font-bold disabled:bg-zinc-100 disabled:text-muted" value={orderPeriod} disabled={!hasOrderTimestamps} onChange={(event) => setOrderPeriod(event.target.value)} aria-label="주문 기간"><option value="ALL">{hasOrderTimestamps ? "전체 기간" : "기간 선택 불가"}</option><option value="30D">최근 30일</option><option value="90D">최근 90일</option><option value="365D">최근 1년</option></select></div></div>{orders.length > 0 && !hasOrderTimestamps ? <p className="mt-3 rounded-md bg-amber-50 p-3 text-xs font-bold text-amber-800">주문 API가 주문 시각을 제공하지 않아 기간 필터를 사용할 수 없습니다.</p> : null}<div className="mt-4 grid gap-3 md:grid-cols-3">{orderSummary.map((item) => <div key={item.label} className="rounded-md border border-line bg-white p-3"><p className="text-xs font-bold text-muted">{item.label}</p><p className="mt-1 text-xl font-black">{ordersQuery.error ? "-" : item.value}</p></div>)}</div><div className="mt-3 space-y-3">{ordersQuery.error ? <div className="rounded-md border border-brand/30 bg-red-50 p-8 text-center text-sm font-bold text-brand">주문 내역을 불러오지 못했습니다.</div> : filteredOrders.length ? filteredOrders.map((order) => { const item = firstOrderItem(order); const product = item ? item.product ?? productByID.get(item.product_id) : undefined; return <Link key={order.id} href={`/orders/${order.order_code}`} className="block rounded-md border border-line bg-white p-4 hover:bg-zinc-50"><div className="flex gap-3"><div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-zinc-100"><SafeImage src={product?.image_url} alt="" fill sizes="80px" className="object-cover" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-black">{orderStatusLabel(order.status)}</p><p className="mt-1 truncate text-sm font-bold">{product?.name ?? `상품 #${item?.product_id ?? "-"}`}</p></div><p className="font-black">{formatPrice(order.total_order_price - order.total_discount_price - order.used_point)}</p></div><p className="mt-1 text-xs text-muted">{order.ordered_at ? new Date(order.ordered_at).toLocaleDateString("ko-KR") : "-"} / {order.order_code}</p><p className="mt-1 text-xs text-muted">마켓 {order.market_orders?.length ?? 0}곳 · 상품 {order.market_orders?.flatMap((marketOrder) => marketOrder.line_items).length ?? 0}개</p></div></div></Link>; }) : <div className="rounded-md border border-line bg-white p-8 text-center text-sm font-bold text-muted">조건에 맞는 주문이 없습니다.</div>}</div></section>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl border border-line bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-sm font-bold text-muted"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-brand">{icon}</span>{label}</div><p className="mt-3 text-2xl font-black">{value}</p></div>;
}

function orderPeriodCutoff(period: string) {
  if (period === "ALL") return null;
  const days = period === "30D" ? 30 : period === "90D" ? 90 : 365;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff;
}

function MyShortcut({ href, icon, label, description }: { href: string; icon: React.ReactNode; label: string; description: string }) {
  return <Link href={href} className="group rounded-2xl border border-line bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand/30"><div className="flex items-center gap-2 text-sm font-black"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-brand transition group-hover:bg-brand group-hover:text-white">{icon}</span><span>{label}</span></div><p className="mt-2 text-xs text-muted">{description}</p></Link>;
}
