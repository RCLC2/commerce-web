import { afterEach, describe, expect, it, vi } from "vitest";
import { catalogApi } from "./catalog";

afterEach(() => vi.unstubAllGlobals());

describe("catalogApi backend contracts", () => {
  it("keeps home category chip 404 errors visible", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not found", { status: 404 })));
    await expect(catalogApi.listHomeCategoryChips()).rejects.toMatchObject({ status: 404 });
  });

  it("sends limit and offset for recommendation infinite scrolling", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await catalogApi.listRecommendedProducts({ limit: 12, offset: 24 });
    expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/products/recommendations?limit=12&offset=24");
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
});
