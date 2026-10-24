import { describe, expect, it } from "vitest";
import { orderQuoteSchema } from "./checkout-contracts";

const quote = {
  product_total: 30_000, discount_total: 3_000, used_point: 1_000,
  shipping_fee: 0, payment_amount: 26_000,
  line_items: [{ cart_item_id: 1, unit_price: 15_000, line_total: 30_000 }],
};

describe("server checkout amount contract", () => {
  it("accepts a consistent server amount", () => {
    expect(orderQuoteSchema.parse(quote)).toEqual(quote);
  });
  it.each([
    { ...quote, payment_amount: 30_000 },
    { ...quote, product_total: 40_000, payment_amount: 36_000 },
    { ...quote, line_items: [{ cart_item_id: 1, unit_price: 15_000, line_total: 15_000 }, { cart_item_id: 1, unit_price: 15_000, line_total: 15_000 }] },
  ])("rejects inconsistent amounts or repeated cart rows", (invalid) => {
    expect(orderQuoteSchema.safeParse(invalid).success).toBe(false);
  });
});
