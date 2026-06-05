import type { OrderResponse } from "./types";

const ORDER_STATUS_LABELS: Record<string, string> = {
  PLACED: "주문 접수",
  PAYMENT_COMPLETED: "결제 완료",
  READY_TO_SHIP: "배송 준비중",
  SHIPPING: "배송중",
  DELIVERED: "배송 완료",
  CANCELLED: "주문 취소",
};

export function orderStatusLabel(status: string) {
  return ORDER_STATUS_LABELS[status] ?? status;
}

export function firstOrderItem(order: OrderResponse) {
  return order.market_orders?.flatMap((marketOrder) => marketOrder.line_items)[0];
}
