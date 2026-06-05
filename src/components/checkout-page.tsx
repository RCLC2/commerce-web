"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useSessionStore } from "@/lib/session-store";
import { formatPrice } from "@/lib/utils";
import { Button } from "./ui/button";

export function CheckoutPage() {
  const router = useRouter();
  const token = useSessionStore((state) => state.accessToken);
  const effectiveToken = token ?? (process.env.NEXT_PUBLIC_API_MOCKING === "enabled" ? "mock-access-token" : "");
  const [usedPoint, setUsedPoint] = useState(1000);
  const [couponID, setCouponID] = useState<number | undefined>(501);
  const [address, setAddress] = useState({
    receiver: "김커머스",
    phone: "010-1234-5678",
    line1: "서울특별시 강남구 테헤란로 1",
    line2: "101동 1001호",
  });

  const { data: items = [] } = useQuery({
    queryKey: ["cart", effectiveToken],
    queryFn: () => api.listCart(effectiveToken),
    enabled: Boolean(effectiveToken),
  });
  const { data: coupons = [] } = useQuery({
    queryKey: ["coupons", effectiveToken],
    queryFn: () => api.listCoupons(effectiveToken),
    enabled: Boolean(effectiveToken),
  });
  const { data: profile } = useQuery({
    queryKey: ["checkout-me", effectiveToken],
    queryFn: () => api.me(effectiveToken),
    enabled: Boolean(effectiveToken),
  });

  const selectedCoupon = coupons.find((coupon) => coupon.id === couponID);
  const productTotal = items.reduce((sum, item) => sum + item.price_at_added * item.quantity, 0);
  const discount = selectedCoupon && productTotal >= selectedCoupon.min_order_amount ? selectedCoupon.discount_amount : 0;
  const activeCouponID = discount > 0 ? couponID : undefined;
  const availablePoint = profile?.point_balance ?? usedPoint;
  const maxUsablePoint = Math.max(0, productTotal - discount);
  const appliedPoint = Math.min(usedPoint, availablePoint, maxUsablePoint);
  const payableAmount = Math.max(0, productTotal - discount - appliedPoint);

  const placeOrder = useMutation({
    mutationFn: () =>
      api.placeOrder(effectiveToken, {
        cart_item_ids: items.map((item) => item.id),
        used_coupon_id: activeCouponID,
        used_point: appliedPoint,
      }),
  });
  const completePayment = useMutation({
    mutationFn: (orderCode: string) =>
      api.completePayment(effectiveToken, orderCode, {
        payment_method: "CARD",
        payment_key: `mock-${Date.now()}`,
        amount: payableAmount,
      }),
    onSuccess: (_, orderCode) => router.push(`/orders/${orderCode}`),
  });

  const isSubmitting = placeOrder.isPending || completePayment.isPending;
  const submitError = placeOrder.error?.message ?? completePayment.error?.message;
  const canPay = useMemo(() => Boolean(items.length > 0 && address.receiver && address.phone && address.line1), [address, items.length]);

  if (!token && process.env.NEXT_PUBLIC_API_MOCKING !== "enabled") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-black">로그인이 필요합니다</h1>
        <Link href="/login">
          <Button className="mt-5">로그인하기</Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pb-28 pt-8">
      <h1 className="text-2xl font-black">주문서</h1>
      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_340px]">
        <section className="space-y-5">
          <div className="rounded-md border border-line bg-white p-4">
            <h2 className="font-black">배송지</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input className="h-11 rounded-md border border-line px-3 outline-none" value={address.receiver} onChange={(e) => setAddress({ ...address, receiver: e.target.value })} aria-label="받는 사람" />
              <input className="h-11 rounded-md border border-line px-3 outline-none" value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} aria-label="연락처" />
              <input className="h-11 rounded-md border border-line px-3 outline-none md:col-span-2" value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} aria-label="기본 주소" />
              <input className="h-11 rounded-md border border-line px-3 outline-none md:col-span-2" value={address.line2} onChange={(e) => setAddress({ ...address, line2: e.target.value })} aria-label="상세 주소" />
            </div>
          </div>

          <div className="rounded-md border border-line bg-white p-4">
            <h2 className="font-black">주문 상품</h2>
            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between gap-4 text-sm">
                  <div>
                    <p className="font-bold">{item.product?.name ?? `상품 ${item.product_id}`}</p>
                    <p className="mt-1 text-muted">옵션 #{item.option_id} · {item.quantity}개</p>
                  </div>
                  <p className="font-black">{formatPrice(item.price_at_added * item.quantity)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-line bg-white p-4">
            <h2 className="font-black">할인</h2>
            <label className="mt-4 block">
              <span className="text-sm font-bold">쿠폰</span>
              <select className="mt-2 h-11 w-full rounded-md border border-line px-3 outline-none" value={couponID ?? ""} onChange={(e) => setCouponID(Number(e.target.value) || undefined)}>
                <option value="">사용 안 함</option>
                {coupons.map((coupon) => (
                  <option key={coupon.id} value={coupon.id}>
                    {coupon.name} ({formatPrice(coupon.discount_amount)})
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-bold">포인트 사용</span>
              <input
                type="number"
                min={0}
                max={Math.min(availablePoint, maxUsablePoint)}
                className="mt-2 h-11 w-full rounded-md border border-line px-3 outline-none"
                value={usedPoint}
                onChange={(event) => setUsedPoint(Math.max(0, Number(event.target.value)))}
              />
              <span className="mt-1 block text-xs text-muted">
                적용 포인트 {formatPrice(appliedPoint)} · 사용 가능 {formatPrice(availablePoint)}
              </span>
            </label>
          </div>
        </section>

        <aside className="h-fit rounded-md border border-line bg-white p-4">
          <h2 className="font-black">결제 금액</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between"><span>상품 금액</span><strong>{formatPrice(productTotal)}</strong></div>
            <div className="flex justify-between"><span>쿠폰 할인</span><strong>-{formatPrice(discount)}</strong></div>
            <div className="flex justify-between"><span>포인트 사용</span><strong>-{formatPrice(appliedPoint)}</strong></div>
          </div>
          <div className="mt-4 border-t border-line pt-4">
            <div className="flex justify-between">
              <span className="font-bold">최종 결제</span>
              <strong className="text-xl">{formatPrice(payableAmount)}</strong>
            </div>
          </div>
          <Button
            className="mt-5 w-full"
            size="lg"
            disabled={!canPay || isSubmitting}
            onClick={async () => {
              const order = await placeOrder.mutateAsync();
              await completePayment.mutateAsync(order.orderCode);
            }}
          >
            {isSubmitting ? "결제 처리 중" : "결제하기"}
          </Button>
          {submitError ? <p className="mt-3 text-sm font-bold text-brand">{submitError}</p> : null}
        </aside>
      </div>
    </main>
  );
}
