import type { OrderResponse } from "./types";

const ORDER_STATUS_LABELS: Record<string, string> = {
  PAYMENT_PENDING: "결제 대기",
  PAID: "결제 완료",
  PLACED: "주문 접수",
  PENDING: "주문 확인 중",
  PREPARING: "상품 준비 중",
  SHIPPED: "배송 중",
  PICKED_UP: "상품 인수 완료",
  IN_TRANSIT: "배송 중",
  OUT_FOR_DELIVERY: "배송 출발",
  SHIPPING: "배송 중",
  DELIVERED: "배송 완료",
  COMPLETED: "구매 확정",
  CANCELLED: "주문 취소",
  ORDERED: "주문 완료",
  REVIEWED: "리뷰 작성 완료",
  RETURN_REQUESTED: "반품 요청",
  RETURN_APPROVED: "반품 승인",
  RETURN_REJECTED: "반품 거절",
  RETURN_COMPLETED: "반품 완료",
  REFUNDED: "환불 완료",
};

export function orderStatusLabel(status: string) {
  return ORDER_STATUS_LABELS[status] ?? status;
}

export function firstOrderItem(order: OrderResponse) {
  return order.market_orders?.flatMap((marketOrder) => marketOrder.line_items)[0];
}
