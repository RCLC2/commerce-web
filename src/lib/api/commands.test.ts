import { afterEach, describe, expect, it, vi } from "vitest";
import { adminConsoleApi } from "../admin-console-api";
import { adminApi } from "./admin";
import { authApi } from "./auth";
import { customerApi, normalizeCouponQuoteOrderAmount } from "./customer";
import { sellerApi } from "./seller";

afterEach(() => vi.unstubAllGlobals());

describe("command route regressions", () => {
  it("defaults optional profile measurements omitted by the member API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: 8,
      email: "member@test.com",
      role: "MEMBER",
      status: "ACTIVE",
      notification_type: "PUSH",
      marketing_consent: false,
      nighttime_consent: false,
      point_balance: 5000,
      created_at: "2026-07-29T04:53:31Z",
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(authApi.me("token")).resolves.toMatchObject({
      height: 0,
      weight: 0,
    });
  });

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

  it("completes only the selected seller market shipping package", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await sellerApi.completeSellerPackage("token", 4, 21);

    expect(new URL(String(fetchMock.mock.calls[0][0])).pathname).toBe(
      "/api/v1/seller/markets/4/shipping-packages/21/complete",
    );
  });

  it("keeps admin market status and settlement payment on admin-only canonical routes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await adminConsoleApi.updateMarketStatus("token", 3, "HIDE");
    await adminConsoleApi.markSettlementPaid("token", 17);

    expect(fetchMock.mock.calls.map((call) => {
      const url = new URL(String(call[0]));
      return [url.pathname, call[1].method];
    })).toEqual([
      ["/api/v1/admin/markets/3/status", "POST"],
      ["/api/v1/admin/settlements/17/pay", "POST"],
    ]);
  });

  it("snapshots the selected shipping address when placing an order", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      orderCode: "ORDER-1",
    }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await customerApi.placeOrder("token", {
      cart_item_ids: [11],
      used_point: 0,
      shipping_address: {
        receiver: "홍길동",
        phone: "010-0000-0000",
        zip_code: "01234",
        line1: "서울시 중구",
        line2: "101호",
      },
    });

    expect(new URL(String(fetchMock.mock.calls[0][0])).pathname).toBe("/api/v1/orders");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      shipping_address: {
        receiver: "홍길동",
        phone: "010-0000-0000",
        zip_code: "01234",
        line1: "서울시 중구",
        line2: "101호",
      },
    });
  });

  it("accepts successful empty command responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(customerApi.addWishlist("token", 7)).resolves.toBeUndefined();
    await expect(sellerApi.retryInventorySyncLog("token", 9)).resolves.toBeUndefined();
    await expect(adminApi.createCarousel("token", { title: "배너" })).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("keeps product likes and wishlists on separate command routes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await customerApi.addLike("token", 7);
    await customerApi.removeLike("token", 7);
    await customerApi.addWishlist("token", 7);
    await customerApi.removeWishlist("token", 7);

    expect(fetchMock.mock.calls.map((call) => {
      const url = new URL(String(call[0]));
      return [url.pathname, call[1].method];
    })).toEqual([
      ["/api/v1/products/7/like", "POST"],
      ["/api/v1/products/7/like", "DELETE"],
      ["/api/v1/products/7/wishlist", "POST"],
      ["/api/v1/products/7/wishlist", "DELETE"],
    ]);
  });

  it("keeps customer review update and delete on their deployed routes", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 5,
        product_id: 1,
        option_id: 2,
        member_id: 3,
        order_id: 4,
        order_line_item_id: 6,
        rating_x2: 8,
        rating: 4,
        content: "수정한 리뷰",
        is_photo_review: false,
        status: "ACTIVE",
        images: [],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await customerApi.updateReview("token", 5, { rating_x2: 8, content: "수정한 리뷰" });
    await customerApi.deleteReview("token", 5);

    expect(fetchMock.mock.calls.map((call) => {
      const url = new URL(String(call[0]));
      return [url.pathname, call[1].method];
    })).toEqual([
      ["/api/v1/reviews/5", "PATCH"],
      ["/api/v1/reviews/5", "DELETE"],
    ]);
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

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1, Number.MAX_VALUE])(
    "rejects an unsafe coupon quote order amount %s before fetching",
    async (amount) => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      expect(() => normalizeCouponQuoteOrderAmount(amount)).toThrow(RangeError);
      await expect(customerApi.listIssuableCouponQuotes("token", amount)).rejects.toThrow(RangeError);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
});

