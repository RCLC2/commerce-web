import { afterEach, describe, expect, it, vi } from "vitest";
import { adminApi } from "./admin";
import { customerApi } from "./customer";
import { sellerApi } from "./seller";

afterEach(() => vi.unstubAllGlobals());

describe("command route regressions", () => {
  it("issues an admin coupon with the member_id body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: "issued", coupon_id: 7, member_id: 11,
    }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await adminApi.issueCouponToMember("token", 7, 11);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/admin/coupons/7/issue");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ member_id: 11 });
  });

  it("keeps seller impersonation on the real admin endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      access_token: "seller-token", token_type: "Bearer", expires_at: "2026-07-27",
      market_id: 3, market_name: "마켓", issued_for: "admin",
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await adminApi.createSellerImpersonationToken("token", 3);

    expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/admin/markets/3/impersonation-token");
  });

  it("keeps fulfillment source mutations under /fulfillment", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await sellerApi.deactivateInventorySource("token", 9);

    expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/fulfillment/sources/9");
    expect(fetchMock.mock.calls[0][1].method).toBe("DELETE");
  });

  it("registers seller invoices with one request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await sellerApi.registerSellerInvoices("token", {
      market_id: 4,
      invoices: [{ order_id: 15, carrier: "CJ", invoice_number: "123" }],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/seller/deliveries/invoices");
  });

  it("accepts successful empty command responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(customerApi.addWishlist("token", 7)).resolves.toBeUndefined();
    await expect(sellerApi.retryInventorySyncLog("token", 9)).resolves.toBeUndefined();
    await expect(adminApi.createCarousel("token", { title: "배너" })).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
