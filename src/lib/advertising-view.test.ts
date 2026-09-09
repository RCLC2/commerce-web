import { describe, expect, it } from "vitest";
import type { AdCampaign, PlacementRate } from "./api/advertising";
import {
  campaignBudgetMicros,
  campaignFormat,
  campaignID,
  campaignName,
  campaignStatus,
  ratePriceMicros,
  ratePricingModel,
} from "./advertising-view";

describe("advertising view adapters", () => {
  it("reads the stable snake-case campaign contract", () => {
    const campaign = {
      id: 12,
      name: "추천 피드",
      status: "UNDER_REVIEW",
      daily_budget_micros: 50_000,
      creative: { format: "PRODUCT_CARD" },
    } as AdCampaign;

    expect(campaignID(campaign)).toBe(12);
    expect(campaignName(campaign)).toBe("추천 피드");
    expect(campaignStatus(campaign)).toBe("UNDER_REVIEW");
    expect(campaignBudgetMicros(campaign)).toBe(50_000);
    expect(campaignFormat(campaign)).toBe("PRODUCT_CARD");
  });

  it("derives the displayed price from the pricing model", () => {
    const cpm = { pricing_model: "CPM", cpm_micros: 10_000, daily_flat_price_micros: 0 } as PlacementRate;
    const flat = { pricing_model: "DAILY_FLAT", cpm_micros: 0, daily_flat_price_micros: 90_000 } as PlacementRate;

    expect(ratePricingModel(cpm)).toBe("CPM");
    expect(ratePriceMicros(cpm)).toBe(10_000);
    expect(ratePriceMicros(flat)).toBe(90_000);
  });
});
