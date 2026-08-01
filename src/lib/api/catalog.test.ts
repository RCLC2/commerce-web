import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiHttpError } from "../api-client";
import { catalogApi } from "./catalog";

describe("catalogApi.listHomeCategoryChips", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses ten preview chips only when the backend endpoint returns 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not found", { status: 404 })));

    const chips = await catalogApi.listHomeCategoryChips();

    expect(chips).toHaveLength(10);
    expect(chips.filter((chip) => chip.chip_type === "CATEGORY_EVENT")).toHaveLength(2);
    expect(chips.at(-1)?.href).toMatch(/^\/events\//);
  });

  it("does not hide non-404 backend failures with dummy data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("failure", { status: 500 })));

    await expect(catalogApi.listHomeCategoryChips()).rejects.toMatchObject({ status: 500 });
  });
});

describe("catalogApi.listRecommendedProducts", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends limit and offset for infinite scrolling", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await catalogApi.listRecommendedProducts({ limit: 12, offset: 24 });

    expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/products/recommendations?limit=12&offset=24");
  });

  it("pages preview products when the backend endpoint returns 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(
      () => Promise.resolve(new Response("not found", { status: 404 })),
    ));

    const firstPage = await catalogApi.listRecommendedProducts({ limit: 12, offset: 0 });
    const lastPage = await catalogApi.listRecommendedProducts({ limit: 12, offset: 24 });

    expect(firstPage).toHaveLength(12);
    expect(lastPage).toHaveLength(6);
    expect(new Set([...firstPage, ...lastPage].map((product) => product.id)).size).toBe(18);
  });
});

describe("catalogApi home preview fallbacks", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows event and section previews when their endpoints return 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(
      () => Promise.resolve(new Response("not found", { status: 404 })),
    ));

    const [events, sections, popular, latest] = await Promise.all([
      catalogApi.listEvents(),
      catalogApi.listHomeSections(),
      catalogApi.listPopularProducts(),
      catalogApi.listLatestProducts(),
    ]);

    expect(events).toHaveLength(2);
    expect(sections).toHaveLength(2);
    expect(popular).toHaveLength(10);
    expect(latest).toHaveLength(10);
  });
});

describe("catalogApi event detail preview", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("resolves a known preview event and its products on 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(
      () => Promise.resolve(new Response("not found", { status: 404 })),
    ));

    const [event, products] = await Promise.all([
      catalogApi.getEvent(91002),
      catalogApi.listProducts({ sort: "popular" }),
    ]);

    expect(event.title).toBe("액세서리 데이");
    expect(products).toHaveLength(30);
  });

  it("does not invent an unknown event on 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(
      () => Promise.resolve(new Response("not found", { status: 404 })),
    ));

    await expect(catalogApi.getEvent(99999)).rejects.toMatchObject({ status: 404 });
  });
});

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
    expect(information.realtime_popular_carousel.products[0].realtime_popularity_score).toBeTypeOf("number");
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

describe("PLP API fallback", () => {
  it("returns paginated dummy PLP data only when the backend endpoint is 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response("not found", { status: 404 }))));

    const information = await catalogApi.getPLPInformation();
    const page = await catalogApi.listPLPProducts({ page: 1, pageSize: 5, shipping: "free" });

    expect(information.categories.length).toBeGreaterThan(0);
    expect(information.price_ranges.map((item) => item.code)).toContain("30000-50000");
    expect(information.sort_options.map((item) => item.code)).toContain(information.default_sort);
    expect(information.is_dummy).toBe(true);
    expect(page.items).toHaveLength(5);
    expect(page.is_dummy).toBe(true);
    expect(page.items.every((product) => product.shipping_type === "FREE")).toBe(true);
    expect(page.total_pages).toBeGreaterThan(1);
  });

  it("does not hide a backend 500 with dummy data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("server error", { status: 500 })));

    await expect(catalogApi.getPLPInformation()).rejects.toMatchObject({ status: 500 });
  });
});
