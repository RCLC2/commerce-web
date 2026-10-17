"use client";

import { PageHeading } from "./ui/page-heading";
import { ReceiptText as PageIcon } from "lucide-react";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { getEffectiveToken } from "@/lib/auth-token";
import { canWriteOrderLineReview, reviewedOrderLineItemIDs } from "@/lib/product-engagement";
import { queryKeys } from "@/lib/query-keys";
import { useSessionStore } from "@/lib/session-store";
import type { OrderLineItemResponse, TrackingInfo } from "@/lib/types";
import { orderStatusLabel as statusLabel, orderPaymentAmount, orderShippingFee } from "@/lib/order-utils";
import { paymentMethodLabel, orderPaymentMethodLabel, deliveryCarrierLabel } from "@/lib/display-labels";
import { apiErrorMessage } from "@/lib/api-client";
import { ApiErrorState } from "./api-error-state";
import { formatPrice } from "@/lib/utils";
import { PageLayout } from "./page-layout";
import { ReviewWritePanel } from "./review-write-panel";
import { SafeImage } from "./safe-image";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Notice } from "./ui/notice";
import { OrderStatus } from "./ui/order-status";
import { OrderCashReceipts } from "./order-cash-receipts";
import { OrderRefundSummary } from "./order-refund-summary";
import { CustomerOrderReturns } from "./customer-order-returns";
import { returnsApi } from "@/lib/returns-api";
import { returnKeys } from "./order-return-shared";
import { OrderSummary } from "./ui/order-summary";
import { Surface } from "./ui/surface";
import { BackButton } from "./ui/back-button";
import { EmptyState, InlineLoadingState, LoadingState, LoginRequiredState } from "./ui/feedback";

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
  const returnRequests = useQuery({
    queryKey: returnKeys.requests(effectiveToken, orderCode),
    queryFn: () => returnsApi.requests(effectiveToken, orderCode),
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

  const marketIDs = [...new Set(order?.market_orders?.map((marketOrder) => marketOrder.market_id) ?? [])];
  const marketQueries = useQueries({
    queries: marketIDs.map((id) => ({queryKey: ["order-market", id], queryFn: () => api.getMarket(id), staleTime: 5 * 60 * 1000})),
  });
  const marketByID = new Map(marketQueries.flatMap((query, index) => query.data ? [[marketIDs[index], query.data] as const] : []));

  const confirmPurchase = useMutation({
    mutationFn: (itemID: number) => api.confirmPurchase(effectiveToken, orderCode, itemID),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.order(orderCode, memberID), updated);
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders(memberID) });
    },
  });
  const trackDelivery = useMutation({
    mutationFn: (deliveryID: number) => {
      if (!deliveryID) {
        throw new Error("배송 정보가 없습니다.");
      }
      return api.trackDelivery(effectiveToken, orderCode, deliveryID);
    },
    onSuccess: setTrackingInfo,
  });

  if (!token) {
    return (
      <PageLayout className="pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <BackButton fallbackHref="/mypage" className="mb-4" />
        <PageHeading icon={<PageIcon />} title="주문 상세" />
        <LoginRequiredState className="mt-6" icon={<PageIcon className="size-7" />} description="주문 상세를 확인하려면 로그인해주세요." loginHref={`/login?next=${encodeURIComponent(`/orders/${orderCode}`)}`} />
      </PageLayout>
    );
  }

  if (isLoading) {
    return <PageLayout><BackButton fallbackHref="/mypage" /><LoadingState className="mt-4" label="주문 정보를 불러오는 중입니다." /></PageLayout>;
  }

  if (error || !order) {
    return <PageLayout className="text-sm text-action-primary"><BackButton fallbackHref="/mypage" /><ApiErrorState className="mt-4" error={error ?? new Error("주문 정보를 찾을 수 없습니다.")} onRetry={() => void refetch()} /></PageLayout>;
  }

  const amount = orderPaymentAmount(order);
  const deliveries = order.deliveries ?? (order.delivery ? [order.delivery] : []);
  const address = deliveries.find((delivery) => delivery.address || delivery.receiver_name);
  const marketOrders = order.market_orders?.filter((marketOrder) => marketOrder.line_items.length > 0) ?? [];

  return (
    <PageLayout className="pb-[calc(8rem+env(safe-area-inset-bottom))]">
      <BackButton fallbackHref="/mypage" className="mb-4" />
      <Surface>
        <PageHeading icon={<PageIcon />} title="주문 상세" description={`주문 번호 ${order.order_code}`} />
        <p className="mt-1 text-sm text-content-secondary">{order.ordered_at ? new Date(order.ordered_at).toLocaleString("ko-KR") : "-"}</p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <InfoBox label="상태" value={statusLabel(order.status)} />
          <InfoBox label="결제 수단" value={orderPaymentMethodLabel(order.payment_method, order.payment_details)} />
          <InfoBox label="최초 결제액" value={formatPrice(amount)} />
        </div>
        {order.payment_details && order.payment_method ? <p className="mt-3 text-xs text-content-secondary">결제 대행: {paymentMethodLabel(order.payment_method)}</p> : null}
        <OrderCashReceipts memberID={memberID ?? undefined} token={effectiveToken} orderCode={orderCode} method={order.payment_details?.method} />
        <OrderProgress status={order.status} />
      </Surface>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0">
        <Surface>
          <h2 className="text-lg font-bold">배송 정보</h2>
          {deliveries.length ? deliveries.map((delivery, index) => (
            <section key={delivery.id} className="mt-4 border-t border-border-subtle pt-4 first:border-0">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold">배송 {index + 1}</p>
                <Button size="sm" variant="secondary" disabled={!delivery.tracking_number || trackDelivery.isPending} onClick={() => trackDelivery.mutate(delivery.id)}>{trackDelivery.isPending && trackDelivery.variables === delivery.id ? "배송 조회 중" : "배송 조회"}</Button>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <InfoBox label="택배사" value={deliveryCarrierLabel(delivery.carrier)} />
                <InfoBox label="운송장 번호" value={delivery.tracking_number || "송장 등록 전"} />
                <InfoBox label="배송 상태" value={statusLabel(delivery.status)} />
              </div>
            </section>
          )) : <p className="mt-3 text-sm text-content-secondary">배송 정보를 준비하고 있습니다.</p>}
          {trackingInfo ? <Notice className="mt-4">{statusLabel(trackingInfo.Status ?? trackingInfo.status ?? "배송 조회 결과")} · {trackingInfo.Location ?? trackingInfo.location ?? "위치 정보 없음"} {trackingInfo.Description ?? trackingInfo.description ?? ""}</Notice> : null}
          {trackDelivery.error ? <Notice className="mt-3" tone="error">{apiErrorMessage(trackDelivery.error)}</Notice> : null}
        </Surface>
        <Surface className="mt-6">
          <h2 className="text-lg font-bold">배송지</h2>
          {address ? <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <InfoBox label="받는 분" value={address.receiver_name || "-"} />
            <InfoBox label="연락처" value={address.receiver_phone || "-"} />
            <div className="sm:col-span-2"><InfoBox label="주소" value={address.address || "-"} /></div>
          </div> : <p className="mt-3 text-sm text-content-secondary">저장된 배송지 정보가 없습니다.</p>}
        </Surface>


        <section className="mt-6 space-y-4">
          <h2 className="text-lg font-bold">주문 상품</h2>
          {myReviews.isFetching ? <InlineLoadingState className="min-h-0 justify-start border-0 bg-transparent px-0 py-0 text-xs" label="리뷰 작성 여부를 확인하는 중입니다." /> : null}
          {myReviews.error ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-status-negative-border bg-status-negative-subtle p-3 text-xs font-bold text-status-negative" role="alert">
              <p>리뷰 작성 여부를 확인하지 못해 중복 작성을 막기 위해 작성 버튼을 숨겼습니다.</p>
              <Button size="sm" variant="secondary" onClick={() => void myReviews.refetch()}>다시 확인</Button>
            </div>
          ) : null}
          {marketOrders.length ? marketOrders.map((marketOrder) => (
            <div key={marketOrder.id} className="rounded-surface border border-border-subtle bg-surface-raised p-4 shadow-card">
              <div className="flex justify-between text-sm">
                <span className="font-bold">{marketByID.get(marketOrder.market_id)?.name ?? (marketQueries[marketIDs.indexOf(marketOrder.market_id)]?.isError ? "마켓 정보 없음" : "마켓 정보 확인 중")}</span>
                <OrderStatus status={marketOrder.status} />
              </div>
              <div className="mt-4 space-y-4">
                {marketOrder.line_items.map((item) => {
                  const product = item.product ?? productByID.get(item.product_id);
                  const option = product?.options?.find((candidate) => candidate.id === item.option_id);
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
                            {option?.option_value ?? "선택 옵션 정보 없음"} / {item.quantity} 개 / {statusLabel(item.status)}
                          </p>
                          <OrderItemActions
                            item={item}
                            busy={confirmPurchase.isPending || !returnRequests.isSuccess || returnRequests.data.some((request) =>
                              !["COMPLETED", "WITHDRAWN"].includes(request.status) &&
                              request.items.some((returned) => returned.order_line_item_id === item.id)
                            )}
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
          )) : <EmptyState icon={<PageIcon className="size-7" />} title="표시할 주문 상품이 없습니다" description="주문 정보는 계속 확인할 수 있어요." />}
        </section>
        <CustomerOrderReturns
          token={effectiveToken}
          orderCode={orderCode}
          markets={(order.market_orders ?? []).map((market) => ({
            id: market.market_id,
            name: marketByID.get(market.market_id)?.name ?? `마켓 ${market.market_id}`,
            items: market.line_items.map((item) => ({
              id: item.id,
              name: productByID.get(item.product_id)?.name ?? item.product?.name ?? `상품 ${item.product_id}`,
              quantity: item.quantity,
              price: item.price,
              status: item.status,
              purchaseConfirmedAt: item.purchase_confirmed_at,
            })),
          }))}
        />
      </div>
      <aside className="min-w-0 space-y-6 lg:sticky lg:top-24">
        {order.refund ? <OrderRefundSummary refund={order.refund} /> : null}
        <OrderSummary
          className="min-w-0"
          title="최초 결제 내역"
          items={[
            { label: "상품 금액", value: formatPrice(order.total_order_price) },
            { label: "쿠폰 할인", value: formatPrice(-order.total_discount_price) },
            { label: "사용 포인트", value: `${(-order.used_point).toLocaleString()}P` },
            { label: "배송비", value: formatPrice(orderShippingFee(order)) },
          ]}
          totalLabel="최초 결제액"
          total={formatPrice(amount)}
          footer={<p className="text-xs leading-5 text-content-secondary">주문 당시 결제한 금액입니다. 배송비에는 쿠폰·포인트 할인이 적용되지 않습니다.</p>}
        />
      </aside>
      </div>

      {confirmPurchase.error ? <Notice className="mt-4" tone="error">{apiErrorMessage(confirmPurchase.error)}</Notice> : null}
    </PageLayout>
  );
}

function OrderProgress({ status }: { status: string }) {
  if (!statusSteps.includes(status) && status !== "SHIPPING") {
    return null;
  }
  const activeIndex = statusSteps.indexOf(status === "SHIPPING" ? "SHIPPED" : status);
  return (
    <div className="mt-5">
      <p className="mb-2 text-xs font-bold text-content-secondary">
        현재 단계 <span className="ml-2 text-action-primary">{statusLabel(status)}</span>
      </p>
      <ol aria-label="주문 진행 단계" className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
        {statusSteps.map((step, index) => {
          const current = index === activeIndex;
          const completed = index < activeIndex;
          return (
            <li
              key={step}
              aria-current={current ? "step" : undefined}
              className={`flex min-h-11 min-w-0 items-center rounded-control px-3 py-2 text-xs font-bold ${
                index <= activeIndex
                  ? "bg-action-primary text-content-on-brand"
                  : "bg-surface-subtle text-content-secondary"
              }`}
            >
              <span>{statusLabel(step)}<span className="sr-only"> · {current ? "현재 단계" : completed ? "완료" : "예정"}</span></span>
            </li>
          );
        })}
      </ol>
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
      {reviewSubmitted ? <Badge tone="positive">리뷰 작성 완료</Badge> : null}
      {canWriteReview ? (
        <Button size="sm" variant="secondary" disabled={busy} onClick={onToggleReview}>
          {reviewOpen ? "리뷰 닫기" : "리뷰 작성"}
        </Button>
      ) : null}
      {completed ? <OrderStatus status="COMPLETED" /> : null}
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
