import { describe, expect, it, vi } from "vitest";
import type { OrderResponse } from "../types";
import {
  CheckoutOrderStateError,
  estimatedCouponDiscount,
  maxApplicablePoints,
  normalizeRequestedPoints,
  safeHostedCheckoutURL,
  shouldDiscardCheckoutRestoreStatus,
  submitServerAuthoritativeCheckout,
} from "./checkout";

const serverOrder: OrderResponse = {
  id: 1,
  order_code: "ORDER-1",
  total_order_price: 50000,
  total_discount_price: 7000,
  used_point: 3000,
  status: "PAYMENT_PENDING",
};

function hostedCheckout(orderCode = "ORDER-1", amount = 40000, checkoutURL = "https://pay.example.test/checkout/1") {
  return {
    order_code: orderCode,
    checkout_url: checkoutURL,
    amount,
  };
}

describe("submitServerAuthoritativeCheckout", () => {
  it("reuses the created order and always requests checkout for the server-confirmed amount", async () => {
    const placeOrder = vi.fn().mockResolvedValue({ orderCode: "ORDER-1" });
    const getOrder = vi.fn().mockResolvedValue(serverOrder);
    const createPaymentCheckout = vi.fn()
      .mockRejectedValueOnce(new Error("checkout failed"))
      .mockResolvedValueOnce(hostedCheckout());
    let createdOrderCode: string | undefined;
    const common = {
      orderInput: { cart_item_ids: [11], used_coupon_id: 99, used_point: 3000 },
      placeOrder,
      getOrder,
      createPaymentCheckout,
      onOrderCreated: (code: string) => { createdOrderCode = code; },
      onOrderConfirmed: vi.fn(),
    };

    await expect(submitServerAuthoritativeCheckout(common)).rejects.toThrow("checkout failed");
    await expect(submitServerAuthoritativeCheckout({
      ...common,
      existingOrderCode: createdOrderCode,
    })).resolves.toMatchObject({
      orderCode: "ORDER-1",
      amount: 40000,
      checkoutUrl: "https://pay.example.test/checkout/1",
    });

    expect(placeOrder).toHaveBeenCalledTimes(1);
    expect(getOrder).toHaveBeenCalledTimes(2);
    expect(createPaymentCheckout).toHaveBeenCalledTimes(2);
    expect(createPaymentCheckout).toHaveBeenNthCalledWith(1, "ORDER-1");
    expect(createPaymentCheckout).toHaveBeenNthCalledWith(2, "ORDER-1");
  });

  it("does not create a hosted checkout when the server-confirmed amount is zero", async () => {
    const createPaymentCheckout = vi.fn();

    await expect(submitServerAuthoritativeCheckout({
      existingOrderCode: "ORDER-FREE",
      orderInput: { cart_item_ids: [11], used_point: 0 },
      placeOrder: vi.fn(),
      getOrder: vi.fn().mockResolvedValue({
        ...serverOrder,
        order_code: "ORDER-FREE",
        total_order_price: 5000,
        total_discount_price: 5000,
      }),
      createPaymentCheckout,
      onOrderCreated: vi.fn(),
      onOrderConfirmed: vi.fn(),
    })).rejects.toThrow("0원 이하 주문");

    expect(createPaymentCheckout).not.toHaveBeenCalled();
  });

  it("does not request another checkout when a retry observes an already paid order", async () => {
    const createPaymentCheckout = vi.fn();

    await expect(submitServerAuthoritativeCheckout({
      existingOrderCode: "ORDER-1",
      orderInput: { cart_item_ids: [11], used_point: 0 },
      placeOrder: vi.fn(),
      getOrder: vi.fn().mockResolvedValue({ ...serverOrder, status: "PAID" }),
      createPaymentCheckout,
      onOrderCreated: vi.fn(),
      onOrderConfirmed: vi.fn(),
    })).resolves.toMatchObject({ orderCode: "ORDER-1", paymentSkipped: true });

    expect(createPaymentCheckout).not.toHaveBeenCalled();
  });

  it("rejects mismatched order and hosted checkout responses before navigation", async () => {
    const createPaymentCheckout = vi.fn();

    await expect(submitServerAuthoritativeCheckout({
      existingOrderCode: "ORDER-1",
      orderInput: { cart_item_ids: [11], used_point: 0 },
      placeOrder: vi.fn(),
      getOrder: vi.fn().mockResolvedValue({ ...serverOrder, order_code: "ORDER-2" }),
      createPaymentCheckout,
      onOrderCreated: vi.fn(),
      onOrderConfirmed: vi.fn(),
    })).rejects.toBeInstanceOf(CheckoutOrderStateError);
    expect(createPaymentCheckout).not.toHaveBeenCalled();

    await expect(submitServerAuthoritativeCheckout({
      existingOrderCode: "ORDER-1",
      orderInput: { cart_item_ids: [11], used_point: 0 },
      placeOrder: vi.fn(),
      getOrder: vi.fn().mockResolvedValue(serverOrder),
      createPaymentCheckout: vi.fn().mockResolvedValue(hostedCheckout("ORDER-2")),
      onOrderCreated: vi.fn(),
      onOrderConfirmed: vi.fn(),
    })).rejects.toThrow("주문 코드");

    await expect(submitServerAuthoritativeCheckout({
      existingOrderCode: "ORDER-1",
      orderInput: { cart_item_ids: [11], used_point: 0 },
      placeOrder: vi.fn(),
      getOrder: vi.fn().mockResolvedValue(serverOrder),
      createPaymentCheckout: vi.fn().mockResolvedValue(hostedCheckout("ORDER-1", 39999)),
      onOrderCreated: vi.fn(),
      onOrderConfirmed: vi.fn(),
    })).rejects.toThrow("금액");
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,boom",
    "https://user:secret@pay.example.test/checkout",
    "/relative-checkout",
  ])("blocks unsafe hosted checkout URL %s", (url) => {
    expect(() => safeHostedCheckoutURL(url)).toThrow(CheckoutOrderStateError);
  });
});

