"use client";

import { useEffect, useRef } from "react";
import type { OrderResponse } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { OrderSummary } from "./ui/order-summary";

export function OrderRefundSummary({
  refund,
  revealOnMount = false,
}: {
  refund: NonNullable<OrderResponse["refund"]>;
  revealOnMount?: boolean;
}) {
  const summaryRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!revealOnMount || !summaryRef.current) return;
    // The modal keeps its scroll position when refund controls are replaced.
    let container = summaryRef.current.parentElement;
    while (container) {
      if (/auto|scroll/.test(getComputedStyle(container).overflowY)) {
        container.scrollTop = 0;
        break;
      }
      container = container.parentElement;
    }
    summaryRef.current.focus({ preventScroll: true });
  }, [revealOnMount, refund.completed_at]);
  return (
    <div
      ref={summaryRef}
      tabIndex={revealOnMount ? -1 : undefined}
      aria-label="환불 완료 내역"
    >
      <OrderSummary
        className="min-w-0"
        title={refund.bank_refund ? "결제 취소 접수 합계" : "환불 완료 합계"}
        items={[
          {
            label: "유지·차감된 배송비 합계",
            value: formatPrice(refund.retained_shipping_fee),
          },
          {
            label: "복원 포인트",
            value: `${refund.restored_point.toLocaleString()}P`,
            emphasis: "positive",
          },
          {
            label: "쿠폰",
            value:
              refund.coupon_status === "RESTORED"
                ? "복원 완료"
                : refund.coupon_status === "EXPIRED"
                  ? "만료로 복원되지 않음"
                  : refund.coupon_status === "USED"
                    ? "남은 주문에 사용 중"
                    : "사용하지 않음",
          },
        ]}
        totalLabel={refund.bank_refund ? "PG 취소액" : "실제 환불액"}
        total={formatPrice(refund.cash_refund_amount)}
        footer={
          <p className="text-xs text-content-secondary">
            {new Date(refund.completed_at).toLocaleString("ko-KR")}{" "}
            {refund.bank_refund
              ? "결제 취소 처리 · 실제 계좌 입금 상태는 별도로 확인해주세요."
              : "처리 완료"}
          </p>
        }
      />
    </div>
  );
}
