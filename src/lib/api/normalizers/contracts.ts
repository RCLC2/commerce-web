import type {
  Address,
  AdminDashboard,
  AdminMember,
  AuditLog,
  CartItem,
  CouponDefinition,
  Product,
  Settlement,
} from "../../types";
import type { z } from "zod";
import type {
  adminDashboardRawSchema,
  rawAddressSchema,
  rawAdminMemberSchema,
  rawAuditLogSchema,
  rawCartSchema,
  rawSellerProductSchema,
  rawSettlementSchema,
} from "../contracts/raw";

export function normalizeCartItem(raw: z.infer<typeof rawCartSchema>): CartItem {
  return {
    id: raw.ID,
    member_id: raw.MemberID,
    product_id: raw.ProductID,
    option_id: raw.OptionID,
    quantity: raw.Quantity,
    price_at_added: raw.PriceAtAdded,
  };
}

export function normalizeAddress(raw: z.infer<typeof rawAddressSchema>): Address {
  return {
    id: raw.ID,
    receiver: raw.ReceiverName,
    phone: raw.ReceiverPhone,
    zip_code: raw.PostalCode,
    line1: raw.BaseAddress,
    line2: raw.DetailAddress,
    is_default: raw.IsDefault,
  };
}

export function normalizeSellerProduct(raw: z.infer<typeof rawSellerProductSchema>): Product {
  return {
    id: raw.ID,
    market_id: raw.MarketID,
    category_id: raw.CategoryID,
    name: raw.Name,
    description: normalizeDescription(raw.Description),
    description_source: raw.Description,
    image_url: raw.ImageURL || undefined,
    tags: raw.Tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    base_price: raw.BasePrice,
    discount_price: raw.DiscountPrice,
    shipping_type: raw.ShippingType,
    popularity_score: raw.PopularityScore,
    status: raw.Status,
    options: raw.Options.map((option) => ({
      id: option.ID,
      product_id: option.ProductID,
      option_name: option.OptionName,
      option_value: option.OptionValue,
      additional_price: option.AdditionalPrice,
      quantity: option.Quantity,
      reserved_quantity: option.ReservedQuantity,
      safety_quantity: option.SafetyQuantity,
      is_active: option.IsActive,
    })),
  };
}

export function normalizePublicProduct(product: Product): Product {
  return { ...product, description: normalizeDescription(product.description) };
}

export function encodeSellerProduct(product: Product): Record<string, unknown> {
  return {
    ID: product.id,
    MarketID: product.market_id,
    CategoryID: product.category_id,
    Name: product.name,
    Description: product.description_source ?? product.description,
    ImageURL: product.image_url ?? "",
    Tags: (product.tags ?? []).join(","),
    BasePrice: product.base_price,
    DiscountPrice: product.discount_price,
    ShippingType: product.shipping_type,
    PopularityScore: product.popularity_score,
    Status: product.status,
    Options: (product.options ?? []).map((option) => ({
      ID: option.id,
      ProductID: option.product_id,
      OptionName: option.option_name,
      OptionValue: option.option_value,
      AdditionalPrice: option.additional_price,
      Quantity: option.quantity,
      ReservedQuantity: option.reserved_quantity ?? 0,
      SafetyQuantity: option.safety_quantity ?? 0,
      IsActive: option.is_active,
    })),
  };
}

export function normalizeSettlement(raw: z.infer<typeof rawSettlementSchema>): Settlement {
  return {
    id: raw.ID,
    market_id: raw.MarketID,
    market_name: "",
    target_month: raw.TargetMonth,
    total_sales_amount: raw.TotalSalesAmount,
    commission_amount: raw.CommissionAmount,
    final_settlement_amount: raw.FinalSettlementAmount,
    status: raw.Status,
  };
}

export function normalizeAdminMember(raw: z.infer<typeof rawAdminMemberSchema>): AdminMember {
  return {
    id: raw.ID,
    email: raw.Email,
    role: raw.Role,
    status: raw.Status,
    notification_type: raw.NotificationType,
    marketing_consent: raw.MarketingConsent,
    nighttime_consent: raw.NighttimeConsent,
    created_at: raw.CreatedAt,
  };
}

export function normalizeAuditLog(raw: z.infer<typeof rawAuditLogSchema>): AuditLog {
  return {
    id: raw.ID,
    admin_id: raw.AdminID,
    action: raw.Action,
    settlement_id: raw.SettlementID,
    order_id: raw.OrderID,
    order_code: raw.OrderCode,
    target_type: raw.TargetType,
    created_at: raw.CreatedAt,
  };
}

export function normalizeAdminDashboard(raw: z.infer<typeof adminDashboardRawSchema>): AdminDashboard {
  return {
    metrics: raw.metrics,
    alerts: raw.alerts,
    recent_actions: raw.recent_actions.map(normalizeAuditLog),
  };
}

export function normalizeDescription(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object") {
      if ("text" in parsed && typeof parsed.text === "string") return parsed.text;
      if ("html" in parsed && typeof parsed.html === "string") {
        return parsed.html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      }
    }
  } catch {
    return trimmed;
  }
  return trimmed;
}

export function normalizeCouponDefinition(
  coupon: Omit<CouponDefinition, "discount_amount">,
): CouponDefinition {
  const discountAmount = coupon.discount_type === "AMOUNT"
    ? coupon.discount_value
    : coupon.max_discount;
  return {
    ...coupon,
    discount_amount: discountAmount,
    condition_text: coupon.condition_text
      ?? `${coupon.min_order_amount.toLocaleString("ko-KR")}원 이상`,
  };
}
