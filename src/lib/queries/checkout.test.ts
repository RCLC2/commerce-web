import { describe, expect, it, vi } from "vitest";
import type { OrderResponse } from "../types";
import { CheckoutOrderStateError, submitServerAuthoritativeCheckout } from "./checkout";

const serverOrder: OrderResponse = {
  id: 1,
  order_code: "ORDER-1",
  total_order_price: 50000,
  total_discount_price: 7000,
  used_point: 3000,
  status: "PAYMENT_PENDING",
};

describe("submitServerAuthoritativeCheckout", () => {
  it("reuses the created order and always pays the server-confirmed amount", async () => {
    const placeOrder = vi.fn().mockResolvedValue({ orderCode: "ORDER-1" });
    const getOrder = vi.fn().mockResolvedValue(serverOrder);
    const completePayment = vi.fn()
      .mockRejectedValueOnce(new Error("payment failed"))
      .mockResolvedValueOnce(undefined);
    let createdOrderCode: string | undefined;
    const common = {
      orderInput: { cart_item_ids: [11], used_coupon_id: 99, used_point: 3000 },
      placeOrder,
      getOrder,
      completePayment,
      onOrderCreated: (code: string) => { createdOrderCode = code; },
      onOrderConfirmed: vi.fn(),
    };

    await expect(submitServerAuthoritativeCheckout(common)).rejects.toThrow("payment failed");
    await submitServerAuthoritativeCheckout({ ...common, existingOrderCode: createdOrderCode });

    expect(placeOrder).toHaveBeenCalledTimes(1);
    expect(getOrder).toHaveBeenCalledTimes(2);
    expect(completePayment).toHaveBeenCalledTimes(2);
    expect(completePayment).toHaveBeenNthCalledWith(1, "ORDER-1", 40000);
    expect(completePayment).toHaveBeenNthCalledWith(2, "ORDER-1", 40000);
  });

  it("does not call payment when the server-confirmed amount is zero", async () => {
    const completePayment = vi.fn();

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
      completePayment,
      onOrderCreated: vi.fn(),
      onOrderConfirmed: vi.fn(),
    })).rejects.toThrow("0원 이하 주문");

    expect(completePayment).not.toHaveBeenCalled();
  });

  it("does not pay again when a retry observes an already paid order", async () => {
    const completePayment = vi.fn();

    await expect(submitServerAuthoritativeCheckout({
      existingOrderCode: "ORDER-1",
      orderInput: { cart_item_ids: [11], used_point: 0 },
      placeOrder: vi.fn(),
      getOrder: vi.fn().mockResolvedValue({ ...serverOrder, status: "PAID" }),
      completePayment,
      onOrderCreated: vi.fn(),
      onOrderConfirmed: vi.fn(),
    })).resolves.toMatchObject({ orderCode: "ORDER-1", paymentSkipped: true });

    expect(completePayment).not.toHaveBeenCalled();
  });

  it("rejects a mismatched order response before payment", async () => {
    const completePayment = vi.fn();

    await expect(submitServerAuthoritativeCheckout({
      existingOrderCode: "ORDER-1",
      orderInput: { cart_item_ids: [11], used_point: 0 },
      placeOrder: vi.fn(),
      getOrder: vi.fn().mockResolvedValue({ ...serverOrder, order_code: "ORDER-2" }),
      completePayment,
      onOrderCreated: vi.fn(),
      onOrderConfirmed: vi.fn(),
    })).rejects.toBeInstanceOf(CheckoutOrderStateError);

    expect(completePayment).not.toHaveBeenCalled();
  });
});
