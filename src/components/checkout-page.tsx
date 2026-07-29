"use client";

import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ApiHttpError, apiErrorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import {
  CheckoutOrderStateError,
  estimatedCouponDiscount,
  maxApplicablePoints,
  normalizeRequestedPoints,
  shouldDiscardCheckoutRestoreStatus,
  submitServerAuthoritativeCheckout,
} from "@/lib/queries/checkout";
import { useSessionStore } from "@/lib/session-store";
import type { OrderResponse } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { Button } from "./ui/button";

const CHECKOUT_RETRY_STORAGE_KEY = "commerce.checkout.retry";

export function CheckoutPage() {
  const router = useRouter();
  const token = useSessionStore((state) => state.accessToken);
  const memberID = useSessionStore((state) => state.memberID);
  const effectiveToken = token ?? "";
  const [usedPoint, setUsedPoint] = useState(0);
  const [couponSelection, setCouponSelection] = useState<{
    id: number;
    cartUpdatedAt: number;
  }>();
  const [createdOrderCode, setCreatedOrderCode] = useState<string>();
  const [confirmedOrder, setConfirmedOrder] = useState<OrderResponse>();
  const [retryStateReady, setRetryStateReady] = useState(false);
  const [restoreError, setRestoreError] = useState<string>();

  const cart = useQuery({
    queryKey: ["cart", effectiveToken],
    queryFn: () => api.listCart(effectiveToken),
    enabled: Boolean(effectiveToken),
  });
  const coupons = useQuery({
    queryKey: queryKeys.coupons(effectiveToken),
    queryFn: () => api.listCoupons(effectiveToken),
    enabled: Boolean(effectiveToken),
  });
  const profile = useQuery({
    queryKey: queryKeys.me(effectiveToken),
    queryFn: () => api.me(effectiveToken),
    enabled: Boolean(effectiveToken),
  });
  const addresses = useQuery({
    queryKey: queryKeys.addresses(effectiveToken),
    queryFn: () => api.listAddresses(effectiveToken),
    enabled: Boolean(effectiveToken),
  });
  const productIDs = [...new Set((cart.data ?? []).map((item) => item.product_id))];
  const products = useQueries({
    queries: productIDs.map((id) => ({
      queryKey: queryKeys.product(id),
      queryFn: () => api.getProduct(id),
      staleTime: 5 * 60 * 1000,
    })),
  });
  const productByID = new Map(products.flatMap((query, index) =>
    query.data ? [[productIDs[index], query.data] as const] : []));
  const items = (cart.data ?? []).map((item) => ({ ...item, product: productByID.get(item.product_id) }));
  const ownedCoupons = (coupons.data ?? []).filter((coupon) => coupon.status === "AVAILABLE");
  const couponID = couponSelection?.cartUpdatedAt === cart.dataUpdatedAt
    ? couponSelection.id
    : undefined;
  const selectedCoupon = ownedCoupons.find((coupon) => coupon.id === couponID);
  const defaultAddress = (addresses.data ?? []).find((address) => address.is_default) ?? addresses.data?.[0];
  const productTotal = items.reduce((sum, item) => sum + item.price_at_added * item.quantity, 0);
  const availablePoint = profile.data?.point_balance ?? 0;
  const eligibleSelectedCoupon = selectedCoupon
    && productTotal >= selectedCoupon.coupon.min_order_amount
    ? selectedCoupon
    : undefined;
  const selectedCouponDiscount = estimatedCouponDiscount(eligibleSelectedCoupon?.coupon, productTotal);
  const pointLimit = maxApplicablePoints(productTotal, selectedCouponDiscount, availablePoint);
  const appliedPoint = Math.min(normalizeRequestedPoints(usedPoint), pointLimit);
  const expectedAmount = productTotal - selectedCouponDiscount - appliedPoint;
  const serverAmount = confirmedOrder
    ? Math.max(0, confirmedOrder.total_order_price - confirmedOrder.total_discount_price - confirmedOrder.used_point)
    : undefined;

  useEffect(() => {
    if (!effectiveToken || memberID === null) {
      return;
    }
    let cancelled = false;

    const clearStoredOrder = () => {
      window.sessionStorage.removeItem(CHECKOUT_RETRY_STORAGE_KEY);
      setCreatedOrderCode(undefined);
      setConfirmedOrder(undefined);
    };

    const restore = async () => {
      setRetryStateReady(false);
      setRestoreError(undefined);
      let stored: { memberID?: unknown; orderCode?: unknown } | null;
      try {
        stored = JSON.parse(
          window.sessionStorage.getItem(CHECKOUT_RETRY_STORAGE_KEY) ?? "null",
        ) as { memberID?: unknown; orderCode?: unknown } | null;
      } catch {
        clearStoredOrder();
        setRetryStateReady(true);
        return;
      }

      if (
        stored?.memberID !== memberID
        || typeof stored.orderCode !== "string"
        || !stored.orderCode.trim()
      ) {
        clearStoredOrder();
        setRetryStateReady(true);
        return;
      }

      const orderCode = stored.orderCode.trim();
      setCreatedOrderCode(orderCode);
      try {
        const order = await api.getOrder(effectiveToken, orderCode);
        if (cancelled) return;
        if (order.order_code !== orderCode || order.status === "CANCELLED") {
          clearStoredOrder();
        } else {
          setConfirmedOrder(order);
        }
      } catch (error) {
        if (cancelled) return;
        if (
          error instanceof ApiHttpError
          && shouldDiscardCheckoutRestoreStatus(error.status)
        ) {
          clearStoredOrder();
        } else {
          setRestoreError("기존 주문을 확인하지 못했습니다. 주문 코드는 보존했으며 다시 시도할 수 있습니다.");
        }
      } finally {
        if (!cancelled) {
          setRetryStateReady(true);
        }
      }
    };

    void restore();
    return () => {
      cancelled = true;
    };
  }, [effectiveToken, memberID]);

  const checkout = useMutation({
    mutationFn: () =>
      submitServerAuthoritativeCheckout({
        existingOrderCode: createdOrderCode,
        orderInput: {
          cart_item_ids: items.map((item) => item.id),
          used_coupon_id: eligibleSelectedCoupon?.id,
          used_point: appliedPoint,
        },
        placeOrder: (input) => api.placeOrder(effectiveToken, input),
        getOrder: (orderCode) => api.getOrder(effectiveToken, orderCode),
        createPaymentCheckout: (orderCode) => api.createPaymentCheckout(effectiveToken, orderCode),
        onOrderCreated: (orderCode) => {
          setCreatedOrderCode(orderCode);
          window.sessionStorage.setItem(CHECKOUT_RETRY_STORAGE_KEY, JSON.stringify({
            memberID,
            orderCode,
          }));
        },
        onOrderConfirmed: setConfirmedOrder,
      }),
    onSuccess: ({ orderCode, checkoutUrl }) => {
      if (checkoutUrl) {
        window.location.assign(checkoutUrl);
        return;
      }
      window.sessionStorage.removeItem(CHECKOUT_RETRY_STORAGE_KEY);
      router.push(`/orders/${orderCode}`);
    },
    onError: (error) => {
      if (error instanceof CheckoutOrderStateError && error.discardOrder) {
        window.sessionStorage.removeItem(CHECKOUT_RETRY_STORAGE_KEY);
        setCreatedOrderCode(undefined);
        setConfirmedOrder(undefined);
      }
    },
  });

  if (!token) {
    return <main className="mx-auto max-w-3xl px-4 py-16"><h1 className="text-2xl font-black">로그인이 필요합니다</h1><Link href="/login"><Button className="mt-5">로그인하기</Button></Link></main>;
  }

  const blockingError = cart.error;
  const supportingError = coupons.error ?? profile.error ?? addresses.error;

  return (
    <main className="mx-auto max-w-5xl px-4 pb-28 pt-8">
      <h1 className="text-2xl font-black">주문서</h1>
      {blockingError ? (
        <div className="mt-5 rounded-md border border-brand/30 bg-red-50 p-4 text-sm">
          <p className="font-bold text-brand">{apiErrorMessage(blockingError)}</p>
          <Button className="mt-3" size="sm" variant="secondary" onClick={() => {
            void cart.refetch(); void coupons.refetch(); void profile.refetch(); void addresses.refetch();
          }}>다시 시도</Button>
        </div>
      ) : null}
      {supportingError ? (
        <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm">
          <p className="font-bold text-amber-900">
            쿠폰·포인트·참고용 배송지 일부를 불러오지 못했습니다. 할인 없이 주문은 계속할 수 있습니다.
          </p>
          <Button className="mt-3" size="sm" variant="secondary" onClick={() => {
            void coupons.refetch(); void profile.refetch(); void addresses.refetch();
          }}>부가 정보 다시 시도</Button>
        </div>
      ) : null}
      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_340px]">
        <section className="space-y-5">
          <div className="rounded-md border border-line bg-white p-4">
            <h2 className="font-black">기본 배송지</h2>
            {defaultAddress ? (
              <div className="mt-3 text-sm leading-6">
                <p className="font-bold">{defaultAddress.receiver} / {defaultAddress.phone}</p>
                <p className="text-muted">({defaultAddress.zip_code}) {defaultAddress.line1} {defaultAddress.line2}</p>
              </div>
            ) : <p className="mt-3 text-sm text-muted">등록된 기본 배송지가 없습니다.</p>}
            <p className="mt-3 rounded-md bg-amber-50 p-3 text-xs font-bold text-amber-800">
              현재 주문 API는 배송지를 주문에 연결하지 않습니다. 위 주소는 계정의 기본 배송지를 참고용으로만 표시합니다.
            </p>
          </div>

          <div className="rounded-md border border-line bg-white p-4">
            <h2 className="font-black">주문 상품</h2>
            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between gap-4 text-sm">
                  <div><p className="font-bold">{item.product?.name ?? `상품 #${item.product_id}`}</p><p className="mt-1 text-muted">옵션 #{item.option_id} · {item.quantity}개</p></div>
                  <p className="font-black">{formatPrice(item.price_at_added * item.quantity)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-line bg-white p-4">
            <h2 className="font-black">할인 요청</h2>
            <label className="mt-4 block">
              <span className="text-sm font-bold">보유 쿠폰</span>
              <select
                className="mt-2 h-11 w-full rounded-md border border-line px-3 outline-none"
                value={eligibleSelectedCoupon?.id ?? ""}
                disabled={Boolean(createdOrderCode)}
                onChange={(event) => {
                  const id = Number(event.target.value);
                  setCouponSelection(id ? { id, cartUpdatedAt: cart.dataUpdatedAt } : undefined);
                }}
              >
                <option value="">사용 안 함</option>
                {ownedCoupons.map((owned) => {
                  const eligible = productTotal >= owned.coupon.min_order_amount;
                  return (
                    <option key={owned.id} value={owned.id} disabled={!eligible}>
                      {owned.coupon.name}{eligible ? "" : ` (${formatPrice(owned.coupon.min_order_amount)} 이상)`}
                    </option>
                  );
                })}
              </select>
              <span className="mt-1 block text-xs text-muted">주문에는 쿠폰 정의 ID가 아닌 보유 쿠폰 ID가 전송됩니다.</span>
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-bold">포인트 사용</span>
              <input type="number" min={0} max={pointLimit} step={1} disabled={Boolean(createdOrderCode)} className="mt-2 h-11 w-full rounded-md border border-line px-3 outline-none" value={usedPoint} onChange={(event) => setUsedPoint(normalizeRequestedPoints(Number(event.target.value)))} />
              <span className="mt-1 block text-xs text-muted">요청 {formatPrice(appliedPoint)} · 최대 사용 {formatPrice(pointLimit)} · 보유 {formatPrice(availablePoint)}</span>
            </label>
          </div>
        </section>

        <aside className="h-fit rounded-md border border-line bg-white p-4">
          <h2 className="font-black">{confirmedOrder ? "서버 확정 결제 금액" : "주문 전 예상 금액"}</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between"><span>상품 금액</span><strong>{formatPrice(confirmedOrder?.total_order_price ?? productTotal)}</strong></div>
            <div className="flex justify-between"><span>서버 할인</span><strong>{confirmedOrder ? `-${formatPrice(confirmedOrder.total_discount_price)}` : "주문 후 확정"}</strong></div>
            <div className="flex justify-between"><span>포인트</span><strong>-{formatPrice(confirmedOrder?.used_point ?? appliedPoint)}</strong></div>
          </div>
          <div className="mt-4 border-t border-line pt-4"><div className="flex justify-between"><span className="font-bold">결제 금액</span><strong className="text-xl">{serverAmount === undefined ? "주문 후 확정" : formatPrice(serverAmount)}</strong></div></div>
          <Button
            className="mt-5 w-full"
            size="lg"
            disabled={
              !retryStateReady
              || (!createdOrderCode && (
                !items.length
                || !Number.isSafeInteger(expectedAmount)
                || expectedAmount <= 0
              ))
              || Boolean(blockingError && !createdOrderCode)
              || checkout.isPending
            }
            onClick={() => checkout.mutate()}
          >
            {checkout.isPending ? "처리 중" : createdOrderCode ? "같은 주문 결제 재시도" : "주문 생성 후 결제"}
          </Button>
          {createdOrderCode ? <p className="mt-3 text-xs text-muted">생성된 주문: {createdOrderCode}. 재시도해도 주문은 다시 생성하지 않습니다.</p> : null}
          {!createdOrderCode && items.length > 0 && expectedAmount <= 0 ? (
            <p className="mt-3 text-xs font-bold text-brand">최소 결제 금액은 1원입니다. 쿠폰 또는 포인트 사용액을 조정해주세요.</p>
          ) : null}
          {restoreError ? <p className="mt-3 text-xs font-bold text-amber-800">{restoreError}</p> : null}
          {checkout.error ? <p className="mt-3 text-sm font-bold text-brand">{apiErrorMessage(checkout.error)}</p> : null}
        </aside>
      </div>
    </main>
  );
}
