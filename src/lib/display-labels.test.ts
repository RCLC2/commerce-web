import { describe, expect, it } from "vitest";
import { displayLabel, paymentMethodLabel, orderPaymentMethodLabel, shippingTypeLabel } from "./display-labels";
import { orderStatusLabel } from "./order-utils";

describe("display labels", () => {
  it("shows approved payment details and preserves the legacy provider fallback", () => {
    expect(orderPaymentMethodLabel("toss", {method:"간편결제",easy_pay_provider:"카카오페이"})).toBe("카카오페이");
    expect(orderPaymentMethodLabel("toss", {method:"카드"})).toBe("카드");
    expect(orderPaymentMethodLabel("toss")).toBe("토스페이먼츠");
  });
  it("keeps unknown operator-defined codes intact", () => {
    expect(displayLabel("experiment_custom_a")).toBe("experiment_custom_a");
    expect(paymentMethodLabel(undefined)).toBe("결제 수단 미확인");
  });
  it("labels payment and return states in Korean", () => {
    expect(orderStatusLabel("PAID")).toBe("결제 완료");
    expect(orderStatusLabel("RETURN_REQUESTED")).toBe("반품 요청");
    expect(paymentMethodLabel("CARD")).toBe("카드");
    expect(shippingTypeLabel("NORMAL")).toBe("일반 배송");
    expect(shippingTypeLabel("FREE")).toBe("무료 배송");
  });
});
