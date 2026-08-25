import { describe, expect, it } from "vitest";
import { campaignBudgetMicros, campaignID, campaignName, campaignStatus, rateCPMMicros } from "./advertising-view";

describe("advertising view adapters", () => {
  it("normalizes the Go JSON contract used by campaign screens", () => {
    const campaign = { ID: 12, Name: "추천 피드", Status: "UNDER_REVIEW", DailyBudgetMicros: 50_000 };

    expect(campaignID(campaign)).toBe(12);
    expect(campaignName(campaign)).toBe("추천 피드");
    expect(campaignStatus(campaign)).toBe("UNDER_REVIEW");
    expect(campaignBudgetMicros(campaign)).toBe(50_000);
  });

  it("supports the snake-case form for a future stable response contract", () => {
    expect(rateCPMMicros({ cpm_micros: 10_000 })).toBe(10_000);
  });
});
