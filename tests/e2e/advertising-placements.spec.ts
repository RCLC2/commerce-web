import { expect, test, type Page } from "@playwright/test";
import type { AdPlacement } from "../../src/lib/api/advertising";

const visualPlacements: AdPlacement[] = [
  "home.main_banner",
  "home_feed.sponsored_card",
  "search.sponsored_top",
  "pdp.card_banner",
  "pdp.sponsored_market",
  "home.promotion_card",
];

test("six home and commerce placements disclose sponsorship and preserve decision event identity", async ({ page }) => {
  test.setTimeout(60_000);

  const decisionRequests = new Map<AdPlacement, string>();
  const events: Array<{ decision_id: string; type: string }> = [];

  await page.route("**/api/v1/ads/decisions", async (route) => {
    const request = route.request().postDataJSON() as { request_id: string; placement_key: AdPlacement };
    decisionRequests.set(request.placement_key, request.request_id);
    if (request.placement_key === "crm.push_notification") {
      await route.fulfill({ status: 204, body: "" });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", json: decisionFor(request.placement_key, request.request_id) });
  });
  await page.route("**/api/v1/ads/events", async (route) => {
    events.push(route.request().postDataJSON() as { decision_id: string; type: string });
    await route.fulfill({ status: 202, contentType: "application/json", json: { duplicate: false, billable: true, charge_micros: 1_000 } });
  });

  await page.goto("/");
  await exposePlacement(page, "home.main_banner");
  await exposePlacement(page, "home_feed.sponsored_card");
  await exposePlacement(page, "home.promotion_card");

  await page.goto("/search?q=셔츠");
  const searchAd = await exposePlacement(page, "search.sponsored_top");
  await searchAd.getByRole("link").click();
  await expect.poll(() => events.filter((event) => event.decision_id === decisionID("search.sponsored_top") && event.type === "CLICK").length).toBe(1);

  await page.goto("/products/1");
  await exposePlacement(page, "pdp.card_banner");
  await exposePlacement(page, "pdp.sponsored_market");

  expect([...decisionRequests.keys()]).toEqual(expect.arrayContaining(visualPlacements));
  for (const placement of visualPlacements) {
    expect(decisionRequests.get(placement)).toMatch(/^ads-/);
    const impressionType = placement === "home.promotion_card" ? "PROMOTION_CARD_IMPRESSION" : "IMPRESSION";
    await expect.poll(() => events.filter((event) => event.decision_id === decisionID(placement) && event.type === impressionType).length).toBe(1);
  }
});

async function exposePlacement(page: Page, placement: AdPlacement) {
  const root = page.locator(`[data-ad-placement="${placement}"]`);
  await expect(root).toBeVisible();
  await expect(root.getByText("SPONSORED", { exact: true })).toHaveCount(1);
  await root.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1_100);
  return root;
}

function decisionFor(placement: AdPlacement, requestID: string) {
  const product = {
    id: 1,
    market_id: 1,
    market_name: "mood studio",
    name: "광고 상품",
    image_url: "https://images.pexels.com/photos/994523/pexels-photo-994523.jpeg",
    base_price: 50_000,
    discount_price: 40_000,
  };
  const common = {
    decision_id: decisionID(placement),
    request_id: requestID,
    campaign_id: 100,
    placement_key: placement,
    decided_at: "2026-08-29T00:00:00Z",
    expires_at: "2026-08-29T00:15:00Z",
  };
  if (placement === "pdp.sponsored_market") {
    return {
      ...common,
      target: { type: "MARKET", market: { id: 1, name: "mood studio", description: "추천 마켓", products: [product] } },
      creative: { id: 105, format: "MARKET_SHELF", landing_url: "/markets/1" },
    };
  }
  if (placement === "home.main_banner" || placement === "pdp.card_banner") {
    return {
      ...common,
      target: { type: "PRODUCT", product },
      creative: {
        id: placement === "home.main_banner" ? 101 : 104,
        format: "BANNER",
        headline: "이번 주 추천",
        image_url: "https://images.pexels.com/photos/994523/pexels-photo-994523.jpeg",
        landing_url: "/products/1",
        cta_label: "자세히 보기",
      },
    };
  }
  if (placement === "home.promotion_card") {
    return {
      ...common,
      target: { type: "PRODUCT", product },
      creative: { id: 106, format: "PROMOTION_CARD", headline: "오늘의 추천", body: "광고 상품을 확인해 보세요", landing_url: "/products/1" },
    };
  }
  return {
    ...common,
    target: { type: "PRODUCT", product },
    creative: { id: placement === "home_feed.sponsored_card" ? 102 : 103, format: "PRODUCT_CARD", landing_url: "/products/1" },
  };
}

function decisionID(placement: AdPlacement) {
  return `decision-${placement.replaceAll(".", "-")}`;
}
