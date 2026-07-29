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