describe("checkout discount boundaries", () => {
  const amountCoupon = {
    id: 1,
    code: "AMOUNT",
    name: "금액 쿠폰",
    discount_type: "AMOUNT",
    discount_value: 7000,
    discount_amount: 7000,
    max_discount: 0,
    min_order_amount: 20000,
    status: "ACTIVE",
  };

  it("disables discount below the minimum and preserves at least one won after points", () => {
    expect(estimatedCouponDiscount(amountCoupon, 19999)).toBe(0);
    expect(estimatedCouponDiscount(amountCoupon, 20000)).toBe(7000);
    expect(maxApplicablePoints(20000, 7000, 50000)).toBe(12999);
  });

  it("caps percentage coupons and never discounts beyond the order total", () => {
    expect(estimatedCouponDiscount({
      ...amountCoupon,
      discount_type: "PERCENT",
      discount_value: 50,
      max_discount: 3000,
      min_order_amount: 0,
    }, 10000)).toBe(3000);
    expect(estimatedCouponDiscount({
      ...amountCoupon,
      discount_value: 50000,
      min_order_amount: 0,
    }, 10000)).toBe(10000);
  });

  it("normalizes point input to a nonnegative safe integer", () => {
    expect(normalizeRequestedPoints(12.9)).toBe(12);
    expect(normalizeRequestedPoints(-1)).toBe(0);
    expect(normalizeRequestedPoints(Number.NaN)).toBe(0);
    expect(normalizeRequestedPoints(Number.POSITIVE_INFINITY)).toBe(0);
    expect(normalizeRequestedPoints(Number.MAX_VALUE)).toBe(0);
  });

  it("discards permanent restore errors but preserves temporary failures", () => {
    expect(shouldDiscardCheckoutRestoreStatus(400)).toBe(true);
    expect(shouldDiscardCheckoutRestoreStatus(404)).toBe(true);
    expect(shouldDiscardCheckoutRestoreStatus(422)).toBe(true);
    expect(shouldDiscardCheckoutRestoreStatus(401)).toBe(false);
    expect(shouldDiscardCheckoutRestoreStatus(408)).toBe(false);
    expect(shouldDiscardCheckoutRestoreStatus(429)).toBe(false);
    expect(shouldDiscardCheckoutRestoreStatus(500)).toBe(false);
  });
});