describe("origin/main mixed contract regressions", () => {
  it("normalizes timestamp-free review mutations and PascalCase notifications", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 5,
        product_id: 1,
        option_id: 2,
        member_id: 3,
        order_id: 4,
        order_line_item_id: 6,
        rating_x2: 10,
        rating: 5,
        content: "좋아요",
        is_photo_review: false,
        status: "ACTIVE",
        images: [],
      }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{
        ID: 9,
        UserID: 3,
        Title: "배송",
        Message: "출고되었습니다",
        IsRead: false,
        CreatedAt: "2026-07-29T00:00:00Z",
      }]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const review = await customerApi.createOrderLineReview("token", "ORDER-1", 6, {
      rating_x2: 10,
      content: "좋아요",
    });
    expect(review).toMatchObject({
      id: 5,
      order_line_item_id: 6,
    });
    expect(review).not.toHaveProperty("created_at");
    await expect(customerApi.listNotifications("token")).resolves.toEqual([{
      id: 9,
      user_id: 3,
      title: "배송",
      message: "출고되었습니다",
      is_read: false,
      created_at: "2026-07-29T00:00:00Z",
    }]);
  });

  it("rejects a truncated review mutation response before reporting success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: 5,
      product_id: 1,
      rating: 5,
      content: "필수 주문 연결 필드가 없습니다",
    }), { status: 201 })));

    await expect(customerApi.createOrderLineReview("token", "ORDER-1", 6, {
      rating_x2: 10,
      content: "좋아요",
    })).rejects.toThrow("서버 응답 계약");
  });

  it("normalizes a successful inventory mapping response with an uppercase ID", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ID: 12,
      inventory_source_id: 2,
      provider: "SHOPIFY",
      product_option_id: 4,
      external_product_id: "product-1",
      external_variant_id: "variant-1",
      external_inventory_item_id: "inventory-1",
      external_location_id: "location-1",
      last_synced_quantity: 8,
      disconnect_if_necessary: false,
      CreatedAt: "2026-07-29T00:00:00Z",
      UpdatedAt: "2026-07-29T01:00:00Z",
    }), { status: 201 })));

    await expect(sellerApi.registerInventoryMapping("token", {
      inventory_source_id: 2,
      product_option_id: 4,
    })).resolves.toMatchObject({
      id: 12,
      inventory_source_id: 2,
      product_option_id: 4,
      last_synced_quantity: 8,
      updated_at: "2026-07-29T01:00:00Z",
    });
  });

  it("uses the backend fulfillment DTOs for dormant supplied, location, inventory, and outbound helpers", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ID: 20,
        ProductOptionID: 4,
        Provider: "SHOPIFY",
        SKUCode: "SKU-4",
        SupplierCode: "SUP-4",
      }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ID: 21,
        LocationID: 3,
        Name: "기본 창고",
        ChannelType: "ONLINE",
        IsVirtual: false,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ID: 22,
        ProductOptionID: 4,
        SuppliedOptionID: 20,
        LocationID: 3,
        InboundReference: "IN-1",
        AvailableQuantity: 8,
        AllocatedQuantity: 2,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        external_order_id: "external-1",
        external_name: "External #1",
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(sellerApi.registerSuppliedProductOption("token", {
      product_option_id: 4,
      provider: "SHOPIFY",
      sku_code: "SKU-4",
      supplier_code: "SUP-4",
    })).resolves.toMatchObject({ id: 20, sku_code: "SKU-4" });
    await expect(sellerApi.upsertInventoryLocation("token", {
      location_id: 3,
      name: "기본 창고",
      channel_type: "ONLINE",
    })).resolves.toMatchObject({ id: 21, location_id: 3, is_virtual: false });
    await expect(sellerApi.adjustInventory("token", {
      product_option_id: 4,
      supplied_option_id: 20,
      location_id: 3,
      inbound_reference: "IN-1",
      available_quantity_delta: 8,
      allocated_quantity_delta: 2,
      transaction_type: "INBOUND",
      reference_type: "PURCHASE",
      reference_id: "PO-1",
      memo: "입고",
    })).resolves.toMatchObject({ id: 22, available_quantity: 8 });
    await expect(sellerApi.syncOutboundOrder("token", "ORDER-1", {
      market_id: 1,
      provider: "SHOPIFY",
    })).resolves.toEqual({
      external_order_id: "external-1",
      external_name: "External #1",
    });
    await expect(sellerApi.syncOutboundOrderStatus("token", "ORDER-1", {
      market_id: 1,
      provider: "SHOPIFY",
      external_order_id: "external-1",
      status: "FULFILLED",
    })).resolves.toBeUndefined();

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      product_option_id: 4,
      provider: "SHOPIFY",
      sku_code: "SKU-4",
      supplier_code: "SUP-4",
    });
    expect(JSON.parse(fetchMock.mock.calls[4][1].body)).toMatchObject({
      external_order_id: "external-1",
      status: "FULFILLED",
    });
  });

  it("decodes settlement log wrappers and settlement account PascalCase/empty PUT contracts", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        items: [{
          ID: 3,
          AdminID: 1,
          Action: "CONFIRM_SETTLEMENT",
          SettlementID: 7,
          TargetType: "SETTLEMENT",
          CreatedAt: "2026-07-29T00:00:00Z",
        }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ID: 2,
        MarketID: 7,
        BankCode: "004",
        AccountNumber: "123-456",
        AccountHolder: "홍길동",
        CreatedAt: "2026-07-29T00:00:00Z",
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(adminApi.adminSettlementActionLogs("token")).resolves.toMatchObject([
      { id: 3, settlement_id: 7 },
    ]);
    await expect(sellerApi.getSettlementAccount("token", 7)).resolves.toMatchObject({
      id: 2,
      market_id: 7,
      bank_code: "004",
    });
    await expect(sellerApi.upsertSettlementAccount("token", 7, {
      bank_code: "004",
      account_number: "123-456",
      account_holder: "홍길동",
    })).resolves.toBeUndefined();
    expect(JSON.parse(fetchMock.mock.calls[3][1].body)).toEqual({
      BankCode: "004",
      AccountNumber: "123-456",
      AccountHolder: "홍길동",
    });
    expect(fetchMock.mock.calls[0][0]).toContain(
      "/api/v1/admin/settlements/action-logs?limit=100&offset=0",
    );
  });

  it("decodes the customer settlement summary contract", async () => {
    const settlement = {
      ID: 7,
      MarketID: 2,
      TargetMonth: "2026-07",
      TotalSalesAmount: 10000,
      CommissionAmount: 1000,
      FinalSettlementAmount: 9000,
      Status: "PREPARED",
    };
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ settlements: [settlement] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(customerApi.getSettlementSummary("token", 2)).resolves.toMatchObject({
      settlements: [{ id: 7, market_id: 2 }],
    });
  });
});
