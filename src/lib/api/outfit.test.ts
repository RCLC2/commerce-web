import { afterEach, describe, expect, it, vi } from "vitest";
import { createOutfitLook } from "@/test/outfit-fixture";
import { outfitApi, parseTodayOutfitResponse } from "./outfit";

afterEach(() => vi.unstubAllGlobals());

describe("today outfit API contract", () => {
  it("accepts exactly seven unique actual products and restores canonical slot order", () => {
    const look = createOutfitLook();
    const response = parseTodayOutfitResponse({
      weather_profile: "MILD",
      generated_at: "2026-09-05T02:30:00Z",
      looks: [{ ...look, items: [...look.items].reverse() }],
    });

    expect(response.looks[0].items.map((item) => item.slot)).toEqual([
      "head", "accessory", "outer", "top", "bottom", "bag", "shoes",
    ]);
    expect(new Set(response.looks[0].items.map((item) => item.product.id)).size).toBe(7);
  });

  it("rejects duplicate product and slot assignments", () => {
    const look = createOutfitLook();
    const invalidItems = look.items.map((item) => ({ ...item, product: { ...item.product } }));
    invalidItems[1].slot = invalidItems[0].slot;
    invalidItems[2].product.id = invalidItems[0].product.id;

    expect(() => parseTodayOutfitResponse({
      weather_profile: "MILD",
      generated_at: "2026-09-05T02:30:00Z",
      looks: [{ ...look, items: invalidItems }],
    })).toThrow();
  });

  it("requests the current weather values from the public outfit endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      weather_profile: "RAIN",
      generated_at: "2026-09-05T02:30:00Z",
      looks: [createOutfitLook()],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await outfitApi.getTodayOutfit({
      temperature: 18.5,
      apparentTemperature: 17.2,
      weatherCode: 61,
      precipitationProbability: 80,
    });

    expect(fetchMock.mock.calls[0][0]).toContain(
      "/api/v1/outfits/today?temperature=18.5&apparent_temperature=17.2&weather_code=61&precipitation_probability=80",
    );
  });
});
