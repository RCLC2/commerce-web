import { afterEach, describe, expect, it, vi } from "vitest";
import { customerApi } from "./customer";

afterEach(() => vi.unstubAllGlobals());

const product = {
  id: 31,
  market_id: 8,
  category_id: 2,
  name: "린넨 셔츠",
  description: "가벼운 셔츠",
  base_price: 49000,
  discount_price: 0,
  coupon_lowest_price: 0,
  shipping_type: "NORMAL",
  popularity_score: 12,
  status: "SELLING",
  market_name: "아틀리에 팔",
};

describe("customer discovery contracts", () => {
  it("loads hydrated member recommendations with an explicit limit", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([{
      member_id: 7,
      product_id: 31,
      score: 0.91,
      rank: 1,
      reason_code: "PREFERRED_MARKET",
      algorithm: "hybrid_v1",
      source: "BATCH",
      generated_at: "2026-09-05T03:00:00Z",
      product,
    }]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const recommendations = await customerApi.listMyRecommendations("token", 12);

    expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/me/recommendations?limit=12");
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get("Authorization")).toBe("Bearer token");
    expect(recommendations[0]).toMatchObject({ source: "BATCH", product: { id: 31 } });
  });

  it("passes an opaque market-feed cursor without interpreting it", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      items: [{
        market: { id: 8, name: "아틀리에 팔", follower_count: 1520 },
        product,
        published_at: "2026-09-05T03:00:00Z",
      }],
      next_cursor: "opaque+/=cursor",
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const feed = await customerApi.listMarketFeed("token", { limit: 20, cursor: "previous+/=cursor" });

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.pathname).toBe("/api/v1/me/market-feed");
    expect(url.searchParams.get("limit")).toBe("20");
    expect(url.searchParams.get("cursor")).toBe("previous+/=cursor");
    expect(feed).toMatchObject({ items: [{ product: { id: 31 } }], next_cursor: "opaque+/=cursor" });
  });
});
