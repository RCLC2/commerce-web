import type { CouponDefinition, OrderResponse } from "../types";
import { ApiHttpError } from "../api-client";

export type CheckoutOrderInput = {
  cart_item_ids: number[];
  used_coupon_id?: number;
  used_point: number;
  shipping_address?: {
    receiver: string;
    phone: string;
    zip_code: string;
    line1: string;
    line2: string;
  };
};

export const CHECKOUT_RETRY_STORAGE_KEY = "commerce.checkout.retry";

export function selectedCartItemIDs(value: string | null): Set<number> | null {
  if (value === null) return null;
  return new Set(value.split(",").map(Number).filter((id) => Number.isSafeInteger(id) && id > 0));
}

export type CheckoutRetryState = {
  memberID?: unknown;
  orderCode?: unknown;
  cartItemIDs?: unknown;
  usedCouponID?: unknown;
  usedPoint?: unknown;
  attemptedAt?: unknown;
};

export type PersistedCheckoutRetryState = {
  memberID: number;
  orderCode?: string;
  cartItemIDs?: number[];
  usedCouponID?: number;
  usedPoint?: number;
  attemptedAt?: string;
};

type CheckoutRetryStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type CheckoutRetryStorageAccess = () => CheckoutRetryStorage;

export class CheckoutOrderStateError extends Error {
  constructor(message: string, readonly discardOrder = false) {
    super(message);
    this.name = "CheckoutOrderStateError";
  }
}

export type TossPaymentRequest = {
  client_key: string;
  order_id: string;
  order_name: string;
  amount: number;
};

export function estimatedCouponDiscount(
  coupon: CouponDefinition | undefined,
  orderAmount: number,
): number {
  if (!coupon || orderAmount < coupon.min_order_amount) {
    return 0;
  }
  const rawDiscount = coupon.discount_type === "PERCENT"
    ? Math.floor(orderAmount * coupon.discount_value / 100)
    : coupon.discount_value;
  const cappedDiscount = coupon.max_discount > 0
    ? Math.min(rawDiscount, coupon.max_discount)
    : rawDiscount;
  return Math.min(orderAmount, Math.max(0, cappedDiscount));
}

export function maxApplicablePoints(
  orderAmount: number,
  couponDiscount: number,
  availablePoint: number,
): number {
  return Math.max(0, Math.min(availablePoint, orderAmount - couponDiscount - 1));
}

export function normalizeRequestedPoints(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const normalized = Math.floor(value);
  return Number.isSafeInteger(normalized) ? Math.max(0, normalized) : 0;
}

export function cartBoundCouponID<T>(
  selection: { id: number; cartSnapshot: readonly T[] | undefined } | undefined,
  currentCart: readonly T[] | undefined,
): number | undefined {
  if (!selection || selection.cartSnapshot !== currentCart) {
    return undefined;
  }
  return selection.id;
}

export function readCheckoutRetryState(
  storageAccess: CheckoutRetryStorageAccess,
): CheckoutRetryState | null {
  try {
    const parsed: unknown = JSON.parse(
      storageAccess().getItem(CHECKOUT_RETRY_STORAGE_KEY) ?? "null",
    );
    return parsed && typeof parsed === "object"
      ? parsed as CheckoutRetryState
      : null;
  } catch {
    return null;
  }
}

