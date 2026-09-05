import { z } from "zod";
import { parseContract, request, requestParsed } from "../api-client";

export const adPlacementSchema = z.enum([
  "home.main_banner",
  "home_feed.sponsored_card",
  "search.sponsored_top",
  "pdp.card_banner",
  "pdp.sponsored_market",
  "home.promotion_card",
  "crm.push_notification",
]);
export const creativeFormatSchema = z.enum(["PRODUCT_CARD", "BANNER", "MARKET_SHELF", "PROMOTION_CARD", "PUSH"]);
const pricingModelSchema = z.enum(["CPM", "DAILY_FLAT"]);
const dateStringSchema = z.string().min(1).refine((value) => !Number.isNaN(Date.parse(value)), "유효한 날짜 문자열이어야 합니다.");

const adProductSummarySchema = z.strictObject({
  id: z.number().int().positive(),
  market_id: z.number().int().positive(),
  market_name: z.string().min(1),
  name: z.string().min(1),
  image_url: z.string().min(1).optional(),
  base_price: z.number().int().nonnegative(),
  discount_price: z.number().int().nonnegative(),
});

const adMarketSummarySchema = z.strictObject({
  id: z.number().int().positive(),
  name: z.string().min(1),
  description: z.string().optional(),
  profile_image_url: z.string().min(1).optional(),
  cover_image_url: z.string().min(1).optional(),
  products: z.array(adProductSummarySchema),
});

const deliveryTargetSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("PRODUCT"), product: adProductSummarySchema }),
  z.strictObject({ type: z.literal("MARKET"), market: adMarketSummarySchema }),
]);

const pexelsShape = {
  pexels_photo_id: z.number().int().positive().optional(),
  pexels_photographer: z.string().min(1).optional(),
  pexels_photographer_url: z.string().url().optional(),
  pexels_photo_url: z.string().url().optional(),
};

function requireCompletePexelsAttribution(value: Record<string, unknown>, context: z.core.$RefinementCtx<Record<string, unknown>>) {
  const fields = ["pexels_photo_id", "pexels_photographer", "pexels_photographer_url", "pexels_photo_url"];
  const provided = fields.filter((field) => value[field] !== undefined).length;
  if (provided !== 0 && provided !== fields.length) {
    context.addIssue({ code: "custom", message: "Pexels 출처 필드는 모두 함께 제공되어야 합니다.", path: ["pexels_photo_id"] });
  }
}

const optionalCreativeShape = {
  id: z.number().int().positive(),
  headline: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  image_url: z.string().min(1).optional(),
  landing_url: z.string().min(1),
  cta_label: z.string().min(1).optional(),
  ...pexelsShape,
};

const productCardCreativeSchema = z.strictObject({ ...optionalCreativeShape, format: z.literal("PRODUCT_CARD") }).superRefine(requireCompletePexelsAttribution);
const bannerCreativeSchema = z.strictObject({
  ...optionalCreativeShape,
  format: z.literal("BANNER"),
  headline: z.string().min(1),
  image_url: z.string().min(1),
  cta_label: z.string().min(1),
}).superRefine(requireCompletePexelsAttribution);
const marketShelfCreativeSchema = z.strictObject({ ...optionalCreativeShape, format: z.literal("MARKET_SHELF") }).superRefine(requireCompletePexelsAttribution);
const promotionCardCreativeSchema = z.strictObject({
  ...optionalCreativeShape,
  format: z.literal("PROMOTION_CARD"),
  headline: z.string().min(1),
  body: z.string().min(1),
}).superRefine(requireCompletePexelsAttribution);
const pushCreativeSchema = z.strictObject({
  ...optionalCreativeShape,
  format: z.literal("PUSH"),
  headline: z.string().min(1),
  body: z.string().min(1),
}).superRefine(requireCompletePexelsAttribution);

export const adCreativeSchema = z.discriminatedUnion("format", [
  productCardCreativeSchema,
  bannerCreativeSchema,
  marketShelfCreativeSchema,
  promotionCardCreativeSchema,
  pushCreativeSchema,
]);

