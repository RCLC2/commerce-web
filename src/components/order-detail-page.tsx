"use client";

import { PageHeading } from "./ui/page-heading";
import { ReceiptText as PageIcon } from "lucide-react";

import { ButtonLink } from "@/components/ui/button-link";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { getEffectiveToken } from "@/lib/auth-token";
import { canWriteOrderLineReview, reviewedOrderLineItemIDs } from "@/lib/product-engagement";
import { queryKeys } from "@/lib/query-keys";
import { useSessionStore } from "@/lib/session-store";
import type { OrderLineItemResponse, TrackingInfo } from "@/lib/types";
import { orderStatusLabel as statusLabel } from "@/lib/order-utils";
import { paymentMethodLabel } from "@/lib/display-labels";
import { apiErrorMessage } from "@/lib/api-client";
import { ApiErrorState } from "./api-error-state";
import { formatPrice } from "@/lib/utils";
import { ReviewWritePanel } from "./review-write-panel";
import { SafeImage } from "./safe-image";
import { Button } from "./ui/button";

const statusSteps = ["PAYMENT_PENDING", "PAID", "PLACED", "SHIPPED", "DELIVERED", "COMPLETED"];

export function OrderDetailPage({ orderCode }: { orderCode: string }) {
  const token = useSessionStore((state) => state.accessToken);
  const memberID = useSessionStore((state) => state.memberID);
  const effectiveToken = getEffectiveToken(token) ?? "";
  const queryClient = useQueryClient();
  const [trackingInfo, setTrackingInfo] = useState<TrackingInfo | null>(null);
  const [reviewingLineItemID, setReviewingLineItemID] = useState<number | null>(null);
  const [submittedLineItemIDs, setSubmittedLineItemIDs] = useState<Set<number>>(() => new Set());

  const { data: order, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.order(orderCode, memberID),
    queryFn: () => api.getOrder(effectiveToken, orderCode),
    enabled: Boolean(effectiveToken),
  });
  const myReviews = useQuery({
    queryKey: queryKeys.myReviews(memberID),
    queryFn: () => api.listMyReviews(effectiveToken),
    enabled: Boolean(effectiveToken),
    refetchOnMount: "always",
  });
  const reviewedLineItemIDs = reviewedOrderLineItemIDs(myReviews.data);
  const productIDs = [...new Set(order?.market_orders?.flatMap((marketOrder) =>
    marketOrder.line_items.map((item) => item.product_id)) ?? [])];
  const productQueries = useQueries({
    queries: productIDs.map((id) => ({
      queryKey: queryKeys.product(id),
      queryFn: () => api.getProduct(id),
      staleTime: 5 * 60 * 1000,
    })),
  });
  const productByID = new Map(productQueries.flatMap((query, index) =>
    query.data ? [[productIDs[index], query.data] as const] : []));

  const confirmPurchase = useMutation({
    mutationFn: (itemID: number) => api.confirmPurchase(effectiveToken, orderCode, itemID),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.order(orderCode, memberID), updated);
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders(memberID) });
    },
  });
  const trackDelivery = useMutation({
    mutationFn: () => {
      if (!order?.delivery?.id) {
        throw new Error("배송 정보가 없습니다.");
      }
      return api.trackDelivery(effectiveToken, orderCode, order.delivery.id);
    },
    onSuccess: setTrackingInfo,
  });

  if (!token) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-bold">로그인이 필요합니다</h1>
        <ButtonLink href="/login" className="mt-5">로그인</ButtonLink>
      </main>
    );
  }

  if (isLoading) {
    return <main className="mx-auto max-w-4xl px-4 py-8 text-sm text-content-secondary">주문 정보를 불러오는 중입니다.</main>;
  }

  if (error || !order) {
    return <main className="mx-auto max-w-4xl px-4 py-8 text-sm text-action-primary"><ApiErrorState error={error ?? new Error("주문 정보를 찾을 수 없습니다.")} onRetry={() => void refetch()} /></main>;
  }

  const amount = order.total_order_price - order.total_discount_price - order.used_point;
  const deliveryStatus = order.delivery?.status ?? order.status;

  return (
    <main className="mx-auto max-w-4xl px-4 pb-24 pt-8">
      <div className="rounded-surface border border-border-subtle bg-surface-raised p-5 shadow-card">
        <PageHeading icon={<PageIcon />} title="주문 상세" description={`주문 번호 ${order.order_code}`} />
        <p className="mt-1 text-sm text-content-secondary">{order.ordered_at ? new Date(order.ordered_at).toLocaleString("ko-KR") : "-"}</p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <InfoBox label="상태" value={statusLabel(order.status)} />
          <InfoBox label="결제" value={paymentMethodLabel(order.payment_method)} />
          <InfoBox label="결제 금액" value={formatPrice(amount)} />
        </div>
        <OrderProgress status={order.status} />
      </div>

      <section className="mt-6 rounded-surface border border-border-subtle bg-surface-raised p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">배송 정보</h2>
            <p className="mt-1 text-sm text-content-secondary">{statusLabel(deliveryStatus)}</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled={!order.delivery?.id || trackDelivery.isPending || !order.delivery?.tracking_number}
            onClick={() => trackDelivery.mutate()}
          >
            {trackDelivery.isPending ? "배송 조회 중" : "배송 조회"}
          </Button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <InfoBox label="택배사" value={order.delivery?.carrier || "-"} />
          <InfoBox label="운송장 번호" value={order.delivery?.tracking_number || "-"} />
          <InfoBox label="배송 상태" value={statusLabel(order.delivery?.status ?? order.status)} />
        </div>
        {trackingInfo ? (
          <div className="mt-4 rounded-control border border-border-subtle bg-surface-raised p-3 text-sm">
            <p className="font-bold">{statusLabel(trackingInfo.Status ?? trackingInfo.status ?? "배송 조회 결과")}</p>
            <p className="mt-1 text-content-secondary">{trackingInfo.Location ?? trackingInfo.location ?? "위치 정보 없음"}</p>
            <p className="mt-1 text-content-secondary">{trackingInfo.Description ?? trackingInfo.description ?? ""}</p>
          </div>
        ) : null}
        {trackDelivery.error ? <p className="mt-3 text-sm font-bold text-status-negative">{apiErrorMessage(trackDelivery.error)}</p> : null}
      </section>

      <section className="mt-6 rounded-md border border-border-subtle bg-surface-raised p-5">
        <h2 className="text-lg font-bold">배송지</h2>
        {order.delivery?.receiver_name || order.delivery?.receiver_phone || order.delivery?.address ? (
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <InfoBox label="받는 분" value={order.delivery.receiver_name || "-"} />
            <InfoBox label="연락처" value={order.delivery.receiver_phone || "-"} />
            <div className="sm:col-span-2"><InfoBox label="주소" value={order.delivery.address || "-"} /></div>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-content-secondary">주문에 저장된 배송지를 확인하지 못했습니다.</p>
        )}
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="text-lg font-bold">주문 상품</h2>
        {myReviews.isFetching ? <p className="text-xs text-content-secondary">리뷰 작성 여부를 확인하는 중입니다.</p> : null}
        {myReviews.error ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-status-negative-border bg-status-negative-subtle p-3 text-xs font-bold text-status-negative" role="alert">
            <p>리뷰 작성 여부를 확인하지 못해 중복 작성을 막기 위해 작성 버튼을 숨겼습니다.</p>
            <Button size="sm" variant="secondary" onClick={() => void myReviews.refetch()}>다시 확인</Button>
          </div>
        ) : null}
        {order.market_orders?.map((marketOrder) => (
          <div key={marketOrder.id} className="rounded-surface border border-border-subtle bg-surface-raised p-4 shadow-card">
            <div className="flex justify-between text-sm">
              <span className="font-bold">마켓 #{marketOrder.market_id}</span>
              <span className="text-content-secondary">{statusLabel(marketOrder.status)}</span>
            </div>
            <div className="mt-4 space-y-4">
              {marketOrder.line_items.map((item) => {
                const product = item.product ?? productByID.get(item.product_id);
                const completed = item.status === "COMPLETED" || Boolean(item.purchase_confirmed_at);
                const serverReviewed = reviewedLineItemIDs.has(item.id);
                const reviewEligible = canWriteOrderLineReview({
                  reviewable: item.reviewable,
                  reviewStatusLoaded: myReviews.isSuccess,
                  serverReviewed,
                  submitted: submittedLineItemIDs.has(item.id),
                });
                const isReviewing = reviewingLineItemID === item.id;
                const canToggleReview = reviewEligible && (!myReviews.isFetching || isReviewing);

                return (
                  <div key={item.id} className="border-t border-border-subtle pt-4 first:border-t-0 first:pt-0">
                    <div className="flex gap-3 text-sm">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-surface-subtle">
                        <SafeImage src={product?.image_url} alt="" fill sizes="80px" className="object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between gap-3">
                          <Link href={`/products/${item.product_id}`} className="font-bold hover:underline">
                            {product?.name ?? `상품 ${item.product_id}`}
                          </Link>
                          <p className="shrink-0 whitespace-nowrap font-bold tabular-nums">{formatPrice(item.price * item.quantity)}</p>
                        </div>
                        <p className="mt-1 text-content-secondary">
                          옵션 #{item.option_id} / {item.quantity} 개 / {statusLabel(item.status)}
                        </p>
                        <OrderItemActions
                          item={item}
                          busy={confirmPurchase.isPending}
                          completed={completed}
                          reviewSubmitted={serverReviewed || submittedLineItemIDs.has(item.id)}
                          canWriteReview={canToggleReview}
                          reviewOpen={isReviewing}
                          onConfirm={() => confirmPurchase.mutate(item.id)}
                          onToggleReview={() => setReviewingLineItemID(isReviewing ? null : item.id)}
                        />
                      </div>
                    </div>
                    {reviewEligible && isReviewing ? (
                      <ReviewWritePanel
                        token={effectiveToken}
                        memberID={memberID}
                        orderCode={order.order_code}
                        lineItemID={item.id}
                        productID={item.product_id}
                        onSubmitted={() => {
                          setSubmittedLineItemIDs((current) => new Set(current).add(item.id));
                          setReviewingLineItemID(null);
                          void queryClient.invalidateQueries({ queryKey: queryKeys.myReviews(memberID) });
                        }}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <section className="mt-6 rounded-surface border border-border-subtle bg-surface-raised p-5 shadow-card">
        <h2 className="text-lg font-bold">결제</h2>
        <div className="mt-4 space-y-2 text-sm">
          <PriceRow label="상품 금액" value={order.total_order_price} />
          <PriceRow label="할인 금액" value={-order.total_discount_price} />
          <PriceRow label="사용 포인트" value={-order.used_point} />
          <div className="border-t border-border-subtle pt-3">
            <PriceRow label="최종 결제 금액" value={amount} strong />
          </div>
        </div>
      </section>

      {confirmPurchase.error ? <p className="mt-4 text-sm font-bold text-status-negative">{apiErrorMessage(confirmPurchase.error)}</p> : null}
    </main>
  );
}

function OrderProgress({ status }: { status: string }) {
  if (!statusSteps.includes(status) && status !== "SHIPPING") {
    return (
      <div className="mt-5 rounded-md bg-status-negative-subtle px-3 py-2 text-xs font-bold text-action-primary">
        {statusLabel(status)}
      </div>
    );
  }
  const activeIndex = statusSteps.indexOf(status === "SHIPPING" ? "SHIPPED" : status);
  return (
    <div className="mt-5 grid gap-2 md:grid-cols-6">
      {statusSteps.map((step, index) => (
        <div key={step} className={`rounded-md px-3 py-2 text-xs font-bold ${index <= activeIndex ? "bg-content-primary text-content-inverse" : "bg-surface-subtle text-content-secondary"}`}>
          {statusLabel(step)}
        </div>
      ))}
    </div>
  );
}

function OrderItemActions({
  item,
  busy,
  completed,
  reviewSubmitted,
  canWriteReview,
  reviewOpen,
  onConfirm,
  onToggleReview,
}: {
  item: OrderLineItemResponse;
  busy: boolean;
  completed: boolean;
  reviewSubmitted: boolean;
  canWriteReview: boolean;
  reviewOpen: boolean;
  onConfirm: () => void;
  onToggleReview: () => void;
}) {
  const delivered = item.status === "DELIVERED";

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {delivered ? (
        <Button size="sm" disabled={busy} onClick={onConfirm}>
          구매 확정
        </Button>
      ) : null}
      {reviewSubmitted ? <span className="rounded-md bg-surface-subtle px-2 py-1 text-xs font-bold text-content-secondary">리뷰 작성 완료</span> : null}
      {canWriteReview ? (
        <Button size="sm" variant="secondary" disabled={busy} onClick={onToggleReview}>
          {reviewOpen ? "리뷰 닫기" : "리뷰 작성"}
        </Button>
      ) : null}
      {completed ? <span className="rounded-md bg-surface-subtle px-2 py-1 text-xs font-bold text-content-secondary">구매 확정</span> : null}
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-control border border-border-subtle bg-surface-raised p-3">
      <p className="text-xs text-content-secondary">{label}</p>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  );
}

function PriceRow({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "text-base font-bold" : ""}`}>
      <span>{label}</span>
      <strong>{formatPrice(value)}</strong>
    </div>
  );
}
