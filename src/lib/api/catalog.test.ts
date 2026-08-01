import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiHttpError } from "../api-client";
import { catalogApi } from "./catalog";

describe("category information fallback", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses demo data only when CategoryInformation returns 404", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("not found", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    const information = await catalogApi.getCategoryInformation({ category: "outer", page: 1, pageSize: 8 });

    expect(information.is_demo).toBe(true);
    expect(information.selected_category.slug).toBe("outer");
    expect(information.bundle_label).toBe("3개 카테고리 묶음");
    expect(information.realtime_popular_carousel.products.length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("uses server-shaped market demos only when market APIs return 404", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => new Response("not found", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    const market = await catalogApi.getMarket(101);
    const products = await catalogApi.listProducts({ marketID: 101 });

    expect(market.id).toBe(101);
    expect(products.length).toBeGreaterThan(0);
    expect(products[0].market?.id).toBe(101);
    expect(products[0].tag_chips?.length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not hide server errors behind demo data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("server error", { status: 500 })));

    await expect(catalogApi.getCategoryInformation({ category: "outer" })).rejects.toEqual(
      expect.objectContaining<ApiHttpError>({ status: 500 }),
    );
  });
});
