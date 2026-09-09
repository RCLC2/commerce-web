import type {
  Address,
  AdminCoupon,
  AdminDashboard,
  AdminMember,
  AuditLog,
  CartItem,
  CouponDefinition,
  ExternalInventoryMapping,
  InventoryDetail,
  InventoryLocation,
  IssuableCouponQuote,
  Notification,
  OwnedCoupon,
  PaymentRequest,
  Product,
  Review,
  SellerSettlementDashboard,
  Settlement,
  SettlementAccount,
  SettlementLine,
  SettlementSummary,
  SuppliedProductOption,
} from "../../types";
import type { z } from "zod";
import type {
  adminDashboardRawSchema,
  rawAddressSchema,
  rawAdminCouponSchema,
  rawAdminMemberSchema,
  rawAuditLogSchema,
  rawCartSchema,
  rawCouponDefinitionSchema,
  rawExternalInventoryMappingSchema,
  rawInventoryDetailSchema,
  rawInventoryLocationSchema,
  rawIssuableCouponQuoteSchema,
  rawNotificationSchema,
  rawOwnedCouponSchema,
  rawPaymentRequestSchema,
  rawReviewMutationSchema,
  rawSellerSettlementDashboardSchema,
  rawSellerProductSchema,
  rawSettlementAccountSchema,
  rawSettlementLineSchema,
  rawSettlementSchema,
  rawSettlementSummarySchema,
  rawSuppliedProductOptionSchema,
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
    summary_description: raw.SummaryDescription || undefined,
    description_source: raw.Description,
    image_url: raw.ImageURL || undefined,
    images: raw.Images.map((image) => ({
      id: image.ID || undefined,
      url: image.URL,
      alt_text: image.AltText || undefined,
      sort_order: image.SortOrder,
    })),
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
  const detailHTML = product.detail_html || detailHTMLFromDescription(product.description);
  return { ...product, description: normalizeDescription(product.description), detail_html: detailHTML };
}

