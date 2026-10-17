import { afterEach, expect, it, vi } from "vitest";
import { returnedRequest } from "@/test/returns-fixture";
import {
  returnsApi,
  returnableQuantity,
  inspectionRequestSchema,
} from "./returns-api";
afterEach(() => vi.unstubAllGlobals());

it("reserves requested quantities until completion and then releases unapproved quantities", () => {
  const line = {
    id: 9,
    name: "셔츠",
    quantity: 3,
    price: 10000,
    status: "DELIVERED",
  };
  const request = returnedRequest();
  expect(returnableQuantity(line, [request])).toBe(1);
  expect(returnableQuantity(line, [{ ...request, status: "COMPLETED" }])).toBe(
    2,
  );
  expect(returnableQuantity(line, [{ ...request, status: "WITHDRAWN" }])).toBe(
    3,
  );
  expect(returnableQuantity({ ...line, status: "COMPLETED" }, [])).toBe(0);
});
it("validates inspection quantities before sending them", () => {
  expect(
    inspectionRequestSchema.safeParse({
      received_quantity: 1,
      refundable_quantity: 2,
      restockable_quantity: 0,
      result_code: "NORMAL",
      responsibility: "BUYER",
    }).success,
  ).toBe(false);
});
it("executes one refund ID with the new contract and no receipt checkbox shortcut", async () => {
  const payload = {
    refund_id: 12,
    cash_refund_amount: 10000,
    retained_shipping_fee: 0,
    restored_point: 0,
    reason: "",
    shipping_refund_amount: 0,
    outbound_shipping_fee_deduction: 0,
    return_shipping_fee: 0,
    shipping_fee_waived_amount: 0,
    completed: true,
  };
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: payload })),
    );
  vi.stubGlobal("fetch", fetchMock);
  await returnsApi.execute("admin", 12);
  expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/refunds/12/execute");
  expect(fetchMock.mock.calls[0][1]).toMatchObject({
    method: "POST",
    body: "{}",
  });
});
it("withdraws the selected request rather than the whole order", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, data: { withdrawn: true } }),
      ),
    );
  vi.stubGlobal("fetch", fetchMock);
  await returnsApi.withdraw("admin", 12);
  expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/refunds/12/withdraw");
});
it("accepts a persisted request with empty or missing collection lists", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: null })),
    );
  vi.stubGlobal("fetch", fetchMock);
  await expect(returnsApi.collections("seller", "ORD/a")).resolves.toEqual([]);
  expect(fetchMock.mock.calls[0][0]).toContain("ORD%2Fa/return-collections");
});
