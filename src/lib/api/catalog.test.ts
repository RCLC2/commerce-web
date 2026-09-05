import { afterEach, describe, expect, it, vi } from "vitest";
import { catalogApi } from "./catalog";

afterEach(() => vi.unstubAllGlobals());

describe("catalogApi backend contracts", () => {
  it("rejects product badge tones outside the public five-tone contract", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([{
      id: 1,
      market_id: 2,
      category_id: 3,
      name: "상품",
      description: "설명",
      base_price: 10_000,
      status: "SELLING",
      market: { id: 2, name: "마켓" },
      tag_chips: [{ code: "PROMOTION", label: "프로모션", tone: "promotion" }],
    }]), { status: 200 })));

    try {
      await catalogApi.listPopularProducts();
      throw new Error("expected listPopularProducts to fail");
    } catch (error) {
      expect(error).toMatchObject({ kind: "contract", endpoint: "/api/v1/products/popular" });
      expect((error as { issues: Array<{ path: PropertyKey[] }> }).issues[0]?.path)
        .toEqual([0, "tag_chips", 0, "tone"]);
    }
  });

  it("keeps home category chip 404 errors visible", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not found", { status: 404 })));
    await expect(catalogApi.listHomeCategoryChips()).rejects.toMatchObject({ status: 404 });
  });

  it("requests explicitly popular markets for discovery surfaces", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await catalogApi.listMarkets({ sort: "popular", limit: 12 });
    expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/markets?sort=popular&limit=12");
  });

  it("does not replace category, PLP, product, or event 404 responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response("not found", { status: 404 }))));
    await expect(catalogApi.getCategoryInformation({ category: "outer" })).rejects.toMatchObject({ status: 404 });
    await expect(catalogApi.getPLPInformation()).rejects.toMatchObject({ status: 404 });
    await expect(catalogApi.getProduct(1)).rejects.toMatchObject({ status: 404 });
    await expect(catalogApi.getEvent(1)).rejects.toMatchObject({ status: 404 });
  });

  it("accepts active carousels with an empty image and open schedule", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([{
      id: 1, title: "상시 캐러셀", image_url: null, link_url: "", status: "ACTIVE",
      starts_at: null, ends_at: null,
    }]), { status: 200 })));
    const carousels = await catalogApi.listActiveCarousels();
    expect(carousels[0]).toMatchObject({ image_url: "", starts_at: null, ends_at: null });
  });

  it("accepts events whose exposure schedule is open", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([{
      id: 1, title: "상시 이벤트", subtitle: "", image_url: "", link_url: "", status: "ACTIVE",
      starts_at: null, ends_at: null,
    }]), { status: 200 })));
    const events = await catalogApi.listEvents();
    expect(events[0]).toMatchObject({ starts_at: null, ends_at: null });
  });

  it("reads and mutates market follow state through the same route", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ following: false }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(catalogApi.getMarketFollowStatus("token", 3)).resolves.toEqual({ following: false });
    await catalogApi.followMarket("token", 3);
    await catalogApi.unfollowMarket("token", 3);

    expect(fetchMock.mock.calls.map((call) => {
      const url = new URL(String(call[0]));
      return [url.pathname, call[1]?.method ?? "GET"];
    })).toEqual([
      ["/api/v1/markets/3/follow", "GET"],
      ["/api/v1/markets/3/follow", "POST"],
      ["/api/v1/markets/3/follow", "DELETE"],
    ]);
  });
});
