import { describe, expect, it, vi } from "vitest";
import { ApiHttpError } from "../api-client";
import type { OrderResponse } from "../types";
import {
  cartBoundCouponID,
  CheckoutOrderStateError,
  estimatedCouponDiscount,
  findUniqueOrderByCartItemIDs,
  maxApplicablePoints,
  normalizeRequestedPoints,
  pendingCheckoutInput,
  readCheckoutRetryState,
  safeHostedCheckoutURL,
  saveCheckoutRetryState,
  clearCheckoutRetryState,
  selectedCartItemIDs,
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

describe("selectedCartItemIDs", () => {
  it("distinguishes an absent selection from a filtered valid selection", () => {
    expect(selectedCartItemIDs(null)).toBeNull();
    expect([...selectedCartItemIDs("11,22,22,0,nope")!]).toEqual([11, 22]);
    expect(selectedCartItemIDs("")).toEqual(new Set());
  });
});

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
      checkoutMode: "external",
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

  it("recovers a committed order after the create response is lost", async () => {
    const recoveredOrder = {
      ...serverOrder,
      market_orders: [{
        id: 1,
        market_id: 1,
        shipping_fee: 0,
        status: "PAYMENT_PENDING",
        expected_settlement_amount: 40000,
        line_items: [{
          id: 3,
          cart_id: 11,
          product_id: 7,
          option_id: 2,
          quantity: 1,
          price: 50000,
          status: "PAYMENT_PENDING",
        }],
      }],
    } satisfies OrderResponse;
    const onOrderAttempt = vi.fn();
    const onOrderCreated = vi.fn();

    await expect(submitServerAuthoritativeCheckout({
      orderInput: { cart_item_ids: [11], used_point: 0 },
      placeOrder: vi.fn().mockRejectedValue(new Error("connection reset")),
      recoverCreatedOrder: vi.fn().mockResolvedValue(recoveredOrder),
      getOrder: vi.fn().mockResolvedValue(recoveredOrder),
      createPaymentCheckout: vi.fn().mockResolvedValue(hostedCheckout()),
      onOrderAttempt,
      onOrderCreated,
      onOrderConfirmed: vi.fn(),
    })).resolves.toMatchObject({ orderCode: "ORDER-1" });

    expect(onOrderAttempt).toHaveBeenCalledBefore(onOrderCreated);
    expect(onOrderCreated).toHaveBeenCalledWith("ORDER-1");
  });

  it("does not start order creation when the recovery clue cannot be persisted", async () => {
    const placeOrder = vi.fn();

    await expect(submitServerAuthoritativeCheckout({
      orderInput: { cart_item_ids: [11], used_point: 0 },
      placeOrder,
      getOrder: vi.fn(),
      createPaymentCheckout: vi.fn(),
      onOrderAttempt: () => { throw new Error("storage blocked"); },
      onOrderCreated: vi.fn(),
      onOrderConfirmed: vi.fn(),
    })).rejects.toThrow("storage blocked");

    expect(placeOrder).not.toHaveBeenCalled();
  });

  it("releases a pending attempt after a definitive client rejection", async () => {
    await expect(submitServerAuthoritativeCheckout({
      orderInput: { cart_item_ids: [11], used_point: 0 },
      placeOrder: vi.fn().mockRejectedValue(new ApiHttpError("invalid coupon", 422)),
      recoverCreatedOrder: vi.fn().mockResolvedValue(undefined),
      getOrder: vi.fn(),
      createPaymentCheckout: vi.fn(),
      onOrderCreated: vi.fn(),
      onOrderConfirmed: vi.fn(),
    })).rejects.toMatchObject({ discardOrder: true });
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
    "http://pay.example.test/checkout",
    "/relative-checkout",
  ])("blocks unsafe hosted checkout URL %s", (url) => {
    expect(() => safeHostedCheckoutURL(url)).toThrow(CheckoutOrderStateError);
  });

  it.each([
    "http://localhost:8090/mock-checkout/ORDER-1",
    "http://127.0.0.1:8090/mock-checkout/ORDER-1",
    "http://[::1]:8090/mock-checkout/ORDER-1",
  ])("accepts an explicit loopback mock URL %s", async (checkoutURL) => {
    await expect(submitServerAuthoritativeCheckout({
      existingOrderCode: "ORDER-1",
      orderInput: { cart_item_ids: [11], used_point: 0 },
      placeOrder: vi.fn(),
      getOrder: vi.fn().mockResolvedValue(serverOrder),
      createPaymentCheckout: vi.fn().mockResolvedValue(hostedCheckout(
        "ORDER-1",
        40000,
        checkoutURL,
      )),
      onOrderCreated: vi.fn(),
      onOrderConfirmed: vi.fn(),
    })).resolves.toMatchObject({
      checkoutMode: "loopback-mock",
    });
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

  it("keeps a coupon across an unchanged structural-shared cart refetch", () => {
    const cartSnapshot = [{ id: 1, quantity: 1 }];
    const selection = { id: 7, cartSnapshot };

    expect(cartBoundCouponID(undefined, undefined)).toBeUndefined();
    expect(cartBoundCouponID(selection, cartSnapshot)).toBe(7);
    expect(cartBoundCouponID(selection, [{ id: 1, quantity: 2 }])).toBeUndefined();
    expect(cartBoundCouponID(selection, [{ id: 1, quantity: 1 }])).toBeUndefined();
  });
});

describe("checkout retry storage", () => {
  it("degrades safely when browser storage access is blocked", () => {
    const blockedStorage = () => {
      throw new DOMException("blocked", "SecurityError");
    };

    expect(readCheckoutRetryState(blockedStorage)).toBeNull();
    expect(saveCheckoutRetryState(blockedStorage, {
      memberID: 1,
      orderCode: "ORDER-1",
    })).toBe(false);
    expect(clearCheckoutRetryState(blockedStorage)).toBe(false);
  });

  it("round-trips a retry state through the storage seam", () => {
    let stored: string | null = null;
    const storage = () => ({
      getItem: () => stored,
      setItem: (_key: string, value: string) => { stored = value; },
      removeItem: () => { stored = null; },
    });

    expect(saveCheckoutRetryState(storage, {
      memberID: 1,
      orderCode: "ORDER-1",
    })).toBe(true);
    expect(readCheckoutRetryState(storage)).toEqual({
      memberID: 1,
      orderCode: "ORDER-1",
    });
    expect(clearCheckoutRetryState(storage)).toBe(true);
    expect(readCheckoutRetryState(storage)).toBeNull();
  });

  it("validates a member-scoped pending checkout attempt", () => {
    expect(pendingCheckoutInput({
      memberID: 7,
      cartItemIDs: [11, 12],
      usedCouponID: 4,
      usedPoint: 300,
    }, 7)).toEqual({ cart_item_ids: [11, 12], used_coupon_id: 4, used_point: 300 });
    expect(pendingCheckoutInput({ memberID: 8, cartItemIDs: [11] }, 7)).toBeUndefined();
    expect(pendingCheckoutInput({ memberID: 7, cartItemIDs: [11, "bad"] }, 7)).toBeUndefined();
    expect(pendingCheckoutInput({ memberID: 7, cartItemIDs: [11, 11] }, 7)).toBeUndefined();
  });

  it("finds only an exact unique order for the attempted cart IDs", () => {
    const order = {
      ...serverOrder,
      market_orders: [{
        id: 1,
        market_id: 1,
        shipping_fee: 0,
        status: "PAYMENT_PENDING",
        expected_settlement_amount: 40000,
        line_items: [
          { id: 1, cart_id: 11, product_id: 1, option_id: 1, quantity: 1, price: 20000, status: "PLACED" },
          { id: 2, cart_id: 12, product_id: 2, option_id: 2, quantity: 1, price: 30000, status: "PLACED" },
        ],
      }],
    } satisfies OrderResponse;

    expect(findUniqueOrderByCartItemIDs([order], [12, 11])).toBe(order);
    expect(findUniqueOrderByCartItemIDs([order], [11])).toBeUndefined();
    expect(findUniqueOrderByCartItemIDs([order, { ...order, id: 2 }], [11, 12])).toBeUndefined();
    expect(findUniqueOrderByCartItemIDs([{
      ...order,
      market_orders: [{
        ...order.market_orders![0],
        line_items: order.market_orders![0].line_items.map((item) => ({ ...item, cart_id: 11 })),
      }],
    }], [11, 12])).toBeUndefined();
  });
});
