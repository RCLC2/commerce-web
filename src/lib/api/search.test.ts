import { afterEach, describe, expect, it, vi } from "vitest";
import { searchApi } from "./search";

afterEach(() => vi.unstubAllGlobals());

describe("searchApi backend contracts", () => {
  it("keeps search, suggestion, and trending 404 errors visible", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response("not found", { status: 404 }))));
    await expect(searchApi.search({ q: "shirt" })).rejects.toMatchObject({ status: 404 });
    await expect(searchApi.searchSuggestions("shirt")).rejects.toMatchObject({ status: 404 });
    await expect(searchApi.trendingSearches("women")).rejects.toMatchObject({ status: 404 });
  });
});