export function saveCheckoutRetryState(
  storageAccess: CheckoutRetryStorageAccess,
  state: PersistedCheckoutRetryState,
): boolean {
  try {
    storageAccess().setItem(CHECKOUT_RETRY_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function pendingCheckoutInput(
  state: CheckoutRetryState | null,
  memberID: number,
): CheckoutOrderInput | undefined {
  if (state?.memberID !== memberID || !Array.isArray(state.cartItemIDs)) return undefined;
  const cartItemIDs = state.cartItemIDs.filter(
    (id): id is number => Number.isSafeInteger(id) && id > 0,
  );
  if (
    cartItemIDs.length === 0
    || cartItemIDs.length !== state.cartItemIDs.length
    || new Set(cartItemIDs).size !== cartItemIDs.length
  ) return undefined;
  const usedPoint = normalizeRequestedPoints(
    typeof state.usedPoint === "number" ? state.usedPoint : 0,
  );
  const usedCouponID = typeof state.usedCouponID === "number"
    && Number.isSafeInteger(state.usedCouponID)
    && state.usedCouponID > 0
    ? state.usedCouponID
    : undefined;
  return { cart_item_ids: [...new Set(cartItemIDs)], used_coupon_id: usedCouponID, used_point: usedPoint };
}

export function findUniqueOrderByCartItemIDs(
  orders: readonly OrderResponse[],
  cartItemIDs: readonly number[],
): OrderResponse | undefined {
  const expected = new Set(cartItemIDs);
  if (expected.size === 0 || expected.size !== cartItemIDs.length) return undefined;

  const matches = orders.filter((order) => {
    const lineItems = order.market_orders?.flatMap((marketOrder) => marketOrder.line_items) ?? [];
    const actualIDs = lineItems.flatMap((item) => item.cart_id === undefined ? [] : [item.cart_id]);
    return actualIDs.length === lineItems.length
      && actualIDs.length === expected.size
      && new Set(actualIDs).size === actualIDs.length
      && actualIDs.every((id) => expected.has(id));
  });
  return matches.length === 1 ? matches[0] : undefined;
}

export function clearCheckoutRetryState(
  storageAccess: CheckoutRetryStorageAccess,
): boolean {
  try {
    storageAccess().removeItem(CHECKOUT_RETRY_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function shouldDiscardCheckoutRestoreStatus(status: number | undefined): boolean {
  return status !== undefined && [400, 403, 404, 410, 422].includes(status);
}

export function shouldDiscardCheckoutAttemptError(error: unknown): boolean {
  return error instanceof ApiHttpError
    && [400, 401, 403, 404, 409, 410, 422].includes(error.status ?? 0);
}

export async function submitServerAuthoritativeCheckout({
  existingOrderCode,
  orderInput,
  placeOrder,
  getOrder,
  createPaymentRequest,
  recoverCreatedOrder,
  onOrderAttempt,
  onOrderCreated,
  onOrderConfirmed,
}: {
  existingOrderCode?: string;
  orderInput: CheckoutOrderInput;
  placeOrder: (input: CheckoutOrderInput) => Promise<{ orderCode: string }>;
  getOrder: (orderCode: string) => Promise<OrderResponse>;
  createPaymentRequest: (orderCode: string) => Promise<TossPaymentRequest>;
  recoverCreatedOrder?: (input: CheckoutOrderInput) => Promise<OrderResponse | undefined>;
  onOrderAttempt?: (input: CheckoutOrderInput) => void;
  onOrderCreated: (orderCode: string) => void;
  onOrderConfirmed: (order: OrderResponse) => void;
}) {
  let orderCode = existingOrderCode;
  if (!orderCode) {
    onOrderAttempt?.(orderInput);
    try {
      orderCode = (await placeOrder(orderInput)).orderCode;
    } catch (error) {
      let recovered: OrderResponse | undefined;
      try {
        recovered = await recoverCreatedOrder?.(orderInput);
      } catch {
        // Keep the original failure as the cause shown to the user.
      }
      if (!recovered) {
        throw new CheckoutOrderStateError(
          `주문 생성 결과를 확인할 수 없습니다. 주문 내역을 확인한 뒤 다시 시도해주세요. (${error instanceof Error ? error.message : "요청 실패"})`,
          shouldDiscardCheckoutAttemptError(error),
        );
      }
      orderCode = recovered.order_code;
    }
    onOrderCreated(orderCode);
  }

  const order = await getOrder(orderCode);
  if (order.order_code !== orderCode) {
    throw new CheckoutOrderStateError("조회한 주문과 결제 대상 주문이 일치하지 않습니다.");
  }
  onOrderConfirmed(order);
  const amount = order.total_order_price - order.total_discount_price - order.used_point;

  if (order.status !== "PAYMENT_PENDING") {
    if (order.status === "CANCELLED") {
      throw new CheckoutOrderStateError(
        "취소된 주문은 결제할 수 없습니다. 주문을 다시 생성해 주세요.",
        true,
      );
    }
    return { orderCode, order, amount: Math.max(0, amount), paymentSkipped: true };
  }

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error("0원 이하 주문의 토스 테스트 결제는 지원되지 않습니다.");
  }
  const paymentRequest = await createPaymentRequest(orderCode);
  if (paymentRequest.order_id !== orderCode) {
    throw new CheckoutOrderStateError("결제 요청의 주문 ID가 조회한 주문과 일치하지 않습니다.");
  }
  if (paymentRequest.amount !== amount) {
    throw new CheckoutOrderStateError("결제 요청 금액이 서버 주문 금액과 일치하지 않습니다.");
  }
  return { orderCode, order, amount, paymentRequest, paymentSkipped: false };
}
