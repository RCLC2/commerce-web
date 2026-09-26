import { parseTodayOutfitResponse } from "./api/outfit";
import type { TodayOutfitResponse, TodayOutfitWeather } from "./today-outfit";

const CACHE_KEY = "commerce.today-outfit.v1";
const CACHE_VERSION = 1;
const PENDING_CACHE_MILLISECONDS = 5 * 60 * 1000;

type CacheRecord = {
  version: number;
  weatherKey: string;
  expiresAt: number;
  response: unknown;
};

export function todayOutfitWeatherKey(weather: TodayOutfitWeather): string {
  return [
    weather.temperature,
    weather.apparentTemperature,
    weather.weatherCode,
    weather.precipitationProbability,
  ].join(":");
}

export function readTodayOutfitCache(
  storage: Storage,
  weather: TodayOutfitWeather,
  now = new Date(),
): TodayOutfitResponse | undefined {
  const serialized = storage.getItem(CACHE_KEY);
  if (!serialized) return undefined;

  try {
    const record = JSON.parse(serialized) as Partial<CacheRecord>;
    if (
      record.version !== CACHE_VERSION
      || record.weatherKey !== todayOutfitWeatherKey(weather)
      || typeof record.expiresAt !== "number"
      || record.expiresAt <= now.getTime()
    ) {
      storage.removeItem(CACHE_KEY);
      return undefined;
    }
    return parseTodayOutfitResponse(record.response);
  } catch {
    storage.removeItem(CACHE_KEY);
    return undefined;
  }
}

export function writeTodayOutfitCache(
  storage: Storage,
  weather: TodayOutfitWeather,
  response: TodayOutfitResponse,
  now = new Date(),
): void {
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  const expiresAt = response.refresh_pending
    ? Math.min(nextMidnight, now.getTime() + PENDING_CACHE_MILLISECONDS)
    : nextMidnight;
  const record: CacheRecord = {
    version: CACHE_VERSION,
    weatherKey: todayOutfitWeatherKey(weather),
    expiresAt,
    response,
  };
  storage.setItem(CACHE_KEY, JSON.stringify(record));
}
