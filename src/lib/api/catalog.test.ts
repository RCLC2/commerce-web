import { afterEach, describe, expect, it, vi } from "vitest";
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
