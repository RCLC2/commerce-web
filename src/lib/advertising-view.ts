import type { AdCampaign, PlacementRate } from "./api/advertising";

export function campaignID(campaign: AdCampaign) {
  return campaign.id ?? campaign.ID ?? 0;
}

export function campaignName(campaign: AdCampaign) {
  return campaign.name ?? campaign.Name ?? "이름 없는 캠페인";
}

export function campaignStatus(campaign: AdCampaign) {
  return campaign.status ?? campaign.Status ?? "DRAFT";
}

export function campaignType(campaign: AdCampaign) {
  return campaign.campaign_type ?? campaign.CampaignType ?? "SPONSORED_FEED";
}

export function campaignBudgetMicros(campaign: AdCampaign) {
  return campaign.daily_budget_micros ?? campaign.DailyBudgetMicros ?? 0;
}

export function campaignSpendMicros(campaign: AdCampaign) {
  return campaign.daily_spend_micros ?? campaign.DailySpendMicros ?? 0;
}

export function ratePlacement(rate: PlacementRate) {
  return rate.placement_key ?? rate.PlacementKey ?? "";
}

export function rateCampaignType(rate: PlacementRate) {
  return rate.campaign_type ?? rate.CampaignType ?? "";
}

export function rateCPMMicros(rate: PlacementRate) {
  return rate.cpm_micros ?? rate.CPMMicros ?? 0;
}
