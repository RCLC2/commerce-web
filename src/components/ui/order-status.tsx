import { orderStatusLabel } from "@/lib/order-utils";
import { Badge } from "./badge";

const labels: Record<string, { label: string; tone: "neutral" | "brand" | "promotion" | "positive" | "warning" | "negative" }> = {
  PENDING: { label: "주문 확인 중", tone: "warning" },
  PAYMENT_PENDING: { label: "결제 대기", tone: "warning" },
  PAID: { label: "결제 완료", tone: "brand" },
  PLACED: { label: "주문 접수", tone: "brand" },
  SHIPPING: { label: "배송 중", tone: "promotion" },
  RETURN_REQUESTED: { label: "반품 요청", tone: "warning" },
  RETURN_APPROVED: { label: "반품 승인", tone: "warning" },
  RETURN_REJECTED: { label: "반품 거절", tone: "negative" },
  RETURN_COMPLETED: { label: "반품 완료", tone: "neutral" },
  PREPARING: { label: "상품 준비 중", tone: "brand" },
  SHIPPED: { label: "배송 중", tone: "promotion" },
  DELIVERED: { label: "배송 완료", tone: "positive" },
  COMPLETED: { label: "구매 확정", tone: "positive" },
  CANCELLED: { label: "주문 취소", tone: "negative" },
  REFUNDED: { label: "환불 완료", tone: "negative" },
};

export function OrderStatus({ status }: { status: string }) {
  const value = labels[status] ?? { label: orderStatusLabel(status), tone: "neutral" as const };
  return <Badge tone={value.tone}>{value.label}</Badge>;
}
