import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiContractError } from "../api-client";
import { adDecisionSchema, advertisingApi } from "./advertising";

afterEach(() => vi.unstubAllGlobals());

describe("advertising API contract", () => {
  it("parses each creative format as a discriminated union", () => {
    const variants = [
      { placement: "home_feed.sponsored_card", target: productTarget(), creative: { format: "PRODUCT_CARD", landing_url: "/products/7" } },
      { placement: "home.main_banner", target: productTarget(), creative: { format: "BANNER", headline: "주간 추천", image_url: "https://images.pexels.com/banner.jpg", landing_url: "/products/7", cta_label: "자세히 보기" } },
      { placement: "pdp.sponsored_market", target: marketTarget(), creative: { format: "MARKET_SHELF", landing_url: "/markets/3" } },
      { placement: "crm.in_app_notification", target: productTarget(), creative: { format: "IN_APP", headline: "새 소식", body: "추천 상품을 확인하세요", landing_url: "/products/7" } },
      { placement: "crm.push_notification", target: productTarget(), creative: { format: "PUSH", headline: "새 소식", body: "추천 상품을 확인하세요", landing_url: "/products/7" } },
    ] as const;

    for (const [index, variant] of variants.entries()) {
      const decision = productDecision({ id: index + 1, ...variant.creative });
      decision.placement_key = variant.placement;
      decision.target = variant.target;
      const parsed = adDecisionSchema.parse(decision);
      expect(parsed.creative.format).toBe(variant.creative.format);
    }
  });

  it("rejects a creative or target that does not match the placement contract", () => {
    const wrongCreative = productDecision({ id: 1, format: "BANNER", headline: "배너", image_url: "https://images.pexels.com/banner.jpg", landing_url: "/products/7", cta_label: "보기" });
    const creativeResult = adDecisionSchema.safeParse(wrongCreative);
    expect(creativeResult.success).toBe(false);
    if (!creativeResult.success) expect(creativeResult.error.issues.at(-1)?.path).toEqual(["creative", "format"]);

    const wrongTarget = productDecision({ id: 2, format: "PRODUCT_CARD", landing_url: "/products/7" });
    wrongTarget.target = marketTarget();
    const targetResult = adDecisionSchema.safeParse(wrongTarget);
    expect(targetResult.success).toBe(false);
    if (!targetResult.success) expect(targetResult.error.issues.at(-1)?.path).toEqual(["target", "type"]);
  });

  it("rejects malformed target and incomplete Pexels attribution with exact issue paths", () => {
    const malformedTarget = productDecision({ id: 1, format: "PRODUCT_CARD", landing_url: "/products/7" });
    malformedTarget.target = { type: "PRODUCT", market: marketTarget().market };
    expect(() => adDecisionSchema.parse(malformedTarget)).toThrow();

    const incompleteAttribution = productDecision({
      id: 2,
      format: "BANNER",
      headline: "주간 추천",
      image_url: "https://images.pexels.com/banner.jpg",
      landing_url: "/products/7",
      cta_label: "자세히 보기",
      pexels_photo_id: 44,
    });
    const result = adDecisionSchema.safeParse(incompleteAttribution);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(["creative", "pexels_photo_id"]);
  });

  it("returns null for 204 and includes cookie credentials and the optional token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(advertisingApi.adDecision({ request_id: "request-1", placement_key: "home.main_banner" }, "member-token")).resolves.toBeNull();

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.credentials).toBe("include");
    expect(new Headers(options.headers).get("Authorization")).toBe("Bearer member-token");
  });

  it("uses the common contract error instead of a raw Zod error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ decision_id: "broken" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })));

    await expect(advertisingApi.adDecision({ request_id: "request-2", placement_key: "search.sponsored_top" })).rejects.toBeInstanceOf(ApiContractError);
  });

  it("sends event requests with credentials, token, and keepalive", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ duplicate: false, billable: true, charge_micros: 5000 }), {
      status: 202,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await advertisingApi.recordAdEvent({
      event_id: "event-1",
      decision_id: "decision-1",
      type: "CLICK",
      occurred_at: "2026-08-29T00:00:00Z",
    }, "member-token");

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.credentials).toBe("include");
    expect(options.keepalive).toBe(true);
    expect(new Headers(options.headers).get("Authorization")).toBe("Bearer member-token");
  });
});

function productDecision(creative: Record<string, unknown>): Record<string, unknown> {
  return {
    decision_id: "decision-1",
    request_id: "request-1",
    campaign_id: 5,
    placement_key: "home_feed.sponsored_card",
    target: {
      type: "PRODUCT",
      product: {
        id: 7,
        market_id: 3,
        market_name: "테스트 마켓",
        name: "테스트 상품",
        image_url: "https://images.pexels.com/product.jpg",
        base_price: 50_000,
        discount_price: 40_000,
      },
    },
    creative,
    decided_at: "2026-08-29T00:00:00Z",
    expires_at: "2026-08-29T00:15:00Z",
  };
}

function marketTarget() {
  return {
    type: "MARKET" as const,
    market: {
      id: 3,
      name: "테스트 마켓",
      products: [],
    },
  };
}

function productTarget() {
  return productDecision({ id: 1, format: "PRODUCT_CARD", landing_url: "/products/7" }).target;
}
