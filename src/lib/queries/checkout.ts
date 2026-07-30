import type { CouponDefinition, OrderResponse } from "../types";

export type CheckoutOrderInput = {
  cart_item_ids: number[];
  used_coupon_id?: number;
  used_point: number;
};

export const CHECKOUT_RETRY_STORAGE_KEY = "commerce.checkout.retry";

export type CheckoutRetryState = {
  memberID?: unknown;
  orderCode?: unknown;
};

type CheckoutRetryStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type CheckoutRetryStorageAccess = () => CheckoutRetryStorage;

export class CheckoutOrderStateError extends Error {
  constructor(message: string, readonly discardOrder = false) {
    super(message);
    this.name = "CheckoutOrderStateError";
  }
}

export type HostedPaymentCheckout = {
  order_code: string;
  checkout_url: string;
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
  state: { memberID: number; orderCode: string },
): boolean {
  try {
    storageAccess().setItem(CHECKOUT_RETRY_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
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

export function safeHostedCheckoutURL(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new CheckoutOrderStateError("결제 이동 주소가 올바르지 않습니다.");
  }
  if (
    (
      url.protocol !== "https:"
      && !(
        url.protocol === "http:"
        && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      )
    )
    || url.username
    || url.password
  ) {
    throw new CheckoutOrderStateError("안전하지 않은 결제 이동 주소를 차단했습니다.");
  }
  return url.toString();
}

export async function submitServerAuthoritativeCheckout({
  existingOrderCode,
  orderInput,
  placeOrder,
  getOrder,
  createPaymentCheckout,
  onOrderCreated,
  onOrderConfirmed,
}: {
  existingOrderCode?: string;
  orderInput: CheckoutOrderInput;
  placeOrder: (input: CheckoutOrderInput) => Promise<{ orderCode: string }>;
  getOrder: (orderCode: string) => Promise<OrderResponse>;
  createPaymentCheckout: (orderCode: string) => Promise<HostedPaymentCheckout>;
  onOrderCreated: (orderCode: string) => void;
  onOrderConfirmed: (order: OrderResponse) => void;
}) {
  let orderCode = existingOrderCode;
  if (!orderCode) {
    orderCode = (await placeOrder(orderInput)).orderCode;
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
    throw new Error("0원 이하 주문의 hosted checkout은 현재 서버에서 지원되지 않습니다.");
  }
  const checkout = await createPaymentCheckout(orderCode);
  if (checkout.order_code !== orderCode) {
    throw new CheckoutOrderStateError("결제 체크아웃의 주문 코드가 조회한 주문과 일치하지 않습니다.");
  }
  if (checkout.amount !== amount) {
    throw new CheckoutOrderStateError("결제 체크아웃 금액이 서버 주문 금액과 일치하지 않습니다.");
  }
  const checkoutUrl = safeHostedCheckoutURL(checkout.checkout_url);
  const checkoutMode = new URL(checkoutUrl).protocol === "http:"
    ? "loopback-mock" as const
    : "external" as const;
  return { orderCode, order, amount, checkoutUrl, checkoutMode, paymentSkipped: false };
}
