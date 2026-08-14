import { describe, expect, it } from "vitest";
import { parseTossSuccessParams } from "./toss-payment";

describe("parseTossSuccessParams", () => {
  it("accepts the strict Toss success query contract", () => {
    expect(parseTossSuccessParams(new URLSearchParams({
      paymentKey: "pay_key-1",
      orderId: "ORD-12345",
      amount: "12000",
    }))).toEqual({
      ok: true,
      value: { paymentKey: "pay_key-1", orderId: "ORD-12345", amount: 12000 },
    });
  });

  it.each([
    { paymentKey: "", orderId: "ORD-12345", amount: "12000" },
    { paymentKey: "pay_key-1", orderId: "ORD", amount: "12000" },
    { paymentKey: "pay_key-1", orderId: "ORD-12345", amount: "1e3" },
    { paymentKey: "pay_key-1", orderId: "ORD-12345", amount: "0" },
  ])("rejects malformed success query %#", (query) => {
    expect(parseTossSuccessParams(new URLSearchParams(query))).toMatchObject({ ok: false });
  });
});
