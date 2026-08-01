import { afterEach, describe, expect, it, vi } from "vitest";
import { catalogApi } from "./catalog";

afterEach(() => {
  vi.unstubAllGlobals();
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
