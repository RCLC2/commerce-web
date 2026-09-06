import { afterEach, describe, expect, it, vi } from "vitest";
import { homePlacementApi, homePlacementsSchema, homeSlotSchema } from "./home-placements";

afterEach(() => vi.unstubAllGlobals());

describe("home placement API contract", () => {
  it("parses an eligible coupon card and one unified product ad", () => {
    const result = homePlacementsSchema.parse({
      context_text: {
        status: "FILLED",
        card: {
          source: "PLATFORM",
          id: 9,
          card_type: "SIGNUP_COUPON",
          headline: "가입 기념 쿠폰이 도착했어요",
          coupon_id: 3,
          cta_label: "쿠폰 받기",
          landing_url: "/mypage/coupons",
        },
      },
      feature_card: {
        status: "FILLED",
        card: {
          source: "AD",
          card_type: "PRODUCT_CARD",
          decision: {
            decision_id: "decision-1",
            request_id: "home-1",
            campaign_id: 4,
            placement_key: "home.feature_card",
            target: {
              type: "PRODUCT",
              product: {
                id: 7,
                market_id: 2,
                market_name: "테스트 마켓",
                name: "추천 상품",
                base_price: 20_000,
                discount_price: 18_000,
              },
            },
            creative: { id: 5, format: "PRODUCT_CARD", landing_url: "/products/7" },
            decided_at: "2026-09-06T01:00:00Z",
            expires_at: "2026-09-06T01:05:00Z",
          },
        },
      },
    });

    expect(result.context_text.card?.source).toBe("PLATFORM");
    expect(result.feature_card.card?.source).toBe("AD");
  });

  it("rejects a filled slot without a card", () => {
    const result = homePlacementsSchema.safeParse({
      context_text: { status: "FILLED" },
      feature_card: { status: "EMPTY" },
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(["context_text", "card"]);
  });

  it("parses a PDP review banner with an eligible signup coupon", () => {
	const slot = homeSlotSchema.parse({
	  status: "FILLED",
	  card: {
		source: "PLATFORM",
		id: 12,
		card_type: "SIGNUP_COUPON",
		headline: "가입 축하 쿠폰이 도착했어요",
		coupon_id: 3,
		cta_label: "쿠폰 받기",
		landing_url: "/mypage/coupons",
	  },
	});
	expect(slot.card?.card_type).toBe("SIGNUP_COUPON");
  });

  it("requests the product review banner with credentials and request ID", async () => {
	const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "EMPTY" }), { status: 200 }));
	vi.stubGlobal("fetch", fetchMock);

	await homePlacementApi.pdpReviewBanner(7, "pdp-review-1", "member-token");

	const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
	expect(url).toContain("/api/v1/products/7/review-banner?request_id=pdp-review-1");
	expect(options.credentials).toBe("include");
	expect(new Headers(options.headers).get("Authorization")).toBe("Bearer member-token");
  });
});
