import { expect, test, type Page } from "@playwright/test";
import type { AdPlacement } from "../../src/lib/api/advertising";

const visualPlacements: AdPlacement[] = [
  "home.feature_card",
  "search.sponsored_top",
];

test("the unified home card and search placement disclose sponsorship and preserve decision event identity", async ({ page }) => {
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
  await page.route("**/api/v1/home/placements?**", async (route) => {
    const requestID = new URL(route.request().url()).searchParams.get("request_id") ?? "";
    decisionRequests.set("home.feature_card", requestID);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      json: {
        context_text: { status: "EMPTY" },
        feature_card: {
          status: "FILLED",
          card: {
            source: "AD",
            card_type: "PRODUCT_CARD",
            decision: decisionFor("home.feature_card", requestID),
          },
        },
      },
    });
  });
  await page.route("**/api/v1/ads/events", async (route) => {
    events.push(route.request().postDataJSON() as { decision_id: string; type: string });
    await route.fulfill({ status: 202, contentType: "application/json", json: { duplicate: false, billable: true, charge_micros: 1_000 } });
  });

  await page.goto("/");
  await exposePlacement(page, "home.feature_card");

  await page.goto("/search?q=셔츠");
  const searchAd = await exposePlacement(page, "search.sponsored_top");
  await searchAd.getByRole("link").click();
  await expect.poll(() => events.filter((event) => event.decision_id === decisionID("search.sponsored_top") && event.type === "CLICK").length).toBe(1);

  expect([...decisionRequests.keys()]).toEqual(expect.arrayContaining(visualPlacements));
  for (const placement of visualPlacements) {
    expect(decisionRequests.get(placement)).toMatch(placement === "home.feature_card" ? /^home-/ : /^ads-/);
    await expect.poll(() => events.filter((event) => event.decision_id === decisionID(placement) && event.type === "IMPRESSION").length).toBe(1);
  }
});

async function exposePlacement(page: Page, placement: AdPlacement) {
  const root = page.locator(`[data-ad-placement="${placement}"]`);
  await expect(root).toBeVisible();
  await expect(root.getByText("광고", { exact: true })).toHaveCount(1);
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
  return {
    ...common,
    target: { type: "PRODUCT", product },
    creative: { id: placement === "home.feature_card" ? 102 : 103, format: "PRODUCT_CARD", landing_url: "/products/1" },
  };
}

function decisionID(placement: AdPlacement) {
  return `decision-${placement.replaceAll(".", "-")}`;
}
