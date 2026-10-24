import { afterEach, expect, it, vi } from "vitest";
import { returnedRequest } from "@/test/returns-fixture";
import {
  returnsApi,
  returnableQuantity,
  inspectionRequestSchema,
  hasActiveReturnForLine,
  returnInspectionProgress,
  type ReturnCollection,
} from "./returns-api";
afterEach(() => vi.unstubAllGlobals());

it("validates and preserves the pickup snapshot across request creation and response parsing", async () => {
  const pickup = { recipient_name: "구매자", phone: "01012345678", postal_code: "12345", address: "선택한 주소", address_detail: "101호" };
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: { ...returnedRequest(), pickup } }), { status: 200 }));
  vi.stubGlobal("fetch", fetch);
  const response = await returnsApi.create("buyer", "ORD-3", { market_id: 7, items: [{ order_line_item_id: 9, quantity: 1, reason: "CHANGE_OF_MIND" }], pickup });
  expect(response.pickup).toEqual(pickup);
  expect(JSON.parse(fetch.mock.calls[0][1].body).pickup).toEqual(pickup);
  expect(() => returnsApi.create("buyer", "ORD-3", { market_id: 7, items: [{ order_line_item_id: 9, quantity: 1, reason: "CHANGE_OF_MIND" }], pickup: { ...pickup, postal_code: "1234" } })).toThrow();
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("waits for every bundled item, excludes withdrawn requests, and does not assume unknown items are inspected", () => {
  const first = returnedRequest();
  const second = {
    ...returnedRequest(),
    id: 13,
    items: [
      { ...first.items[0], id: 11, responsibility: "UNDETERMINED" as const },
    ],
  };
  const collection = {
    id: 1,
    order_id: 3,
    market_id: 7,
    status: "RECEIVED",
    pickup: {
      recipient_name: "수령인",
      phone: "01012345678",
      postal_code: "12345",
      address: "주소",
      address_detail: "",
    },
    destination: {
      recipient_name: "수령인",
      phone: "01012345678",
      postal_code: "12345",
      address: "주소",
      address_detail: "",
    },
    carrier: "CJ",
    tracking_number: "R-1",
    collected_at: null,
    items: [
      { id: 1, return_collection_id: 1, refund_item_id: 10, quantity: 2 },
      { id: 2, return_collection_id: 1, refund_item_id: 11, quantity: 2 },
    ],
  } satisfies ReturnCollection;
  expect(returnInspectionProgress([first, second], [collection])).toEqual({
    completed: 1,
    total: 2,
    ready: false,
  });
  expect(returnInspectionProgress([first], [collection])).toEqual({
    completed: 1,
    total: 2,
    ready: false,
  });
  expect(
    returnInspectionProgress(
      [first, { ...second, status: "WITHDRAWN" }],
      [collection],
    ),
  ).toEqual({ completed: 1, total: 1, ready: true });
  expect(
    returnInspectionProgress(
      [
        first,
        { ...second, items: [{ ...second.items[0], responsibility: "BUYER" }] },
      ],
      [collection],
    ),
  ).toEqual({ completed: 2, total: 2, ready: true });
  expect(returnInspectionProgress([first], [])).toEqual({
    completed: 0,
    total: 0,
    ready: false,
  });
});

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
it("only blocks purchase confirmation while a return still reserves that product", () => {
  const request = returnedRequest();
  expect(hasActiveReturnForLine(9, [request])).toBe(true);
  expect(hasActiveReturnForLine(99, [request])).toBe(false);
  expect(hasActiveReturnForLine(9, [{ ...request, status: "COMPLETED" }])).toBe(
    false,
  );
  expect(hasActiveReturnForLine(9, [{ ...request, status: "WITHDRAWN" }])).toBe(
    false,
  );
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