export function encodeSellerProduct(product: Product): Record<string, unknown> {
  return {
    ID: product.id,
    MarketID: product.market_id,
    CategoryID: product.category_id,
    Name: product.name,
    Description: product.description_source ?? product.description,
    SummaryDescription: product.summary_description ?? "",
    Images: (product.images ?? []).slice(0, 5).map((image, index) => ({ ID: image.id ?? 0, URL: image.url, AltText: image.alt_text ?? "", SortOrder: index })),
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

export function normalizeSellerSettlementDashboard(
  raw: z.infer<typeof rawSellerSettlementDashboardSchema>,
): SellerSettlementDashboard {
  return {
    ...raw,
    settlements: raw.settlements.map(normalizeSettlement),
  };
}

export function normalizeSettlementSummary(
  raw: z.infer<typeof rawSettlementSummarySchema>,
): SettlementSummary {
  return {
    settlements: raw.settlements.map(normalizeSettlement),
  };
}

export function normalizeSettlementLine(
  raw: z.infer<typeof rawSettlementLineSchema>,
): SettlementLine {
  return raw;
}

export function normalizeSettlementAccount(
  raw: z.infer<typeof rawSettlementAccountSchema>,
): SettlementAccount {
  return {
    id: raw.ID,
    market_id: raw.MarketID,
    bank_code: raw.BankCode,
    account_number: raw.AccountNumber,
    account_holder: raw.AccountHolder,
    created_at: raw.CreatedAt,
    updated_at: raw.UpdatedAt,
  };
}

export function encodeSettlementAccount(payload: {
  bank_code: string;
  account_number: string;
  account_holder: string;
}): Record<string, string> {
  return {
    BankCode: payload.bank_code,
    AccountNumber: payload.account_number,
    AccountHolder: payload.account_holder,
  };
}

export function normalizeNotification(
  raw: z.infer<typeof rawNotificationSchema>,
): Notification {
  return {
    id: raw.ID,
    user_id: raw.UserID,
    title: raw.Title,
    message: raw.Message,
    is_read: raw.IsRead,
    created_at: raw.CreatedAt,
  };
}

export function normalizePaymentRequest(
  raw: z.infer<typeof rawPaymentRequestSchema>,
): PaymentRequest {
  return {
    client_key: raw.client_key,
    order_id: raw.order_id,
    order_name: raw.order_name,
    amount: raw.amount,
  };
}

export function normalizeReviewMutation(
  raw: z.infer<typeof rawReviewMutationSchema>,
): Review {
  return {
    id: raw.id,
    product_id: raw.product_id,
    option_id: raw.option_id,
    member_id: raw.member_id,
    order_id: raw.order_id,
    order_line_item_id: raw.order_line_item_id,
    rating_x2: raw.rating_x2,
    rating: raw.rating,
    content: raw.content,
    is_photo_review: raw.is_photo_review,
    status: raw.status,
    images: raw.images,
    ...(raw.created_at ? { created_at: raw.created_at } : {}),
    ...(raw.updated_at ? { updated_at: raw.updated_at } : {}),
  };
}

export function normalizeExternalInventoryMapping(
  raw: z.infer<typeof rawExternalInventoryMappingSchema>,
): ExternalInventoryMapping {
  return {
    id: raw.ID,
    inventory_source_id: raw.inventory_source_id,
    provider: raw.provider,
    product_option_id: raw.product_option_id,
    external_product_id: raw.external_product_id || undefined,
    external_variant_id: raw.external_variant_id || undefined,
    external_inventory_item_id: raw.external_inventory_item_id || undefined,
    external_location_id: raw.external_location_id || undefined,
    last_synced_quantity: raw.last_synced_quantity ?? undefined,
    disconnect_if_necessary: raw.disconnect_if_necessary,
    created_at: raw.CreatedAt,
    updated_at: raw.UpdatedAt,
  };
}

export function normalizeSuppliedProductOption(
  raw: z.infer<typeof rawSuppliedProductOptionSchema>,
): SuppliedProductOption {
  return {
    id: raw.ID,
    product_option_id: raw.ProductOptionID,
    provider: raw.Provider,
    sku_code: raw.SKUCode,
    supplier_code: raw.SupplierCode,
    created_at: raw.CreatedAt,
    updated_at: raw.UpdatedAt,
  };
}

export function normalizeInventoryLocation(
  raw: z.infer<typeof rawInventoryLocationSchema>,
): InventoryLocation {
  return {
    id: raw.ID,
    location_id: raw.LocationID,
    name: raw.Name,
    channel_type: raw.ChannelType,
    is_virtual: raw.IsVirtual,
    created_at: raw.CreatedAt,
    updated_at: raw.UpdatedAt,
  };
}

export function normalizeInventoryDetail(
  raw: z.infer<typeof rawInventoryDetailSchema>,
): InventoryDetail {
  return {
    id: raw.ID,
    product_option_id: raw.ProductOptionID,
    supplied_option_id: raw.SuppliedOptionID ?? undefined,
    location_id: raw.LocationID,
    inbound_reference: raw.InboundReference,
    available_quantity: raw.AvailableQuantity,
    allocated_quantity: raw.AllocatedQuantity,
    created_at: raw.CreatedAt,
    updated_at: raw.UpdatedAt,
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

export function detailHTMLFromDescription(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && "html" in parsed && typeof parsed.html === "string") {
      const html = parsed.html.trim();
      return html || undefined;
    }
  } catch {
    return undefined;
  }
  return undefined;
}
export function normalizeCouponDefinition(
  raw: z.infer<typeof rawCouponDefinitionSchema>,
): CouponDefinition {
  const discountAmount = raw.DiscountType === "AMOUNT"
    ? raw.DiscountValue
    : raw.MaxDiscount;
  return {
    id: raw.ID,
    code: raw.Code,
    name: raw.Name,
    discount_type: raw.DiscountType,
    discount_value: raw.DiscountValue,
    discount_amount: discountAmount,
    max_discount: raw.MaxDiscount,
    min_order_amount: raw.MinOrderAmount,
    expires_at: raw.ExpiresAt ?? undefined,
    status: raw.Status,
    condition_text: `${raw.MinOrderAmount.toLocaleString("ko-KR")}원 이상`,
  };
}

export function normalizeOwnedCoupon(
  raw: z.infer<typeof rawOwnedCouponSchema>,
  now: Date = new Date(),
): OwnedCoupon {
  const status = raw.UsedAt
    ? "USED"
    : new Date(raw.ExpiresAt).getTime() <= now.getTime()
      ? "EXPIRED"
      : "AVAILABLE";

  return {
    id: raw.ID,
    coupon_id: raw.CouponID,
    expires_at: raw.ExpiresAt,
    status,
    coupon: normalizeCouponDefinition(raw.Coupon),
  };
}

export function normalizeIssuableCouponQuote(
  raw: z.infer<typeof rawIssuableCouponQuoteSchema>,
): IssuableCouponQuote {
  return {
    coupon: normalizeCouponDefinition(raw.coupon),
    max_discount: raw.max_discount,
    discount_amount: raw.discount_amount,
    platform_coupon_amount: raw.platform_coupon_amount,
    market_coupon_amount: raw.market_coupon_amount,
    market_coupon_rate: raw.market_coupon_rate,
    discounted_amount: raw.discounted_amount,
  };
}

export function normalizeAdminCoupon(
  raw: z.infer<typeof rawAdminCouponSchema>,
): AdminCoupon {
  const coupon = {
    id: raw.id,
    code: raw.code,
    name: raw.name,
    discount_type: raw.discount_type,
    discount_value: raw.discount_value,
    discount_amount: raw.discount_amount,
    min_order_amount: raw.min_order_amount,
    expires_at: raw.expires_at ?? undefined,
    condition_text: raw.condition_text,
    definition_status: undefined,
    user_coupon_id: raw.user_coupon_id,
    member_id: raw.member_id,
  };

  if (raw.status === "ISSUED" || raw.status === "USED") {
    return {
      ...coupon,
      issuance_status: undefined,
      user_coupon_status: raw.status,
    };
  }

  return {
    ...coupon,
    issuance_status: raw.status,
    user_coupon_status: undefined,
  };
}
