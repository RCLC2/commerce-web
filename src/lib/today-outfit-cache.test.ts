import { beforeEach, describe, expect, it } from "vitest";
import { createOutfitLook } from "@/test/outfit-fixture";
import type { TodayOutfitResponse, TodayOutfitWeather } from "./today-outfit";
import { readTodayOutfitCache, writeTodayOutfitCache } from "./today-outfit-cache";

const weather: TodayOutfitWeather = {
  temperature: 21,
  apparentTemperature: 20,
  weatherCode: 1,
  precipitationProbability: 10,
};

function response(refreshPending = false): TodayOutfitResponse {
  return {
    weather_profile: "MILD",
    generated_at: "2026-09-15T01:00:00Z",
    refresh_pending: refreshPending,
    looks: Array.from({ length: 5 }, (_, index) => createOutfitLook(index + 1)),
  };
}

beforeEach(() => localStorage.clear());

describe("today outfit daily cache", () => {
  it("keeps a completed response until the next browser-local midnight", () => {
    const writtenAt = new Date(2026, 8, 15, 23, 50);
    writeTodayOutfitCache(localStorage, weather, response(), writtenAt);

    expect(readTodayOutfitCache(localStorage, weather, new Date(2026, 8, 15, 23, 59))).toBeDefined();
    expect(readTodayOutfitCache(localStorage, weather, new Date(2026, 8, 16, 0, 0))).toBeUndefined();
  });

  it("expires a pending fallback after at most five minutes", () => {
    const writtenAt = new Date(2026, 8, 15, 10, 0);
    writeTodayOutfitCache(localStorage, weather, response(true), writtenAt);

    expect(readTodayOutfitCache(localStorage, weather, new Date(2026, 8, 15, 10, 4, 59))).toBeDefined();
    expect(readTodayOutfitCache(localStorage, weather, new Date(2026, 8, 15, 10, 5))).toBeUndefined();
  });

  it("discards malformed and weather-mismatched entries", () => {
    localStorage.setItem("commerce.today-outfit.v1", "not-json");
    expect(readTodayOutfitCache(localStorage, weather)).toBeUndefined();

    writeTodayOutfitCache(localStorage, weather, response());
    expect(readTodayOutfitCache(localStorage, { ...weather, weatherCode: 61 })).toBeUndefined();
  });
});
