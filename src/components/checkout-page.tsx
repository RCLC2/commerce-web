"use client";

import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ApiHttpError, apiErrorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import {
  cartBoundCouponID,
  clearCheckoutRetryState,
  CheckoutOrderStateError,
  estimatedCouponDiscount,
  maxApplicablePoints,
  normalizeRequestedPoints,
  readCheckoutRetryState,
  saveCheckoutRetryState,
  selectedCartItemIDs,
  shouldDiscardCheckoutRestoreStatus,
  submitServerAuthoritativeCheckout,
} from "@/lib/queries/checkout";
import { useSessionStore } from "@/lib/session-store";
import type { CartItem, OrderResponse } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { Button } from "./ui/button";

export function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useSessionStore((state) => state.accessToken);
  const memberID = useSessionStore((state) => state.memberID);
  const effectiveToken = token ?? "";
  const [usedPoint, setUsedPoint] = useState(0);
  const [couponSelection, setCouponSelection] = useState<{
    id: number;
    cartSnapshot: readonly CartItem[] | undefined;
  }>();
  const [createdOrderCode, setCreatedOrderCode] = useState<string>();
  const [confirmedOrder, setConfirmedOrder] = useState<OrderResponse>();
  const [retryStateReady, setRetryStateReady] = useState(false);
  const [restoreError, setRestoreError] = useState<string>();
  const [mockCheckoutUrl, setMockCheckoutUrl] = useState<string>();

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
  const confirmedLineItems = confirmedOrder?.market_orders?.flatMap((marketOrder) =>
    marketOrder.line_items) ?? [];
  const requestedCartItemIDs = selectedCartItemIDs(searchParams.get("cartItemIDs"));
  const checkoutCartItems = (cart.data ?? []).filter((item) =>
    requestedCartItemIDs === null || requestedCartItemIDs.has(item.id));
  const productIDs = [...new Set([
    ...checkoutCartItems.map((item) => item.product_id),
    ...confirmedLineItems.map((item) => item.product_id),
  ])];
  const products = useQueries({
    queries: productIDs.map((id) => ({
      queryKey: queryKeys.product(id),
      queryFn: () => api.getProduct(id),
      staleTime: 5 * 60 * 1000,
    })),
  });
  const productByID = new Map(products.flatMap((query, index) =>
    query.data ? [[productIDs[index], query.data] as const] : []));
  const items = checkoutCartItems.map((item) => ({ ...item, product: productByID.get(item.product_id) }));
  const displayItems = createdOrderCode
    ? confirmedLineItems.map((item) => ({
      id: item.id,
      product_id: item.product_id,
      option_id: item.option_id,
      quantity: item.quantity,
      price: item.price,
      product: item.product ?? productByID.get(item.product_id),
    }))
    : items.map((item) => ({
      id: item.id,
      product_id: item.product_id,
      option_id: item.option_id,
      quantity: item.quantity,
      price: item.price_at_added,
      product: item.product,
    }));
  const ownedCoupons = (coupons.data ?? []).filter((coupon) => coupon.status === "AVAILABLE");
  const couponID = cartBoundCouponID(couponSelection, cart.data);
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
      clearCheckoutRetryState(() => window.sessionStorage);
      setCreatedOrderCode(undefined);
      setConfirmedOrder(undefined);
    };

    const restore = async () => {
      setRetryStateReady(false);
      setRestoreError(undefined);
      const stored = readCheckoutRetryState(() => window.sessionStorage);

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
    onMutate: () => setMockCheckoutUrl(undefined),
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
          if (memberID === null) {
            setRestoreError("회원 정보를 확인하지 못해 주문 복구 상태를 저장할 수 없습니다. 페이지를 새로고침하지 말고 결제를 계속해주세요.");
            return;
          }
          const saved = saveCheckoutRetryState(() => window.sessionStorage, {
            memberID,
            orderCode,
          });
          if (!saved) {
            setRestoreError("이 브라우저에서는 주문 복구 저장소를 사용할 수 없습니다. 페이지를 새로고침하지 말고 결제를 계속해주세요.");
          }
        },
        onOrderConfirmed: setConfirmedOrder,
      }),
    onSuccess: ({ orderCode, checkoutUrl, checkoutMode }) => {
      if (checkoutUrl) {
        if (checkoutMode === "loopback-mock") {
          setMockCheckoutUrl(checkoutUrl);
          return;
        }
        window.location.assign(checkoutUrl);
        return;
      }
      clearCheckoutRetryState(() => window.sessionStorage);
      router.push(`/orders/${orderCode}`);
    },
    onError: (error) => {
      if (error instanceof CheckoutOrderStateError && error.discardOrder) {
        clearCheckoutRetryState(() => window.sessionStorage);
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
      {requestedCartItemIDs !== null && cart.isSuccess && !items.length ? (
        <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-900">
          선택한 장바구니 상품을 찾을 수 없습니다. <Link href="/cart" className="underline">장바구니에서 다시 선택해주세요.</Link>
        </div>
      ) : null}
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
            {createdOrderCode ? (
              <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3">
                <p className="text-sm font-black text-amber-950">복구한 주문은 현재 장바구니와 별개입니다</p>
                <p className="mt-1 text-xs leading-5 text-amber-900">
                  아래에는 서버에서 확인한 기존 주문 상품만 표시합니다. 현재 장바구니 변경사항은 이 결제에 포함되지 않습니다.
                </p>
              </div>
            ) : null}
            <div className="mt-4 space-y-3">
              {displayItems.map((item) => (
                <div key={item.id} className="flex justify-between gap-4 text-sm">
                  <div><p className="font-bold">{item.product?.name ?? `상품 #${item.product_id}`}</p><p className="mt-1 text-muted">옵션 #{item.option_id} · {item.quantity}개</p></div>
                  <p className="font-black">{formatPrice(item.price * item.quantity)}</p>
                </div>
              ))}
              {createdOrderCode && confirmedOrder && displayItems.length === 0 ? (
                <p className="text-sm text-muted">서버 주문에 표시할 상품 상세가 없습니다. 결제 금액은 서버 확정값을 사용합니다.</p>
              ) : null}
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
                  setCouponSelection(id ? { id, cartSnapshot: cart.data } : undefined);
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
          {mockCheckoutUrl ? (
            <section className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-4">
              <h3 className="font-black text-amber-950">실제 결제 완료는 지원하지 않습니다</h3>
              <p className="mt-2 text-xs leading-5 text-amber-900">
                로컬 결제 mock에는 checkout 페이지와 webhook이 없습니다. 다음 이동은 hosted handoff 주소만 확인합니다.
              </p>
              <Button
                className="mt-3"
                size="sm"
                variant="secondary"
                onClick={() => window.location.assign(mockCheckoutUrl)}
              >
                mock handoff 주소 열기
              </Button>
            </section>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
