import { afterEach, expect, it, vi } from "vitest";
import { shippingPolicyApi } from "./shipping-policy-api";

afterEach(() => vi.unstubAllGlobals());

it("rejects unsupported base fees before issuing a network request", () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  expect(() => shippingPolicyApi.update("seller", { market_id: 7, shipping_fee: 1000, additional_shipping_fee: 0, additional_shipping_fee_reason: "NONE" })).toThrow();
  expect(fetchMock).not.toHaveBeenCalled();
});

it("sends an explicit confirmation when withdrawing a refund", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({success:true,data:{withdrawn:true}}),{status:200}));
  vi.stubGlobal("fetch",fetchMock);
  await expect(shippingPolicyApi.withdrawRefund("admin","ORD-1")).resolves.toEqual({withdrawn:true});
  expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/admin/orders/ORD-1/refund/withdraw");
  expect(fetchMock.mock.calls[0][1]).toMatchObject({method:"POST",body:JSON.stringify({confirm_no_refund:true})});
});
