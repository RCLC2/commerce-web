import type { OrderResponse } from "./types";

const ORDER_STATUS_LABELS: Record<string, string> = {
  PAYMENT_PENDING: "결제 대기",
  PAID: "결제 완료",
  PLACED: "주문 접수",
  SHIPPED: "배송중",
  DELIVERED: "배송 완료",
  COMPLETED: "구매 확정",
  CANCELLED: "주문 취소",
};

export function orderStatusLabel(status: string) {
  return ORDER_STATUS_LABELS[status] ?? status;
}

export function firstOrderItem(order: OrderResponse) {
  return order.market_orders?.flatMap((marketOrder) => marketOrder.line_items)[0];
}
