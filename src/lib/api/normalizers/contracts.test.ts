import { describe, expect, it } from "vitest";
import { parseContract } from "../../api-client";
import { productSchema } from "../contracts/schemas";
import {
  rawAddressSchema,
  rawAdminCouponSchema,
  rawAdminMemberSchema,
  rawAuditLogSchema,
  rawCartSchema,
  rawCouponDefinitionSchema,
  rawIssuableCouponQuoteSchema,
  rawOwnedCouponSchema,
  rawSellerProductSchema,
  rawSettlementSchema,
} from "../contracts/raw";
import {
  encodeSellerProduct,
  normalizeAddress,
  normalizeAdminCoupon,
  normalizeAdminMember,
  normalizeAuditLog,
  normalizeCartItem,
  normalizeCouponDefinition,
  normalizeIssuableCouponQuote,
  normalizeOwnedCoupon,
  normalizePublicProduct,
  normalizeSellerProduct,
  normalizeSettlement,
} from "./contracts";

const rawCouponPayload = {
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

describe("contract normalizers", () => {
  it("normalizes PascalCase cart and address responses", () => {
    const cart = parseContract(rawCartSchema, {
      ID: 1, MemberID: 2, ProductID: 3, OptionID: 4, Quantity: 2, PriceAtAdded: 12000,
    }, "/cart");
    const address = parseContract(rawAddressSchema, {
      ID: 5, ReceiverName: "홍길동", ReceiverPhone: "010", PostalCode: "01234",
      BaseAddress: "서울", DetailAddress: "101호", IsDefault: true,
    }, "/addresses");

    expect(normalizeCartItem(cart)).toMatchObject({ id: 1, product_id: 3, price_at_added: 12000 });
    expect(normalizeAddress(address)).toMatchObject({ id: 5, receiver: "홍길동", line1: "서울", is_default: true });
  });

  it("round-trips seller product fields and nested options with PascalCase writes", () => {
    const raw = parseContract(rawSellerProductSchema, {
      ID: 10, MarketID: 20, CategoryID: 30, Name: "상품", Description: "{\"text\":\"설명\"}",
      ImageURL: "/p.jpg", Tags: "여름, 신상", BasePrice: 20000, DiscountPrice: 18000,
      ShippingType: "NORMAL", PopularityScore: 3.5, Status: "SELLING",
      Options: [{
        ID: 40, ProductID: 10, OptionName: "색상", OptionValue: "검정", AdditionalPrice: 1000,
        Quantity: 5, ReservedQuantity: 1, SafetyQuantity: 2, IsActive: true,
      }],
    }, "/seller/products");
    const product = normalizeSellerProduct(raw);

    expect(product).toMatchObject({
      id: 10,
      description: "설명",
      description_source: "{\"text\":\"설명\"}",
      tags: ["여름", "신상"],
    });
    expect(encodeSellerProduct(product)).toMatchObject({
      ID: 10,
      Description: "{\"text\":\"설명\"}",
      Options: [{ ID: 40, ReservedQuantity: 1, SafetyQuantity: 2 }],
    });
  });

  it("keeps PDP HTML embedded in the server-side description payload", () => {
    const product = parseContract(productSchema, {
      id: 11,
      market_id: 20,
      category_id: 30,
      name: "베이지 니트",
      description: JSON.stringify({
        text: "부드러운 베이지 니트입니다.",
        html: '<section class="detail-band"><img src="https://images.pexels.com/photos/11/product.jpeg" alt="베이지 니트"></section>',
      }),
      base_price: 35000,
      discount_price: 0,
      shipping_type: "NORMAL",
      popularity_score: 0,
      status: "SELLING",
    }, "/products/11");

    const normalized = normalizePublicProduct(product);

    expect(normalized.description).toBe("부드러운 베이지 니트입니다.");
    expect(normalized.detail_html).toContain("images.pexels.com/photos/11/product.jpeg");
  });

  it("drops sensitive admin member fields and normalizes settlements", () => {
    const member = parseContract(rawAdminMemberSchema, {
      ID: 1, Email: "admin@example.com", PasswordHash: "must-not-leak", Role: "ADMIN",
      Status: "ACTIVE", NotificationType: "PUSH", MarketingConsent: false,
      NighttimeConsent: false, CreatedAt: "2026-07-26T00:00:00Z",
    }, "/admin/members");
    const settlement = parseContract(rawSettlementSchema, {
      ID: 2, MarketID: 3, TargetMonth: "2026-07", TotalSalesAmount: 10000,
      CommissionAmount: 1000, FinalSettlementAmount: 9000, Status: "CONFIRMED",
    }, "/admin/settlements");

    expect(normalizeAdminMember(member)).not.toHaveProperty("PasswordHash");
    expect(normalizeAdminMember(member)).not.toHaveProperty("point_balance");
    expect(normalizeSettlement(settlement)).toMatchObject({ id: 2, market_id: 3, status: "CONFIRMED" });
  });

  it("retains order audit targets and treats zero settlement IDs as absent", () => {
    const log = parseContract(rawAuditLogSchema, {
      ID: 3,
      AdminID: 0,
      Action: "FORCE_CANCEL",
      SettlementID: 0,
      OrderID: 9,
      OrderCode: "ORDER-9",
      TargetType: "ORDER",
      CreatedAt: "2026-07-26T00:00:00Z",
    }, "/admin/orders/action-logs");

    expect(normalizeAuditLog(log)).toMatchObject({
      admin_id: 0,
      order_id: 9,
      order_code: "ORDER-9",
      settlement_id: undefined,
    });
  });

  it("accepts only the product statuses returned by the product API", () => {
    const product = {
      id: 1,
      market_id: 2,
      category_id: 3,
      name: "상품",
      description: "설명",
      base_price: 10000,
      discount_price: 9000,
      shipping_type: "NORMAL",
      popularity_score: 1,
    };

    expect(parseContract(productSchema, { ...product, status: "SELLING" }, "/products").status)
      .toBe("SELLING");
    expect(parseContract(productSchema, { ...product, status: "SOLD_OUT" }, "/products").status)
      .toBe("SOLD_OUT");
    expect(() => parseContract(productSchema, { ...product, status: "OPEN" }, "/products"))
      .toThrow();
  });

  it("normalizes PascalCase coupon definitions and nullable expiry", () => {
    const raw = parseContract(rawCouponDefinitionSchema, rawCouponPayload, "/coupons/issuable");

    expect(normalizeCouponDefinition(raw)).toEqual({
      id: 7,
      code: "WELCOME10",
      name: "신규 회원 10% 쿠폰",
      discount_type: "PERCENT",
      discount_value: 10,
      discount_amount: 5000,
      max_discount: 5000,
      min_order_amount: 10000,
      expires_at: undefined,
      status: "ACTIVE",
      condition_text: "10,000원 이상",
    });
  });

  it("normalizes a quote with a nested PascalCase coupon without dropping amounts", () => {
    const raw = parseContract(rawIssuableCouponQuoteSchema, {
      coupon: rawCouponPayload,
      max_discount: 5000,
      discount_amount: 3000,
      platform_coupon_amount: 2250,
      market_coupon_amount: 750,
      market_coupon_rate: 25,
      discounted_amount: 27000,
    }, "/coupons/issuable?order_amount=30000");

    expect(normalizeIssuableCouponQuote(raw)).toMatchObject({
      coupon: { id: 7, name: "신규 회원 10% 쿠폰" },
      max_discount: 5000,
      discount_amount: 3000,
      platform_coupon_amount: 2250,
      market_coupon_amount: 750,
      market_coupon_rate: 25,
      discounted_amount: 27000,
    });
  });

  it.each([
    {
      market_coupon_rate: 101,
      platform_coupon_amount: 2250,
      market_coupon_amount: 750,
    },
    {
      market_coupon_rate: 25,
      platform_coupon_amount: 2000,
      market_coupon_amount: 750,
    },
  ])("rejects a contradictory coupon quote: %#", (overrides) => {
    expect(() => parseContract(rawIssuableCouponQuoteSchema, {
      coupon: rawCouponPayload,
      max_discount: 5000,
      discount_amount: 3000,
      platform_coupon_amount: overrides.platform_coupon_amount,
      market_coupon_amount: overrides.market_coupon_amount,
      market_coupon_rate: overrides.market_coupon_rate,
      discounted_amount: 27000,
    }, "/coupons/issuable?order_amount=30000")).toThrow();
  });

  it.each([
    { UsedAt: null, ExpiresAt: "2026-07-27T00:00:00Z", expected: "AVAILABLE" },
    { UsedAt: "2026-07-25T00:00:00Z", ExpiresAt: "2026-07-27T00:00:00Z", expected: "USED" },
    { UsedAt: null, ExpiresAt: "2026-07-25T00:00:00Z", expected: "EXPIRED" },
  ] as const)("derives owned coupon state only from UsedAt and ExpiresAt: $expected", ({
    UsedAt,
    ExpiresAt,
    expected,
  }) => {
    const raw = parseContract(rawOwnedCouponSchema, {
      ID: 11,
      UserID: 12,
      CouponID: 7,
      ExpiresAt,
      OrderID: UsedAt ? 13 : null,
      UsedAt,
      CreatedAt: "2026-07-24T00:00:00Z",
      Coupon: rawCouponPayload,
    }, "/coupons");

    expect(normalizeOwnedCoupon(raw, new Date("2026-07-26T00:00:00Z"))).toMatchObject({
      id: 11,
      coupon_id: 7,
      expires_at: ExpiresAt,
      status: expected,
      coupon: { id: 7 },
    });
  });

  it.each([
    { status: "ISSUABLE", issuance_status: "ISSUABLE", user_coupon_status: undefined },
    { status: "SCHEDULED", issuance_status: "SCHEDULED", user_coupon_status: undefined },
    { status: "ENDED", issuance_status: "ENDED", user_coupon_status: undefined },
    { status: "SOLD_OUT", issuance_status: "SOLD_OUT", user_coupon_status: undefined },
    { status: "INACTIVE", issuance_status: "INACTIVE", user_coupon_status: undefined },
    { status: "ISSUED", issuance_status: undefined, user_coupon_status: "ISSUED" },
    { status: "USED", issuance_status: undefined, user_coupon_status: "USED" },
  ] as const)("separates the admin combined $status status without inferring definition state", ({
    status,
    issuance_status,
    user_coupon_status,
  }) => {
    const raw = parseContract(rawAdminCouponSchema, {
      id: 7,
      code: "WELCOME10",
      name: "신규 회원 10% 쿠폰",
      discount_type: "PERCENT",
      discount_value: 10,
      discount_amount: 10,
      min_order_amount: 10000,
      status,
      condition_text: "PERCENT 10 / 최소 주문 10000원",
      user_coupon_id: user_coupon_status ? 20 : undefined,
      member_id: user_coupon_status ? 12 : undefined,
    }, "/admin/coupons");

    expect(normalizeAdminCoupon(raw)).toMatchObject({
      definition_status: undefined,
      issuance_status,
      user_coupon_status,
    });
  });

  it("rejects an unknown combined admin coupon status", () => {
    expect(() => parseContract(rawAdminCouponSchema, {
      id: 7,
      code: "WELCOME10",
      name: "신규 회원 10% 쿠폰",
      discount_type: "PERCENT",
      discount_value: 10,
      discount_amount: 10,
      min_order_amount: 10000,
      status: "ACTIVE",
    }, "/admin/coupons")).toThrow();
  });

  it("keeps the selected member on a still-issuable admin coupon", () => {
    const raw = parseContract(rawAdminCouponSchema, {
      id: 7,
      code: "WELCOME10",
      name: "신규 회원 10% 쿠폰",
      discount_type: "PERCENT",
      discount_value: 10,
      discount_amount: 10,
      min_order_amount: 10000,
      status: "ISSUABLE",
      member_id: 12,
    }, "/admin/coupons?member_id=12");

    expect(normalizeAdminCoupon(raw)).toMatchObject({
      member_id: 12,
      issuance_status: "ISSUABLE",
      user_coupon_status: undefined,
    });
  });

  it.each([
    { status: "ISSUED", member_id: 12 },
    { status: "USED", user_coupon_id: 20 },
    { status: "ISSUABLE", member_id: 12, user_coupon_id: 20 },
  ])("rejects an inconsistent admin ownership response: %#", (ownership) => {
    expect(() => parseContract(rawAdminCouponSchema, {
      id: 7,
      code: "WELCOME10",
      name: "신규 회원 10% 쿠폰",
      discount_type: "PERCENT",
      discount_value: 10,
      discount_amount: 10,
      min_order_amount: 10000,
      ...ownership,
    }, "/admin/coupons")).toThrow();
  });
});
