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

it("accepts only explicit null as an unconfigured shipping settings response", async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: null })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: {} })));
  vi.stubGlobal("fetch", fetchMock);
  await expect(shippingPolicyApi.settings("seller", 7)).resolves.toBeNull();
  await expect(shippingPolicyApi.settings("seller", 7)).rejects.toMatchObject({ kind: "contract" });
});

it("preserves existing free shipping in the API response", async () => {
  const settings = { market_id: 7, shipping_fee: 0, return_shipping_fee: 3000, additional_shipping_fee: 0, additional_shipping_fee_reason: "NONE" };
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: settings }))));
  await expect(shippingPolicyApi.settings("seller", 7)).resolves.toEqual(settings);
});

it.each([401, 403, 500])("preserves a %i settings failure rather than returning null", async (status) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, error: { code: "SETTINGS_ERROR", message: "조회 실패", request_id: "test-request" } }), { status })));
  await expect(shippingPolicyApi.settings("seller", 7)).rejects.toMatchObject({ kind: "http", status, code: "SETTINGS_ERROR" });
});
