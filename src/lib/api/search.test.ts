import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiHttpError } from "../api-client";
import { searchApi } from "./search";

describe("searchApi 404 fallback", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns paginated dummy search content only for 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not found", { status: 404 })));

    const response = await searchApi.search({ q: "shirt", productPage: 2, marketPage: 1, pageSize: 12 });

    expect(response.products.page).toBe(2);
    expect(response.products.total).toBe(27);
    expect(response.products.items).toHaveLength(12);
    expect(response.markets.items).toHaveLength(4);
    expect(response.markets.page_size).toBe(4);
    expect(response.markets.items.map((market) => market.popular_products?.length)).toEqual([2, 3, 3, 1]);
    expect(response.sections.map((section) => section.section_type)).toEqual(["PRODUCT_CAROUSEL", "MARKET_CAROUSEL"]);
    expect(response.related_keywords.every((keyword) => keyword.endsWith("shirt"))).toBe(true);
  });

  it("does not hide non-404 backend failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("server error", { status: 500 })));

    await expect(searchApi.search({ q: "shirt" })).rejects.toEqual(expect.any(ApiHttpError));
  });

  it("provides women and men trending chips when trending endpoint is 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not found", { status: 404 })));

    const response = await searchApi.trendingSearches("women");

    expect(response.segments.map((segment) => segment.id)).toEqual(["women", "men"]);
    expect(response.items.some((item) => item.trend === "DOWN")).toBe(true);
  });
});
