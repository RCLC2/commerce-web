import type { OrderResponse } from "../types";

export type CheckoutOrderInput = {
  cart_item_ids: number[];
  used_coupon_id?: number;
  used_point: number;
};

export class CheckoutOrderStateError extends Error {
  constructor(message: string, readonly discardOrder = false) {
    super(message);
    this.name = "CheckoutOrderStateError";
  }
}

export async function submitServerAuthoritativeCheckout({
  existingOrderCode,
  orderInput,
  placeOrder,
  getOrder,
  completePayment,
  onOrderCreated,
  onOrderConfirmed,
}: {
  existingOrderCode?: string;
  orderInput: CheckoutOrderInput;
  placeOrder: (input: CheckoutOrderInput) => Promise<{ orderCode: string }>;
  getOrder: (orderCode: string) => Promise<OrderResponse>;
  completePayment: (orderCode: string, amount: number) => Promise<unknown>;
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
    throw new Error("0원 이하 주문의 결제 완료는 현재 서버에서 지원되지 않습니다.");
  }
  await completePayment(orderCode, amount);
  return { orderCode, order, amount, paymentSkipped: false };
}
