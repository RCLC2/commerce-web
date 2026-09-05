"use client";

import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ApiHttpError, apiErrorMessage } from "@/lib/api-client";
import { groupCartItemsForDisplay } from "@/lib/cart-display";
import { queryKeys } from "@/lib/query-keys";
import {
  cartBoundCouponID,
  clearCheckoutRetryState,
  CheckoutOrderStateError,
  estimatedCouponDiscount,
  findUniqueOrderByCartItemIDs,
  maxApplicablePoints,
  normalizeRequestedPoints,
  pendingCheckoutInput,
  readCheckoutRetryState,
  saveCheckoutRetryState,
  selectedCartItemIDs,
  shouldDiscardCheckoutRestoreStatus,
  submitServerAuthoritativeCheckout,
} from "@/lib/queries/checkout";
import { useSessionStore } from "@/lib/session-store";
import type { CartItem, OrderResponse, PaymentRequest } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { TossPaymentWidget } from "./toss-payment-widget";
import { Button } from "./ui/button";
import { Field } from "./ui/field";
import { Input, Select } from "./ui/input";
import { Notice } from "./ui/notice";
import { OrderSummary } from "./ui/order-summary";
import { Surface } from "./ui/surface";

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
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest>();
  const [pendingAttemptBlocked, setPendingAttemptBlocked] = useState(false);
  const [restoreNonce, setRestoreNonce] = useState(0);

  const cart = useQuery({
    queryKey: queryKeys.cart(memberID),
    queryFn: () => api.listCart(effectiveToken),
    enabled: Boolean(effectiveToken),
  });
  const coupons = useQuery({
    queryKey: queryKeys.coupons(memberID),
    queryFn: () => api.listCoupons(effectiveToken),
    enabled: Boolean(effectiveToken),
  });
  const profile = useQuery({
    queryKey: queryKeys.me(memberID),
    queryFn: () => api.me(effectiveToken),
    enabled: Boolean(effectiveToken),
  });
  const addresses = useQuery({
    queryKey: queryKeys.addresses(memberID),
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
  const checkoutDisplayGroups = groupCartItemsForDisplay(items);
  const displayItems = createdOrderCode
    ? confirmedLineItems.map((item) => ({
      id: String(item.id),
      product_id: item.product_id,
      option_id: item.option_id,
      quantity: item.quantity,
      totalPrice: item.price * item.quantity,
      product: item.product ?? productByID.get(item.product_id),
    }))
    : checkoutDisplayGroups.map((group) => ({
      id: group.key,
      product_id: group.product_id,
      option_id: group.option_id,
      quantity: group.quantity,
      totalPrice: group.totalPrice,
      product: group.items[0].product,
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
      setPaymentRequest(undefined);
      setPendingAttemptBlocked(false);
    };

    const restore = async () => {
      setRetryStateReady(false);
      setRestoreError(undefined);
      const stored = readCheckoutRetryState(() => window.sessionStorage);

      if (stored?.memberID !== memberID) {
        clearStoredOrder();
        setRetryStateReady(true);
        return;
      }

      const pendingInput = pendingCheckoutInput(stored, memberID);
      if (typeof stored.orderCode !== "string" || !stored.orderCode.trim()) {
        if (!pendingInput) {
          clearStoredOrder();
          setRetryStateReady(true);
          return;
        }

        setPendingAttemptBlocked(true);
        try {
          const orders = await api.listAllOrders(effectiveToken);
          if (cancelled) return;
          const recovered = findUniqueOrderByCartItemIDs(orders, pendingInput.cart_item_ids);
          if (!recovered) {
            setRestoreError("이전 주문 생성 결과가 불명확합니다. 중복 주문을 막기 위해 주문 내역을 확인하기 전에는 다시 생성하지 않습니다.");
            return;
          }
          if (recovered.status === "CANCELLED") {
            clearStoredOrder();
            return;
          }
          setCreatedOrderCode(recovered.order_code);
          setConfirmedOrder(recovered);
          setPendingAttemptBlocked(false);
          saveCheckoutRetryState(() => window.sessionStorage, {
            memberID,
            orderCode: recovered.order_code,
            cartItemIDs: pendingInput.cart_item_ids,
            usedCouponID: pendingInput.used_coupon_id,
            usedPoint: pendingInput.used_point,
          });
        } catch {
          if (!cancelled) {
            setRestoreError("이전 주문 생성 결과를 확인하지 못했습니다. 주문 내역 확인 전에는 중복 방지를 위해 다시 생성하지 않습니다.");
          }
        } finally {
          if (!cancelled) setRetryStateReady(true);
        }
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
  }, [effectiveToken, memberID, restoreNonce]);

  const checkout = useMutation({
    onMutate: () => setPaymentRequest(undefined),
    mutationFn: () =>
      submitServerAuthoritativeCheckout({
        existingOrderCode: createdOrderCode,
        orderInput: {
          cart_item_ids: items.map((item) => item.id),
          used_coupon_id: eligibleSelectedCoupon?.id,
          used_point: appliedPoint,
          shipping_address: defaultAddress ? {
            receiver: defaultAddress.receiver,
            phone: defaultAddress.phone,
            zip_code: defaultAddress.zip_code,
            line1: defaultAddress.line1,
            line2: defaultAddress.line2,
          } : undefined,
        },
        placeOrder: (input) => api.placeOrder(effectiveToken, input),
        getOrder: (orderCode) => api.getOrder(effectiveToken, orderCode),
        createPaymentRequest: (orderCode) => api.createPaymentRequest(effectiveToken, orderCode),
        recoverCreatedOrder: async (input) =>
          findUniqueOrderByCartItemIDs(
            await api.listAllOrders(effectiveToken),
            input.cart_item_ids,
          ),
        onOrderAttempt: (input) => {
          if (memberID === null) {
            throw new Error("회원 정보를 확인하지 못해 주문을 생성할 수 없습니다. 다시 로그인해주세요.");
          }
          const saved = saveCheckoutRetryState(() => window.sessionStorage, {
            memberID,
            cartItemIDs: input.cart_item_ids,
            usedCouponID: input.used_coupon_id,
            usedPoint: input.used_point,
            attemptedAt: new Date().toISOString(),
          });
          if (!saved) {
            setRestoreError("브라우저 저장소를 사용할 수 없어 안전을 위해 주문 생성을 중단했습니다.");
            throw new Error("주문 복구 정보를 저장하지 못해 안전을 위해 주문 생성을 중단했습니다.");
          }
          setPendingAttemptBlocked(true);
        },
        onOrderCreated: (orderCode) => {
          setCreatedOrderCode(orderCode);
          setPendingAttemptBlocked(false);
          if (memberID === null) {
            setRestoreError("회원 정보를 확인하지 못해 주문 복구 상태를 저장할 수 없습니다. 페이지를 새로고침하지 말고 결제를 계속해주세요.");
            return;
          }
          const saved = saveCheckoutRetryState(() => window.sessionStorage, {
            memberID,
            orderCode,
            cartItemIDs: items.map((item) => item.id),
            usedCouponID: eligibleSelectedCoupon?.id,
            usedPoint: appliedPoint,
          });
          if (!saved) {
            setRestoreError("이 브라우저에서는 주문 복구 저장소를 사용할 수 없습니다. 페이지를 새로고침하지 말고 결제를 계속해주세요.");
          }
        },
        onOrderConfirmed: setConfirmedOrder,
      }),
    onSuccess: ({ orderCode, paymentRequest: nextPaymentRequest, paymentSkipped }) => {
      if (!paymentSkipped && nextPaymentRequest) {
        setPaymentRequest(nextPaymentRequest);
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
        setPendingAttemptBlocked(false);
      }
    },
  });

  if (!token) {
    return <main className="mx-auto max-w-3xl px-4 py-16"><h1 className="text-2xl font-black">로그인이 필요합니다</h1><Link href="/login"><Button className="mt-5">로그인하기</Button></Link></main>;
  }

  const blockingError = cart.error ?? (!createdOrderCode ? addresses.error : null);
  const supportingError = coupons.error ?? profile.error;

  return (
    <main className="mx-auto max-w-5xl px-4 pb-28 pt-8">
      <h1 className="text-2xl font-black">주문서</h1>
      {!createdOrderCode && requestedCartItemIDs !== null && cart.isSuccess && !items.length ? (
        <Notice className="mt-5" tone="warning" title="선택한 장바구니 상품을 찾을 수 없습니다."><Link href="/cart" className="font-bold underline">장바구니에서 다시 선택해주세요.</Link></Notice>
      ) : null}
      {blockingError ? (
        <Notice className="mt-5" tone="error" title={apiErrorMessage(blockingError)}>
          <Button className="mt-3" size="sm" variant="secondary" onClick={() => {
            void cart.refetch(); void coupons.refetch(); void profile.refetch(); void addresses.refetch();
          }}>다시 시도</Button>
        </Notice>
      ) : null}
      {supportingError ? (
        <Notice className="mt-3" tone="warning" title="쿠폰·포인트·참고용 배송지 일부를 불러오지 못했습니다.">
          할인 없이 주문은 계속할 수 있습니다.
          <Button className="mt-3" size="sm" variant="secondary" onClick={() => {
            void coupons.refetch(); void profile.refetch(); void addresses.refetch();
          }}>부가 정보 다시 시도</Button>
        </Notice>
      ) : null}
      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_340px]">
        <section className="space-y-5">
          <Surface padding="sm">
            <h2 className="font-black">기본 배송지</h2>
            {defaultAddress ? (
              <div className="mt-3 text-sm leading-6">
                <p className="font-bold">{defaultAddress.receiver} / {defaultAddress.phone}</p>
                <p className="text-muted">({defaultAddress.zip_code}) {defaultAddress.line1} {defaultAddress.line2}</p>
              </div>
            ) : <p className="mt-3 text-sm text-muted">등록된 기본 배송지가 없습니다.</p>}
            {defaultAddress ? <p className="mt-3 text-xs font-bold text-status-positive">이 배송지는 주문 당시 정보로 저장되어 셀러와 관리자 배송 처리에 사용됩니다.</p> : null}
          </Surface>

          <Surface padding="sm">
            <h2 className="font-black">주문 상품</h2>
            {createdOrderCode ? (
              <Notice className="mt-3" tone="warning" title="복구한 주문은 현재 장바구니와 별개입니다">아래에는 서버에서 확인한 기존 주문 상품만 표시합니다. 현재 장바구니 변경사항은 이 결제에 포함되지 않습니다.</Notice>
            ) : null}
            <div className="mt-4 space-y-3">
              {displayItems.map((item) => {
                const option = item.product?.options?.find((candidate) => candidate.id === item.option_id);
                return (
                  <div key={item.id} className="flex justify-between gap-4 text-sm">
                    <div><p className="font-bold">{item.product?.name ?? `상품 #${item.product_id}`}</p><p className="mt-1 text-muted">{option ? `${option.option_name} · ${option.option_value}` : `옵션 #${item.option_id}`} · {item.quantity}개</p></div>
                    <p className="font-black">{formatPrice(item.totalPrice)}</p>
                  </div>
                );
              })}
              {createdOrderCode && confirmedOrder && displayItems.length === 0 ? (
                <p className="text-sm text-muted">서버 주문에 표시할 상품 상세가 없습니다. 결제 금액은 서버 확정값을 사용합니다.</p>
              ) : null}
            </div>
          </Surface>

          <Surface padding="sm">
            <h2 className="font-black">할인 요청</h2>
            <Field className="mt-4" label="보유 쿠폰" htmlFor="checkout-coupon" hint="주문에는 쿠폰 정의 ID가 아닌 보유 쿠폰 ID가 전송됩니다.">
              <Select
                id="checkout-coupon"
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
              </Select>
            </Field>
            <Field className="mt-4" label="포인트 사용" htmlFor="checkout-point" hint={`요청 ${formatPrice(appliedPoint)} · 최대 사용 ${formatPrice(pointLimit)} · 보유 ${formatPrice(availablePoint)}`}>
              <Input id="checkout-point" type="number" min={0} max={pointLimit} step={1} disabled={Boolean(createdOrderCode)} value={usedPoint} onChange={(event) => setUsedPoint(normalizeRequestedPoints(Number(event.target.value)))} />
            </Field>
          </Surface>
        </section>

        <aside className="h-fit md:sticky md:top-24">
          <OrderSummary
            title={confirmedOrder ? "서버 확정 결제 금액" : "주문 전 예상 금액"}
            items={[
              { label: "상품 금액", value: formatPrice(confirmedOrder?.total_order_price ?? productTotal) },
              { label: "서버 할인", value: confirmedOrder ? `-${formatPrice(confirmedOrder.total_discount_price)}` : "주문 후 확정", emphasis: confirmedOrder ? "negative" : "default" },
              { label: "포인트", value: `-${formatPrice(confirmedOrder?.used_point ?? appliedPoint)}`, emphasis: "negative" },
            ]}
            totalLabel="결제 금액"
            total={serverAmount === undefined ? "주문 후 확정" : formatPrice(serverAmount)}
            footer={<>
              {!paymentRequest ? (
                <Button
                  className="w-full"
                  size="lg"
                  disabled={
                    !retryStateReady
                    || (!createdOrderCode && (
                      !items.length
                      || !defaultAddress
                      || !Number.isSafeInteger(expectedAmount)
                      || expectedAmount <= 0
                      || pendingAttemptBlocked
                    ))
                    || Boolean(blockingError && !createdOrderCode)
                    || checkout.isPending
                  }
                  onClick={() => checkout.mutate()}
                >
                  {checkout.isPending ? "처리 중" : createdOrderCode ? "결제 정보 다시 준비" : "주문 생성 후 결제"}
                </Button>
              ) : (
                <TossPaymentWidget
                  clientKey={paymentRequest.client_key}
                  orderId={paymentRequest.order_id}
                  orderName={paymentRequest.order_name}
                  amount={paymentRequest.amount}
                  customerEmail={profile.data?.email}
                />
              )}
              {createdOrderCode ? <p className="mt-3 text-xs text-content-secondary">생성된 주문: {createdOrderCode}. 재시도해도 주문은 다시 생성하지 않습니다.</p> : null}
              {!createdOrderCode && items.length > 0 && expectedAmount <= 0 ? (
                <p className="mt-3 text-xs font-bold text-action-primary">최소 결제 금액은 1원입니다. 쿠폰 또는 포인트 사용액을 조정해주세요.</p>
              ) : null}
              {!createdOrderCode && addresses.isSuccess && !defaultAddress ? (
                <p className="mt-3 text-xs font-bold text-action-primary">주문하려면 마이페이지에서 배송지를 먼저 등록해 주세요.</p>
              ) : null}
              {restoreError ? <p className="mt-3 text-xs font-bold text-status-warning">{restoreError}</p> : null}
              {pendingAttemptBlocked && !createdOrderCode ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href="/mypage"><Button size="sm" variant="secondary">주문 내역 확인</Button></Link>
                  <Button size="sm" variant="secondary" onClick={() => setRestoreNonce((value) => value + 1)}>복구 다시 확인</Button>
                </div>
              ) : null}
              {checkout.error ? <p className="mt-3 text-sm font-bold text-action-primary">{apiErrorMessage(checkout.error)}</p> : null}
            </>}
          />
        </aside>
      </div>
    </main>
  );
}
