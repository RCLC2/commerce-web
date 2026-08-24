import { z } from "zod";
import { request, requestParsed } from "../api-client";

const campaignTypeSchema = z.enum(["SPONSORED_FEED", "SEARCH", "CRM", "GUARANTEED"]);
const pricingModelSchema = z.enum(["CPM", "DAILY_FLAT"]);

export const adCampaignSchema = z.looseObject({
  ID: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  MarketID: z.number().int().positive().optional(),
  market_id: z.number().int().positive().optional(),
  ProductID: z.number().int().positive().optional(),
  product_id: z.number().int().positive().optional(),
  Name: z.string().optional(),
  name: z.string().optional(),
  CampaignType: campaignTypeSchema.optional(),
  campaign_type: campaignTypeSchema.optional(),
  PricingModel: pricingModelSchema.optional(),
  pricing_model: pricingModelSchema.optional(),
  PlacementKey: z.string().optional(),
  placement_key: z.string().optional(),
  Status: z.string().optional(),
  status: z.string().optional(),
  DailyBudgetMicros: z.number().int().nonnegative().optional(),
  daily_budget_micros: z.number().int().nonnegative().optional(),
  DailySpendMicros: z.number().int().nonnegative().optional(),
  daily_spend_micros: z.number().int().nonnegative().optional(),
  CPMMicros: z.number().int().nonnegative().optional(),
  cpm_micros: z.number().int().nonnegative().optional(),
  RejectionReason: z.string().optional(),
  rejection_reason: z.string().optional(),
  StartsAt: z.string().optional(),
  starts_at: z.string().optional(),
  EndsAt: z.string().optional(),
  ends_at: z.string().optional(),
});

export type AdCampaign = z.infer<typeof adCampaignSchema>;

const placementRateSchema = z.looseObject({
  ID: z.number().int().positive().optional(),
  id: z.number().int().positive().optional(),
  PlacementKey: z.string().optional(),
  placement_key: z.string().optional(),
  CampaignType: campaignTypeSchema.optional(),
  campaign_type: campaignTypeSchema.optional(),
  PricingModel: pricingModelSchema.optional(),
  pricing_model: pricingModelSchema.optional(),
  CPMMicros: z.number().int().nonnegative().optional(),
  cpm_micros: z.number().int().nonnegative().optional(),
  DailyFlatPriceMicros: z.number().int().nonnegative().optional(),
  daily_flat_price_micros: z.number().int().nonnegative().optional(),
  EffectiveFrom: z.string().optional(),
  effective_from: z.string().optional(),
  Status: z.string().optional(),
  status: z.string().optional(),
});

export type PlacementRate = z.infer<typeof placementRateSchema>;

const decisionSchema = z.object({
  decision_id: z.string().min(1),
  request_id: z.string().min(1),
  campaign_id: z.number().int().positive(),
  product_id: z.number().int().positive(),
  placement_key: z.string().min(1),
  reserved_cost_micros: z.number().int().nonnegative(),
  decided_at: z.string(),
  expires_at: z.string(),
});

export type AdDecision = z.infer<typeof decisionSchema>;

const eventReceiptSchema = z.object({
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
	adDecision: async (payload: { request_id: string; placement_key: string }, token?: string | null): Promise<AdDecision | null> => {
		const response = await request("/api/v1/ads/decisions", { method: "POST", token: token ?? undefined, body: JSON.stringify(payload) });
    return response === undefined ? null : decisionSchema.parse(response);
  },
  sellerAdReports: (token: string, marketID?: number | null) => requestParsed(z.array(z.object({
    campaign_id: z.number().int().positive(), impressions: z.number().int().nonnegative(), clicks: z.number().int().nonnegative(),
    spend_micros: z.number().int().nonnegative(), attributed_orders: z.number().int().nonnegative(), revenue_micros: z.number().int().nonnegative(),
  })), `/api/v1/seller/ads/reports${marketQuery(marketID)}`, { token }),
	recordAdEvent: (payload: { event_id: string; decision_id: string; type: string; occurred_at: string }, token?: string | null) =>
		requestParsed(eventReceiptSchema, "/api/v1/ads/events", { method: "POST", token: token ?? undefined, keepalive: true, body: JSON.stringify(payload) }),
};
