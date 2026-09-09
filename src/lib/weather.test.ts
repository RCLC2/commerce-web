import { describe, expect, it } from "vitest";
import {
  normalizeCoordinates,
  normalizeOpenMeteoForecast,
  weatherPresentation,
  weatherThemeAt,
} from "./weather";

const openMeteoResponse = {
  latitude: 37.57,
  longitude: 126.98,
  timezone: "Asia/Seoul",
  utc_offset_seconds: 32400,
  current: {
    time: 1_788_131_400,
    temperature_2m: 27.4,
    apparent_temperature: 29.1,
    relative_humidity_2m: 64,
    weather_code: 1,
    is_day: 1,
  },
  daily: {
    time: [1_788_091_200, 1_788_177_600],
    weather_code: [1, 61],
    temperature_2m_max: [29, 24],
    temperature_2m_min: [19, 18],
    temperature_2m_mean: [24, 21],
    precipitation_probability_max: [10, 80],
    sunrise: [1_788_109_200, 1_788_195_600],
    sunset: [1_788_159_600, 1_788_246_000],
  },
};

describe("weather normalization", () => {
  it("rounds valid coordinates and rejects invalid ranges", () => {
    expect(normalizeCoordinates("37.56653", "126.9780")).toEqual({ latitude: 37.57, longitude: 126.98 });
    expect(normalizeCoordinates("-33.8688", "151.2093")).toEqual({ latitude: -33.87, longitude: 151.21 });
    expect(normalizeCoordinates("91", "126")).toBeNull();
    expect(normalizeCoordinates("37", "181")).toBeNull();
    expect(normalizeCoordinates("not-a-number", "126")).toBeNull();
  });

  it("normalizes current conditions and computes the weekly average", () => {
    const forecast = normalizeOpenMeteoForecast(openMeteoResponse);

    expect(forecast).toMatchObject({
      timezone: "Asia/Seoul",
      coordinates: { latitude: 37.57, longitude: 126.98 },
      current: {
        temperature: 27.4,
        apparentTemperature: 29.1,
        humidity: 64,
        precipitationProbability: 10,
      },
      weeklyAverageTemperature: 22.5,
    });
    expect(forecast.days).toHaveLength(2);
    expect(forecast.days[1]).toMatchObject({ weatherCode: 61, temperatureMax: 24, temperatureMin: 18 });
  });

  it("fails closed when daily arrays have different lengths", () => {
    expect(() => normalizeOpenMeteoForecast({
      ...openMeteoResponse,
      daily: { ...openMeteoResponse.daily, sunset: [1_788_159_600] },
    })).toThrow();
  });
});

describe("weather presentation", () => {
  it.each([
    [1, "대체로 맑음", "CloudSun"],
    [61, "비", "CloudRain"],
    [71, "눈", "Snowflake"],
    [95, "뇌우", "CloudLightning"],
  ])("maps WMO code %s", (code, label, icon) => {
    expect(weatherPresentation(code)).toEqual({ label, icon });
  });

  it("uses sunrise and sunset windows for dawn, day, sunset, and night", () => {
    const sunrise = 10_000;
    const sunset = 50_000;
    expect(weatherThemeAt(sunrise - 5_000, sunrise, sunset)).toBe("dawn");
    expect(weatherThemeAt(sunrise + 5_000, sunrise, sunset)).toBe("day");
    expect(weatherThemeAt(sunset - 2_000, sunrise, sunset)).toBe("sunset");
    expect(weatherThemeAt(sunset + 5_000, sunrise, sunset)).toBe("night");
  });
});
