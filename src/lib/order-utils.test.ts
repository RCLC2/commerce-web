import { describe, expect, it } from "vitest";
import { orderPaymentAmount, orderShippingFee } from "./order-utils";

describe("persisted order amounts", () => {
  it("includes each market's persisted fee after coupons and points", () => {
    const order = { total_order_price: 30000, total_discount_price: 6000, used_point: 6000, market_orders: [{ shipping_fee: 3000 }, { shipping_fee: 2000 }] };
    expect(orderShippingFee(order)).toBe(5000);
    expect(orderPaymentAmount(order)).toBe(23000);
  });
  it("keeps legacy free orders without market data readable", () => {
    expect(orderPaymentAmount({ total_order_price: 5000, total_discount_price: 1000, used_point: 1000 })).toBe(3000);
  });
});
