"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { getEffectiveToken } from "@/lib/auth-token";
import { queryKeys } from "@/lib/query-keys";
import { useSessionStore } from "@/lib/session-store";
import type { OrderLineItemResponse, TrackingInfo } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { ReviewWritePanel } from "./review-write-panel";
import { SafeImage } from "./safe-image";
import { Button } from "./ui/button";

const statusSteps = ["PAYMENT_PENDING", "PAID", "SHIPPED", "DELIVERED", "COMPLETED"];

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    PAYMENT_PENDING: "Payment pending",
    PAID: "Paid",
    PLACED: "Placed",
    READY_TO_SHIP: "Preparing",
    SHIPPED: "Shipping",
    SHIPPING: "Shipping",
    DELIVERED: "Delivered",
    COMPLETED: "Confirmed",
    CANCELLED: "Canceled",
    ORDERED: "Ordered",
    REVIEWED: "Reviewed",
  };
  return labels[status] ?? status;
}

export function OrderDetailPage({ orderCode }: { orderCode: string }) {
  const token = useSessionStore((state) => state.accessToken);
  const effectiveToken = getEffectiveToken(token) ?? "";
  const queryClient = useQueryClient();
  const [trackingInfo, setTrackingInfo] = useState<TrackingInfo | null>(null);
  const [reviewingLineItemID, setReviewingLineItemID] = useState<number | null>(null);

  const { data: order, isLoading, error } = useQuery({
    queryKey: ["order", orderCode],
    queryFn: () => api.getOrder(effectiveToken, orderCode),
    enabled: Boolean(effectiveToken),
  });
  const { data: myReviews = [] } = useQuery({
    queryKey: queryKeys.myReviews(effectiveToken),
    queryFn: () => api.listMyReviews(effectiveToken),
    enabled: Boolean(effectiveToken),
  });

  const confirmPurchase = useMutation({
    mutationFn: (itemID: number) => api.confirmPurchase(effectiveToken, orderCode, itemID),
    onSuccess: (updated) => {
      queryClient.setQueryData(["order", orderCode], updated);
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders(effectiveToken) });
    },
  });
  const trackDelivery = useMutation({
    mutationFn: () => {
      if (!order?.delivery?.id) {
        throw new Error("Delivery information is missing.");
      }
      return api.trackDelivery(effectiveToken, orderCode, order.delivery.id);
    },
    onSuccess: setTrackingInfo,
  });

  if (!token) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-black">Login required</h1>
        <Link href="/login">
          <Button className="mt-5">Log in</Button>
        </Link>
      </main>
    );
  }

  if (isLoading) {
    return <main className="mx-auto max-w-4xl px-4 py-8 text-sm text-muted">Loading order.</main>;
  }

  if (error || !order) {
    return <main className="mx-auto max-w-4xl px-4 py-8 text-sm text-brand">Could not load order.</main>;
  }

  const amount = order.total_order_price - order.total_discount_price - order.used_point;
  const deliveryStatus = order.delivery?.status ?? order.status;

  return (
    <main className="mx-auto max-w-4xl px-4 pb-24 pt-8">
      <div className="rounded-md border border-line bg-white p-5">
        <p className="text-sm font-bold text-muted">Order no.</p>
        <h1 className="mt-1 text-2xl font-black">{order.order_code}</h1>
        <p className="mt-1 text-sm text-muted">{order.ordered_at ? new Date(order.ordered_at).toLocaleString("ko-KR") : "-"}</p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <InfoBox label="Status" value={statusLabel(order.status)} />
          <InfoBox label="Payment" value={order.payment_method ?? "CARD"} />
          <InfoBox label="Amount" value={formatPrice(amount)} />
        </div>
        <OrderProgress status={order.status} />
      </div>

      <section className="mt-6 rounded-md border border-line bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">Delivery</h2>
            <p className="mt-1 text-sm text-muted">{statusLabel(deliveryStatus)}</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled={!order.delivery?.id || trackDelivery.isPending || !order.delivery?.tracking_number}
            onClick={() => trackDelivery.mutate()}
          >
            {trackDelivery.isPending ? "Tracking" : "Track"}
          </Button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <InfoBox label="Carrier" value={order.delivery?.carrier || "-"} />
          <InfoBox label="Tracking no." value={order.delivery?.tracking_number || "-"} />
          <InfoBox label="Delivery status" value={statusLabel(order.delivery?.status ?? order.status)} />
        </div>
        {trackingInfo ? (
          <div className="mt-4 rounded-md bg-zinc-50 p-3 text-sm">
            <p className="font-black">{trackingInfo.Status ?? trackingInfo.status ?? "Tracking"}</p>
            <p className="mt-1 text-muted">{trackingInfo.Location ?? trackingInfo.location ?? "No location"}</p>
            <p className="mt-1 text-muted">{trackingInfo.Description ?? trackingInfo.description ?? ""}</p>
          </div>
        ) : null}
        {trackDelivery.error ? <p className="mt-3 text-sm font-bold text-brand">{trackDelivery.error.message}</p> : null}
      </section>

      <section className="mt-6 rounded-md border border-line bg-white p-5">
        <h2 className="text-lg font-black">Address</h2>
        {order.shipping_address ? (
          <div className="mt-3 text-sm leading-7">
            <p className="font-bold">
              {order.shipping_address.receiver} / {order.shipping_address.phone}
            </p>
            <p className="text-muted">
              ({order.shipping_address.zip_code}) {order.shipping_address.line1} {order.shipping_address.line2}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">No shipping address.</p>
        )}
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="text-lg font-black">Items</h2>
        {order.market_orders?.map((marketOrder) => (
          <div key={marketOrder.id} className="rounded-md border border-line bg-white p-4">
            <div className="flex justify-between text-sm">
              <span className="font-bold">Market #{marketOrder.market_id}</span>
              <span className="text-muted">{statusLabel(marketOrder.status)}</span>
            </div>
            <div className="mt-4 space-y-4">
              {marketOrder.line_items.map((item) => {
                const writtenReview = myReviews.find((review) => review.order_line_item_id === item.id);
                const completed = item.status === "COMPLETED" || Boolean(item.purchase_confirmed_at);
                const canWriteReview = (item.reviewable ?? completed) && !writtenReview;
                const isReviewing = reviewingLineItemID === item.id;

                return (
                  <div key={item.id} className="border-t border-line pt-4 first:border-t-0 first:pt-0">
                    <div className="flex gap-3 text-sm">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-zinc-100">
                        <SafeImage src={item.product?.image_url} alt="" fill sizes="80px" className="object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between gap-3">
                          <Link href={`/products/${item.product_id}`} className="font-bold hover:underline">
                            {item.product?.name ?? `Product ${item.product_id}`}
                          </Link>
                          <p className="font-black">{formatPrice(item.price * item.quantity)}</p>
                        </div>
                        <p className="mt-1 text-muted">
                          Option #{item.option_id} / {item.quantity} pcs / {statusLabel(item.status)}
                        </p>
                        <OrderItemActions
                          item={item}
                          busy={confirmPurchase.isPending}
                          completed={completed}
                          writtenReviewID={writtenReview?.id}
                          canWriteReview={canWriteReview}
                          reviewOpen={isReviewing}
                          onConfirm={() => confirmPurchase.mutate(item.id)}
                          onToggleReview={() => setReviewingLineItemID(isReviewing ? null : item.id)}
                        />
                      </div>
                    </div>
                    {canWriteReview && isReviewing ? (
                      <ReviewWritePanel
                        token={effectiveToken}
                        orderCode={order.order_code}
                        lineItemID={item.id}
                        productID={item.product_id}
                        onSubmitted={() => setReviewingLineItemID(null)}
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
        <h2 className="text-lg font-black">Payment</h2>
        <div className="mt-4 space-y-2 text-sm">
          <PriceRow label="Subtotal" value={order.total_order_price} />
          <PriceRow label="Discount" value={-order.total_discount_price} />
          <PriceRow label="Points" value={-order.used_point} />
          <div className="border-t border-line pt-3">
            <PriceRow label="Final amount" value={amount} strong />
          </div>
        </div>
      </section>

      {confirmPurchase.error ? <p className="mt-4 text-sm font-bold text-brand">{confirmPurchase.error.message}</p> : null}
    </main>
  );
}

function OrderProgress({ status }: { status: string }) {
  const activeIndex = Math.max(0, statusSteps.indexOf(status));
  return (
    <div className="mt-5 grid gap-2 md:grid-cols-5">
      {statusSteps.map((step, index) => (
        <div key={step} className={`rounded-md px-3 py-2 text-xs font-black ${index <= activeIndex ? "bg-zinc-900 text-white" : "bg-zinc-100 text-muted"}`}>
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
  writtenReviewID,
  canWriteReview,
  reviewOpen,
  onConfirm,
  onToggleReview,
}: {
  item: OrderLineItemResponse;
  busy: boolean;
  completed: boolean;
  writtenReviewID?: number;
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
          Confirm purchase
        </Button>
      ) : null}
      {writtenReviewID ? (
        <>
          <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-black text-muted">Reviewed</span>
          <Link href="/mypage/reviews" className="text-xs font-bold text-foreground underline">
            Manage review
          </Link>
        </>
      ) : null}
      {canWriteReview ? (
        <Button size="sm" variant="secondary" disabled={busy} onClick={onToggleReview}>
          {reviewOpen ? "Close review" : "Write review"}
        </Button>
      ) : null}
      {completed ? <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-black text-muted">Confirmed</span> : null}
    </div>
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
