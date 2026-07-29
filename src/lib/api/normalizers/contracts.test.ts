import { describe, expect, it } from "vitest";
import { parseContract } from "../../api-client";
import {
  rawAddressSchema,
  rawAdminMemberSchema,
  rawAuditLogSchema,
  rawCartSchema,
  rawSellerProductSchema,
  rawSettlementSchema,
} from "../contracts/raw";
import {
  encodeSellerProduct,
  normalizeAddress,
  normalizeAdminMember,
  normalizeAuditLog,
  normalizeCartItem,
  normalizeSellerProduct,
  normalizeSettlement,
} from "./contracts";

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
});