export const adDecisionSchema = z.strictObject({
  decision_id: z.string().min(1),
  request_id: z.string().min(1),
  campaign_id: z.number().int().positive(),
  placement_key: adPlacementSchema,
  target: deliveryTargetSchema,
  creative: adCreativeSchema,
  decided_at: dateStringSchema,
  expires_at: dateStringSchema,
}).superRefine((value, context) => {
  const contract: Record<AdPlacement, { format: z.infer<typeof creativeFormatSchema>; targets: readonly ("PRODUCT" | "MARKET")[] }> = {
    "home.main_banner": { format: "BANNER", targets: ["PRODUCT", "MARKET"] },
    "home_feed.sponsored_card": { format: "PRODUCT_CARD", targets: ["PRODUCT"] },
    "search.sponsored_top": { format: "PRODUCT_CARD", targets: ["PRODUCT"] },
    "pdp.card_banner": { format: "BANNER", targets: ["PRODUCT", "MARKET"] },
    "pdp.sponsored_market": { format: "MARKET_SHELF", targets: ["MARKET"] },
    "home.promotion_card": { format: "PROMOTION_CARD", targets: ["PRODUCT", "MARKET"] },
    "crm.push_notification": { format: "PUSH", targets: ["PRODUCT", "MARKET"] },
  };
  const expected = contract[value.placement_key];
  if (value.creative.format !== expected.format) {
    context.addIssue({ code: "custom", message: "광고 지면과 크리에이티브 형식이 일치하지 않습니다.", path: ["creative", "format"] });
  }
  if (!expected.targets.includes(value.target.type)) {
    context.addIssue({ code: "custom", message: "광고 지면에서 지원하지 않는 타깃입니다.", path: ["target", "type"] });
  }
});

export type AdDecision = z.infer<typeof adDecisionSchema>;
export type AdCreative = z.infer<typeof adCreativeSchema>;
export type AdPlacement = z.infer<typeof adPlacementSchema>;
export type AdProductSummary = z.infer<typeof adProductSummarySchema>;
export type AdMarketSummary = z.infer<typeof adMarketSummarySchema>;

const campaignTargetSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("PRODUCT"), product_id: z.number().int().positive() }),
  z.strictObject({ type: z.literal("MARKET"), market_id: z.number().int().positive() }),
]);

const managementCreativeSchema = z.strictObject({
  ...optionalCreativeShape,
  format: creativeFormatSchema,
  status: z.string().optional(),
  synthetic_key: z.string().optional(),
}).superRefine((value, context) => {
  requireCompletePexelsAttribution(value, context);
  if (value.format === "BANNER" && (!value.headline || !value.image_url || !value.cta_label)) {
    context.addIssue({ code: "custom", message: "배너에는 제목·이미지·행동 문구가 필요합니다.", path: ["format"] });
  }
  if ((value.format === "PROMOTION_CARD" || value.format === "PUSH") && (!value.headline || !value.body)) {
    context.addIssue({ code: "custom", message: "홈 프로모션 카드와 푸시에는 제목과 본문이 필요합니다.", path: ["format"] });
  }
});

export const adCampaignSchema = z.strictObject({
  id: z.number().int().positive(),
  advertiser_market_id: z.number().int().positive(),
  target: campaignTargetSchema,
  creative: managementCreativeSchema,
  name: z.string().min(1),
  pricing_model: pricingModelSchema,
  placement_key: adPlacementSchema,
  origin: z.enum(["ADMIN", "SYNTHETIC"]),
  synthetic_key: z.string().optional(),
  synthetic_batch_key: z.string().optional(),
  status: z.string().min(1),
  pacing_mode: z.string().min(1),
  daily_budget_micros: z.number().int().nonnegative(),
  total_budget_micros: z.number().int().nonnegative(),
  daily_spend_micros: z.number().int().nonnegative(),
  daily_reserved_micros: z.number().int().nonnegative(),
  cpm_micros: z.number().int().nonnegative(),
  daily_flat_price_micros: z.number().int().nonnegative(),
  pacing_burst_micros: z.number().int().nonnegative(),
  advertiser_timezone: z.string().min(1),
  starts_at: dateStringSchema.optional(),
  ends_at: dateStringSchema.optional(),
  submitted_at: dateStringSchema.optional(),
  reviewed_at: dateStringSchema.optional(),
  reviewed_by_member_id: z.number().int().positive().optional(),
  rejection_reason: z.string().optional(),
});

export type AdCampaign = z.infer<typeof adCampaignSchema>;

const placementRateSchema = z.strictObject({
  id: z.number().int().positive(),
  placement_key: adPlacementSchema,
  pricing_model: pricingModelSchema,
  rate_source: z.enum(["ADMIN", "SYNTHETIC_DEFAULT"]),
  cpm_micros: z.number().int().nonnegative(),
  daily_flat_price_micros: z.number().int().nonnegative(),
  effective_from: dateStringSchema,
  effective_to: dateStringSchema.optional(),
  status: z.string().min(1),
  synthetic_key: z.string().optional(),
});

