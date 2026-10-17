import { afterEach, expect, it, vi } from "vitest";
import { shippingPolicyApi } from "./shipping-policy-api";

afterEach(() => vi.unstubAllGlobals());

it("rejects unsupported base fees before issuing a network request", () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  expect(() =>
    shippingPolicyApi.update("seller", {
      market_id: 7,
      shipping_fee: 1000,
      additional_shipping_fee: 0,
      additional_shipping_fee_reason: "NONE",
    }),
  ).toThrow();
  expect(fetchMock).not.toHaveBeenCalled();
});
