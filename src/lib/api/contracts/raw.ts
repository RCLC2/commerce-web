import { z } from "zod";
import { consoleAlertSchema, dateStringSchema, identifierSchema, metricSchema, nonNegativeIntSchema } from "./schemas";

export const rawCartSchema = z.object({
  ID: identifierSchema,
  MemberID: identifierSchema,
  ProductID: identifierSchema,
  OptionID: identifierSchema,
  Quantity: z.number().int().positive(),
  PriceAtAdded: nonNegativeIntSchema,
});

export const rawAddressSchema = z.object({
  ID: identifierSchema,
  ReceiverName: z.string(),
  ReceiverPhone: z.string(),
  PostalCode: z.string(),
  BaseAddress: z.string(),
  DetailAddress: z.string(),
  IsDefault: z.boolean(),
});

export const rawCouponDefinitionSchema = z.object({
  ID: identifierSchema,
  Code: z.string(),
  Name: z.string(),
  DiscountType: z.enum(["PERCENT", "AMOUNT"]),
  DiscountValue: nonNegativeIntSchema,
  MaxDiscount: nonNegativeIntSchema,
  MinOrderAmount: nonNegativeIntSchema,
  ExpiresAt: dateStringSchema.nullable().optional(),
  Status: z.enum(["ACTIVE", "INACTIVE"]),
});

export const rawOwnedCouponSchema = z.object({
  ID: identifierSchema,
  UserID: identifierSchema,
  CouponID: identifierSchema,
  ExpiresAt: dateStringSchema,
  OrderID: identifierSchema.nullable().optional(),
  UsedAt: dateStringSchema.nullable().optional(),
  CreatedAt: dateStringSchema,
  Coupon: rawCouponDefinitionSchema,
});

export const rawIssuableCouponQuoteSchema = z.object({
  coupon: rawCouponDefinitionSchema,
  max_discount: nonNegativeIntSchema,
  discount_amount: nonNegativeIntSchema,
  platform_coupon_amount: nonNegativeIntSchema,
  market_coupon_amount: nonNegativeIntSchema,
  market_coupon_rate: nonNegativeIntSchema.max(100),
  discounted_amount: nonNegativeIntSchema,
}).refine(
  (quote) => quote.platform_coupon_amount + quote.market_coupon_amount === quote.discount_amount,
  {
    message: "플랫폼과 마켓 부담액 합계는 할인액과 같아야 합니다.",
    path: ["discount_amount"],
  },
);

const rawAdminCouponBaseSchema = z.object({
  id: identifierSchema,
  code: z.string(),
  name: z.string(),
  discount_type: z.enum(["PERCENT", "AMOUNT"]),
  discount_value: nonNegativeIntSchema,
  discount_amount: nonNegativeIntSchema,
  min_order_amount: nonNegativeIntSchema,
  expires_at: dateStringSchema.nullable().optional(),
  status: z.enum([
    "ISSUABLE",
    "SCHEDULED",
    "ENDED",
    "SOLD_OUT",
    "INACTIVE",
    "ISSUED",
    "USED",
  ]),
  condition_text: z.string().optional(),
  user_coupon_id: identifierSchema.optional(),
  member_id: identifierSchema.optional(),
});

export const rawAdminCouponSchema = rawAdminCouponBaseSchema.superRefine((coupon, context) => {
  const isOwned = coupon.status === "ISSUED" || coupon.status === "USED";
  if (isOwned && (coupon.user_coupon_id === undefined || coupon.member_id === undefined)) {
    context.addIssue({
      code: "custom",
      message: "회원 보유 상태에는 회원과 보유 쿠폰 식별자가 필요합니다.",
      path: ["user_coupon_id"],
    });
  }
  if (!isOwned && coupon.user_coupon_id !== undefined) {
    context.addIssue({
      code: "custom",
      message: "발급 상태에는 보유 쿠폰 식별자가 올 수 없습니다.",
      path: ["user_coupon_id"],
    });
  }
});

const rawSellerOptionSchema = z.looseObject({
  ID: identifierSchema,
  ProductID: identifierSchema,
  OptionName: z.string(),
  OptionValue: z.string(),
  AdditionalPrice: z.number().int(),
  Quantity: z.number().int(),
  ReservedQuantity: z.number().int().default(0),
  SafetyQuantity: z.number().int().default(0),
  IsActive: z.boolean(),
});

export const rawSellerProductSchema = z.looseObject({
  ID: identifierSchema,
  MarketID: identifierSchema,
  CategoryID: identifierSchema,
  Name: z.string(),
  Description: z.string(),
  ImageURL: z.string().default(""),
  Tags: z.string().default(""),
  BasePrice: nonNegativeIntSchema,
  DiscountPrice: nonNegativeIntSchema.default(0),
  ShippingType: z.string().default("NORMAL"),
  PopularityScore: z.number().default(0),
  Status: z.string(),
  Options: z.array(rawSellerOptionSchema).default([]),
});

export const rawSettlementSchema = z.looseObject({
  ID: identifierSchema,
  MarketID: identifierSchema,
  TargetMonth: z.string(),
  TotalSalesAmount: z.number().int(),
  CommissionAmount: z.number().int(),
  FinalSettlementAmount: z.number().int(),
  Status: z.string(),
});

export const rawAdminMemberSchema = z.looseObject({
  ID: identifierSchema,
  Email: z.string(),
  Role: z.enum(["MEMBER", "SELLER", "ADMIN"]),
  Status: z.enum(["PENDING", "ACTIVE", "SUSPENDED", "WITHDRAWN"]),
  NotificationType: z.string(),
  MarketingConsent: z.boolean(),
  NighttimeConsent: z.boolean(),
  CreatedAt: dateStringSchema,
});

export const rawAuditLogSchema = z.looseObject({
  ID: identifierSchema,
  AdminID: nonNegativeIntSchema,
  Action: z.string(),
  SettlementID: nonNegativeIntSchema.transform((value) => value || undefined).optional(),
  OrderID: nonNegativeIntSchema.transform((value) => value || undefined).optional(),
  OrderCode: z.string().optional(),
  TargetType: z.string(),
  CreatedAt: dateStringSchema,
});

export const sellerContextSchema = z.object({
  market_id: identifierSchema,
  market_name: z.string(),
  status: z.string(),
  profile_image_url: z.string().optional(),
  permissions: z.array(z.string()),
});

export const sellerDashboardSchema = z.object({
  metrics: z.array(metricSchema),
  tasks: z.array(consoleAlertSchema),
});

export const adminDashboardRawSchema = z.object({
  metrics: z.array(metricSchema),
  alerts: z.array(consoleAlertSchema),
  recent_actions: z.array(rawAuditLogSchema).default([]),
});
