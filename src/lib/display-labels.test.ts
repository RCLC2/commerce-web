import { describe, expect, it } from "vitest";
import { displayLabel, paymentMethodLabel } from "./display-labels";
import { orderStatusLabel } from "./order-utils";

describe("display labels", () => {
  it("keeps unknown operator-defined codes intact", () => {
    expect(displayLabel("experiment_custom_a")).toBe("experiment_custom_a");
    expect(paymentMethodLabel(undefined)).toBe("결제 수단 미확인");
  });
  it("labels payment and return states in Korean", () => {
    expect(orderStatusLabel("PAID")).toBe("결제 완료");
    expect(orderStatusLabel("RETURN_REQUESTED")).toBe("반품 요청");
    expect(paymentMethodLabel("CARD")).toBe("카드");
  });
});
