"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { getEffectiveToken } from "@/lib/auth-token";
import { queryKeys } from "@/lib/query-keys";
import { useSessionStore } from "@/lib/session-store";
import { formatPrice } from "@/lib/utils";
import { ReviewWritePanel } from "./review-write-panel";
import { SafeImage } from "./safe-image";
import { Button } from "./ui/button";

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    PLACED: "주문 접수",
    PAYMENT_COMPLETED: "결제 완료",
    READY_TO_SHIP: "배송 준비중",
    SHIPPING: "배송중",
    DELIVERED: "배송 완료",
    COMPLETED: "구매확정",
    ORDERED: "주문 완료",
    REVIEWED: "리뷰 작성 완료",
  };
  return labels[status] ?? status;
}

export function OrderDetailPage({ orderCode }: { orderCode: string }) {
  const token = useSessionStore((state) => state.accessToken);
  const effectiveToken = getEffectiveToken(token);
  const [reviewingLineItemID, setReviewingLineItemID] = useState<number | null>(null);
  const { data: order, isLoading, error } = useQuery({
    queryKey: ["order", orderCode],
    queryFn: () => api.getOrder(effectiveToken ?? "", orderCode),
    enabled: Boolean(effectiveToken),
  });
  const { data: myReviews = [] } = useQuery({
    queryKey: effectiveToken ? queryKeys.myReviews(effectiveToken) : ["my-reviews", "anonymous"],
    queryFn: () => api.listMyReviews(effectiveToken ?? ""),
    enabled: Boolean(effectiveToken),
  });

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

  if (isLoading) {
    return <main className="mx-auto max-w-4xl px-4 py-8 text-sm text-muted">주문을 불러오는 중입니다.</main>;
  }

  if (error || !order) {
    return <main className="mx-auto max-w-4xl px-4 py-8 text-sm text-brand">주문 정보를 불러오지 못했습니다.</main>;
  }

  const amount = order.total_order_price - order.total_discount_price - order.used_point;

  return (
    <main className="mx-auto max-w-4xl px-4 pb-24 pt-8">
      <div className="rounded-md border border-line bg-white p-5">
        <p className="text-sm font-bold text-muted">주문번호</p>
        <h1 className="mt-1 text-2xl font-black">{order.order_code}</h1>
        <p className="mt-1 text-sm text-muted">{order.ordered_at ? new Date(order.ordered_at).toLocaleString("ko-KR") : "-"}</p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <InfoBox label="주문 상태" value={statusLabel(order.status)} />
          <InfoBox label="결제 수단" value={order.payment_method ?? "CARD"} />
          <InfoBox label="결제 금액" value={formatPrice(amount)} />
        </div>
      </div>

      <section className="mt-6 rounded-md border border-line bg-white p-5">
        <h2 className="text-lg font-black">배송지</h2>
        {order.shipping_address ? (
          <div className="mt-3 text-sm leading-7">
            <p className="font-bold">{order.shipping_address.receiver} · {order.shipping_address.phone}</p>
            <p className="text-muted">({order.shipping_address.zip_code}) {order.shipping_address.line1} {order.shipping_address.line2}</p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">배송지 정보가 없습니다.</p>
        )}
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="text-lg font-black">주문 상품</h2>
        {order.market_orders?.map((marketOrder) => (
          <div key={marketOrder.id} className="rounded-md border border-line bg-white p-4">
            <div className="flex justify-between text-sm">
              <span className="font-bold">마켓 #{marketOrder.market_id}</span>
              <span className="text-muted">{statusLabel(marketOrder.status)}</span>
            </div>
            <div className="mt-4 space-y-3">
              {marketOrder.line_items.map((item) => {
                const writtenReview = myReviews.find((review) => review.order_line_item_id === item.id);
                const canWriteReview = item.status === "COMPLETED" && !writtenReview;
                const isReviewing = reviewingLineItemID === item.id;

                return (
                  <div key={item.id} className="border-t border-line pt-3 first:border-t-0 first:pt-0">
                    <div className="flex gap-3 text-sm">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-zinc-100">
                        <SafeImage src={item.product?.image_url} alt="" fill sizes="80px" className="object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between gap-3">
                          <Link href={`/products/${item.product_id}`} className="font-bold hover:underline">
                            {item.product?.name ?? `상품 ${item.product_id}`}
                          </Link>
                          <p className="font-black">{formatPrice(item.price * item.quantity)}</p>
                        </div>
                        <p className="mt-1 text-muted">옵션 #{item.option_id} · {item.quantity}개 · {statusLabel(item.status)}</p>
                        <p className="mt-1 text-xs text-muted">상품 ID {item.product_id} · 라인 ID {item.id}</p>
                        {writtenReview ? (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="rounded bg-zinc-100 px-2 py-1 text-xs font-bold text-muted">리뷰 작성 완료</span>
                            <Link href="/mypage/reviews" className="text-xs font-bold text-foreground underline">
                              내 리뷰 보기
                            </Link>
                          </div>
                        ) : null}
                        {canWriteReview && effectiveToken ? (
                          <div className="mt-3">
                            <Button
                              type="button"
                              size="sm"
                              variant={isReviewing ? "secondary" : "primary"}
                              onClick={() => setReviewingLineItemID(isReviewing ? null : item.id)}
                            >
                              {isReviewing ? "닫기" : "리뷰 작성"}
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    {canWriteReview && isReviewing && effectiveToken ? (
                      <ReviewWritePanel
                        token={effectiveToken}
                        orderCode={order.order_code}
                        lineItemID={item.id}
                        productID={item.product_id}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <section className="mt-6 rounded-md border border-line bg-white p-5">
        <h2 className="text-lg font-black">결제 정보</h2>
        <div className="mt-4 space-y-2 text-sm">
          <PriceRow label="상품 금액" value={order.total_order_price} />
          <PriceRow label="쿠폰 할인" value={-order.total_discount_price} />
          <PriceRow label="포인트 사용" value={-order.used_point} />
          <div className="border-t border-line pt-3">
            <PriceRow label="최종 결제 금액" value={amount} strong />
          </div>
        </div>
      </section>
    </main>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-zinc-50 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-black">{value}</p>
    </div>
  );
}

function PriceRow({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "text-base font-black" : ""}`}>
      <span>{label}</span>
      <strong>{formatPrice(value)}</strong>
    </div>
  );
}