export type PlacementRate = z.infer<typeof placementRateSchema>;

const eventReceiptSchema = z.strictObject({
  duplicate: z.boolean(),
  billable: z.boolean(),
  charge_micros: z.number().int().nonnegative(),
});

function marketQuery(marketID?: number | null) {
  return marketID ? `?market_id=${marketID}` : "";
}

export const advertisingApi = {
  sellerAdCampaigns: (token: string, marketID?: number | null) =>
    requestParsed(z.array(adCampaignSchema), `/api/v1/seller/ads/campaigns${marketQuery(marketID)}`, { token }),
  createSellerAdCampaign: (token: string, marketID: number | null | undefined, payload: Record<string, unknown>) =>
    requestParsed(adCampaignSchema, `/api/v1/seller/ads/campaigns${marketQuery(marketID)}`, {
      method: "POST", token, body: JSON.stringify(payload),
    }),
  submitSellerAdCampaign: (token: string, campaignID: number, marketID?: number | null) =>
    requestParsed(adCampaignSchema, `/api/v1/seller/ads/campaigns/${campaignID}/submit${marketQuery(marketID)}`, { method: "POST", token }),
  pauseSellerAdCampaign: (token: string, campaignID: number, marketID?: number | null) =>
    requestParsed(adCampaignSchema, `/api/v1/seller/ads/campaigns/${campaignID}/pause${marketQuery(marketID)}`, { method: "POST", token }),
  resumeSellerAdCampaign: (token: string, campaignID: number, marketID?: number | null) =>
    requestParsed(adCampaignSchema, `/api/v1/seller/ads/campaigns/${campaignID}/resume${marketQuery(marketID)}`, { method: "POST", token }),
  adminAdCampaigns: (token: string) => requestParsed(z.array(adCampaignSchema), "/api/v1/admin/ads/campaigns", { token }),
  reviewAdCampaign: (token: string, campaignID: number, approved: boolean, reason = "") =>
    requestParsed(adCampaignSchema, `/api/v1/admin/ads/campaigns/${campaignID}/review`, {
      method: "POST", token, body: JSON.stringify({ approved, reason }),
    }),
  pauseAdminAdCampaign: (token: string, campaignID: number) => requestParsed(adCampaignSchema, `/api/v1/admin/ads/campaigns/${campaignID}/pause`, { method: "POST", token }),
  resumeAdminAdCampaign: (token: string, campaignID: number) => requestParsed(adCampaignSchema, `/api/v1/admin/ads/campaigns/${campaignID}/resume`, { method: "POST", token }),
  placementRates: (token: string) => requestParsed(z.array(placementRateSchema), "/api/v1/admin/ads/rates", { token }),
  createPlacementRate: (token: string, payload: Record<string, unknown>) =>
    requestParsed(placementRateSchema, "/api/v1/admin/ads/rates", { method: "POST", token, body: JSON.stringify(payload) }),
  adDecision: async (payload: { request_id: string; placement_key: AdPlacement }, token?: string | null): Promise<AdDecision | null> => {
    const endpoint = "/api/v1/ads/decisions";
    const response = await request(endpoint, {
      method: "POST",
      token: token ?? undefined,
      credentials: "include",
      body: JSON.stringify(payload),
    });
    return response === undefined ? null : parseContract(adDecisionSchema, response, endpoint);
  },
  sellerAdReports: (token: string, marketID?: number | null) => requestParsed(z.array(z.object({
    campaign_id: z.number().int().positive(), impressions: z.number().int().nonnegative(), clicks: z.number().int().nonnegative(),
    spend_micros: z.number().int().nonnegative(), attributed_orders: z.number().int().nonnegative(), revenue_micros: z.number().int().nonnegative(),
  })), `/api/v1/seller/ads/reports${marketQuery(marketID)}`, { token }),
  recordAdEvent: (payload: { event_id: string; decision_id: string; type: "IMPRESSION" | "CLICK" | "PROMOTION_CARD_IMPRESSION"; occurred_at: string }, token?: string | null) =>
    requestParsed(eventReceiptSchema, "/api/v1/ads/events", {
      method: "POST",
      token: token ?? undefined,
      credentials: "include",
      keepalive: true,
      body: JSON.stringify(payload),
    }),
};
