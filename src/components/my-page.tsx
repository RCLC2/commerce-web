"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, MapPin, Ticket, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getEffectiveToken, isMockingEnabled } from "@/lib/auth-token";
import { firstOrderItem, orderStatusLabel } from "@/lib/order-utils";
import { queryKeys } from "@/lib/query-keys";
import { useSessionStore } from "@/lib/session-store";
import { formatPrice } from "@/lib/utils";
import { Button } from "./ui/button";
import { SafeImage } from "./safe-image";

export function MyPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useSessionStore((state) => state.accessToken);
  const logout = useSessionStore((state) => state.logout);
  const effectiveToken = getEffectiveToken(token) ?? "";
  const { data: profile } = useQuery({
    queryKey: queryKeys.me(effectiveToken),
    queryFn: () => api.me(effectiveToken),
    enabled: Boolean(effectiveToken),
  });
  const { data: orders = [] } = useQuery({
    queryKey: queryKeys.orders(effectiveToken),
    queryFn: () => api.listOrders(effectiveToken),
    enabled: Boolean(effectiveToken),
  });
  const { data: myCoupons = [] } = useQuery({
    queryKey: queryKeys.coupons(effectiveToken),
    queryFn: () => api.listCoupons(effectiveToken),
    enabled: Boolean(effectiveToken),
  });
  const { data: issuableCoupons = [] } = useQuery({
    queryKey: queryKeys.issuableCoupons(effectiveToken),
    queryFn: () => api.listIssuableCoupons(effectiveToken),
    enabled: Boolean(effectiveToken),
  });
  const { data: addresses = [] } = useQuery({
    queryKey: queryKeys.addresses(effectiveToken),
    queryFn: () => api.listAddresses(effectiveToken),
    enabled: Boolean(effectiveToken),
  });
  const issueCoupon = useMutation({
    mutationFn: (couponID: number) => api.issueCoupon(effectiveToken, couponID),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.coupons(effectiveToken) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.issuableCoupons(effectiveToken) });
    },
  });

  if (!token && !isMockingEnabled()) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-black">마이페이지</h1>
        <p className="mt-2 text-sm text-muted">내 정보와 주문 내역을 보려면 로그인해주세요.</p>
        <Link href="/login">
          <Button className="mt-5">로그인하기</Button>
        </Link>
      </main>
    );
  }

  const defaultAddress = addresses.find((address) => address.is_default) ?? addresses[0];

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">마이페이지</h1>
          <p className="mt-1 text-sm text-muted">{profile?.email ?? "customer@commerce.test"}</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            logout();
            router.push("/login");
          }}
        >
          로그아웃
        </Button>
      </div>

      <section className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-md border border-line bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-muted"><Ticket size={16} /> 발급 가능 쿠폰</div>
          <p className="mt-2 text-2xl font-black">{issuableCoupons.length}장</p>
        </div>
        <div className="rounded-md border border-line bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-muted"><Wallet size={16} /> 내 포인트</div>
          <p className="mt-2 text-2xl font-black">{formatPrice(profile?.point_balance ?? 0)}</p>
        </div>
        <div className="rounded-md border border-line bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-muted"><Ticket size={16} /> 보유 쿠폰</div>
          <p className="mt-2 text-2xl font-black">{myCoupons.length}장</p>
        </div>
      </section>

      <section className="mt-4 rounded-md border border-line bg-white p-4">
        <details>
          <summary className="flex cursor-pointer list-none items-center justify-between font-black">
            쿠폰 관리
            <ChevronRight size={18} />
          </summary>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <h2 className="text-sm font-black">발급 가능한 쿠폰</h2>
              <div className="mt-3 space-y-2">
                {issuableCoupons.map((coupon) => (
                  <div key={coupon.id} className="rounded-md bg-zinc-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold">{coupon.name}</p>
                        <p className="mt-1 text-xs text-muted">{coupon.condition_text}</p>
                      </div>
                      <Button size="sm" disabled={issueCoupon.isPending} onClick={() => issueCoupon.mutate(coupon.id)}>
                        발급
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-sm font-black">내 쿠폰</h2>
              <div className="mt-3 space-y-2">
                {myCoupons.map((coupon) => (
                  <div key={coupon.id} className="rounded-md bg-zinc-50 p-3">
                    <p className="font-bold">{coupon.name}</p>
                    <p className="mt-1 text-xs text-muted">{coupon.condition_text ?? `${formatPrice(coupon.min_order_amount)} 이상 사용`}</p>
                    <p className="mt-1 text-xs text-muted">만료 {coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString("ko-KR") : "-"}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </details>
      </section>

      <section className="mt-4 rounded-md border border-line bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-black">배송지 정보</h2>
          <Link href="/mypage/profile" className="text-sm font-bold text-muted">관리</Link>
        </div>
        {defaultAddress ? (
          <div className="mt-3 flex gap-3 text-sm">
            <MapPin size={18} className="mt-0.5 shrink-0 text-brand" />
            <div>
              <p className="font-bold">{defaultAddress.receiver} · {defaultAddress.phone}</p>
              <p className="mt-1 text-muted">({defaultAddress.zip_code}) {defaultAddress.line1} {defaultAddress.line2}</p>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">등록된 배송지가 없습니다.</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-black">주문 내역</h2>
        <div className="mt-3 space-y-3">
          {orders.map((order) => {
            const item = firstOrderItem(order);
            return (
              <Link key={order.id} href={`/orders/${order.order_code}`} className="block rounded-md border border-line bg-white p-4 hover:bg-zinc-50">
                <div className="flex gap-3">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-zinc-100">
                    <SafeImage src={item?.product?.image_url} alt="" fill sizes="80px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-3">
                      <p className="font-black">{orderStatusLabel(order.status)}</p>
                      <p className="font-black">{formatPrice(order.total_order_price - order.total_discount_price - order.used_point)}</p>
                    </div>
                    <p className="mt-1 truncate text-sm font-bold">{item?.product?.name ?? "주문 상품"}</p>
                    <p className="mt-1 text-xs text-muted">{order.ordered_at ? new Date(order.ordered_at).toLocaleDateString("ko-KR") : "-"} · {order.order_code}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
