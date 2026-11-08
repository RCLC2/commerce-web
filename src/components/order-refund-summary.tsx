"use client";

import { useEffect, useRef } from "react";
import type { OrderResponse } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { OrderSummary, type OrderSummaryItem } from "./ui/order-summary";

export function refundShippingItems(
  refund: Pick<
    NonNullable<OrderResponse["refund"]>,
    | "retained_shipping_fee"
    | "outbound_shipping_fee_deduction"
    | "return_shipping_fee"
    | "shipping_fee_waived_amount"
    | "shipping_refund_amount"
  >,
  originalShippingFeeRetained?: number,
): OrderSummaryItem[] {
  const {
    outbound_shipping_fee_deduction: outbound,
    return_shipping_fee: pickup,
    shipping_fee_waived_amount: waived,
    shipping_refund_amount: refunded,
  } = refund;
  if (
    outbound === undefined ||
    pickup === undefined ||
    waived === undefined ||
    refunded === undefined ||
    waived > outbound + pickup ||
    refund.retained_shipping_fee < outbound + pickup - waived
  ) {
    return [
      {
        label: "유지·차감된 배송비 합계",
        value: formatPrice(refund.retained_shipping_fee),
      },
    ];
  }
  // Request quotes only include new deductions in retained_shipping_fee.
  // Order summaries already include the original paid shipping in that total.
  const originalRetained = originalShippingFeeRetained ??
    (refund.retained_shipping_fee - (outbound + pickup - waived));
  const rows: OrderSummaryItem[] = [];
  if (originalRetained > 0)
    rows.push({
      label: "최초 배송비 환불 제외",
      value: formatPrice(originalRetained),
    });
  if (outbound > 0)
    rows.push({ label: "무료배송 발송비 차감", value: formatPrice(outbound) });
  if (pickup > 0)
    rows.push({ label: "반품 회수비 차감", value: formatPrice(pickup) });
  if (waived > 0)
    rows.push({
      label: "반품비 초과액 면제",
      value: `-${formatPrice(waived)}`,
      emphasis: "positive",
    });
  if (refunded > 0)
    rows.push({
      label: "최초 배송비 환불",
      value: formatPrice(refunded),
      emphasis: "positive",
    });
  return rows.length ? rows : [{ label: "배송비 부담", value: "없음" }];
}

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
          ...refundShippingItems(refund),
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
        totalLabel={refund.bank_refund ? "결제 취소 금액" : "결제수단 환불액 합계"}
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
