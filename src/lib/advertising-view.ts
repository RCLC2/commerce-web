import type { AdCampaign, PlacementRate } from "./api/advertising";

export function campaignID(campaign: AdCampaign) {
  return campaign.id;
}

export function campaignName(campaign: AdCampaign) {
  return campaign.name;
}

export function campaignStatus(campaign: AdCampaign) {
  return campaign.status;
}

export function campaignFormat(campaign: AdCampaign) {
  return campaign.creative.format;
}

export function campaignBudgetMicros(campaign: AdCampaign) {
  return campaign.daily_budget_micros;
}

export function campaignSpendMicros(campaign: AdCampaign) {
  return campaign.daily_spend_micros;
}

export function ratePlacement(rate: PlacementRate) {
  return rate.placement_key;
}

export function ratePricingModel(rate: PlacementRate) {
  return rate.pricing_model;
}

export function ratePriceMicros(rate: PlacementRate) {
  return rate.pricing_model === "DAILY_FLAT" ? rate.daily_flat_price_micros : rate.cpm_micros;
}
