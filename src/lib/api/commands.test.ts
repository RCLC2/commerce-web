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

describe("coupon response regressions", () => {
  const coupon = {
    ID: 7,
    Code: "WELCOME10",
    Name: "신규 회원 10% 쿠폰",
    DiscountType: "PERCENT",
    DiscountValue: 10,
    MaxDiscount: 5000,
    MinOrderAmount: 10000,
    ExpiresAt: null,
    Status: "ACTIVE",
  };

  it("routes each customer coupon response through its endpoint adapter", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([coupon]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{
        coupon,
        max_discount: 5000,
        discount_amount: 3000,
        platform_coupon_amount: 2250,
        market_coupon_amount: 750,
        market_coupon_rate: 25,
        discounted_amount: 27000,
      }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{
        ID: 11,
        UserID: 12,
        CouponID: 7,
        ExpiresAt: "2099-07-27T00:00:00Z",
        OrderID: null,
        UsedAt: null,
        CreatedAt: "2026-07-26T00:00:00Z",
        Coupon: coupon,
      }]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(customerApi.listIssuableCoupons("token")).resolves.toMatchObject([
      { id: 7, name: "신규 회원 10% 쿠폰", expires_at: undefined },
    ]);
    await expect(customerApi.listIssuableCouponQuotes("token", 30000)).resolves.toMatchObject([
      { coupon: { id: 7 }, discount_amount: 3000, market_coupon_amount: 750 },
    ]);
    await expect(customerApi.listCoupons("token")).resolves.toMatchObject([
      { id: 11, coupon_id: 7, status: "AVAILABLE", coupon: { id: 7 } },
    ]);

    const requestedPaths = fetchMock.mock.calls.map((call) => {
      const url = new URL(String(call[0]), "http://local.test");
      return `${url.pathname}${url.search}`;
    });
    expect(requestedPaths).toEqual([
      "/api/v1/coupons/issuable",
      "/api/v1/coupons/issuable?order_amount=30000",
      "/api/v1/coupons",
    ]);
  });

  it("separates an admin member coupon status at the API boundary", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([{
      id: 7,
      code: "WELCOME10",
      name: "신규 회원 10% 쿠폰",
      discount_type: "PERCENT",
      discount_value: 10,
      discount_amount: 10,
      min_order_amount: 10000,
      status: "ISSUED",
      user_coupon_id: 11,
      member_id: 12,
    }]), { status: 200 })));

    await expect(adminApi.adminCoupons("token", 12)).resolves.toMatchObject([{
      id: 7,
      definition_status: undefined,
      issuance_status: undefined,
      user_coupon_status: "ISSUED",
      user_coupon_id: 11,
      member_id: 12,
    }]);
  });
});
