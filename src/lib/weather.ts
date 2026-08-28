import { z } from "zod";

export type WeatherTheme = "dawn" | "day" | "sunset" | "night";
export type WeatherIconName = "Sun" | "CloudSun" | "Cloud" | "CloudFog" | "CloudRain" | "Snowflake" | "CloudLightning";

export type WeatherDay = {
  time: number;
  weatherCode: number;
  temperatureMax: number;
  temperatureMin: number;
  temperatureMean: number;
  precipitationProbability: number;
  sunrise: number;
  sunset: number;
};

export type WeatherForecast = {
  timezone: string;
  utcOffsetSeconds: number;
  coordinates: { latitude: number; longitude: number };
  current: {
    time: number;
    temperature: number;
    apparentTemperature: number;
    humidity: number;
    weatherCode: number;
    isDay: boolean;
    precipitationProbability: number;
  };
  days: WeatherDay[];
  weeklyAverageTemperature: number;
};

const weatherForecastSchema = z.object({
  timezone: z.string().min(1),
  utcOffsetSeconds: z.number().int(),
  coordinates: z.object({ latitude: z.number().finite(), longitude: z.number().finite() }),
  current: z.object({
    time: z.number().int(),
    temperature: z.number().finite(),
    apparentTemperature: z.number().finite(),
    humidity: z.number().min(0).max(100),
    weatherCode: z.number().int().nonnegative(),
    isDay: z.boolean(),
    precipitationProbability: z.number().min(0).max(100),
  }),
  days: z.array(z.object({
    time: z.number().int(),
    weatherCode: z.number().int().nonnegative(),
    temperatureMax: z.number().finite(),
    temperatureMin: z.number().finite(),
    temperatureMean: z.number().finite(),
    precipitationProbability: z.number().min(0).max(100),
    sunrise: z.number().int(),
    sunset: z.number().int(),
  })).min(1),
  weeklyAverageTemperature: z.number().finite(),
});

const openMeteoResponseSchema = z.object({
  latitude: z.number().finite(),
  longitude: z.number().finite(),
  timezone: z.string().min(1),
  utc_offset_seconds: z.number().int(),
  current: z.object({
    time: z.number().int(),
    temperature_2m: z.number().finite(),
    apparent_temperature: z.number().finite(),
    relative_humidity_2m: z.number().min(0).max(100),
    weather_code: z.number().int().nonnegative(),
    is_day: z.union([z.literal(0), z.literal(1)]),
  }),
  daily: z.object({
    time: z.array(z.number().int()).min(1),
    weather_code: z.array(z.number().int().nonnegative()).min(1),
    temperature_2m_max: z.array(z.number().finite()).min(1),
    temperature_2m_min: z.array(z.number().finite()).min(1),
    temperature_2m_mean: z.array(z.number().finite()).min(1),
    precipitation_probability_max: z.array(z.number().min(0).max(100)).min(1),
    sunrise: z.array(z.number().int()).min(1),
    sunset: z.array(z.number().int()).min(1),
  }),
});

export function normalizeCoordinates(latitudeValue: string | number, longitudeValue: string | number) {
  const latitude = typeof latitudeValue === "number" ? latitudeValue : Number(latitudeValue);
  const longitude = typeof longitudeValue === "number" ? longitudeValue : Number(longitudeValue);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return {
    latitude: roundTo(latitude, 2),
    longitude: roundTo(longitude, 2),
  };
}

export function normalizeOpenMeteoForecast(input: unknown): WeatherForecast {
  const parsed = openMeteoResponseSchema.parse(input);
  const daily = parsed.daily;
  const dayCount = daily.time.length;
  const arrays = [
    daily.weather_code,
    daily.temperature_2m_max,
    daily.temperature_2m_min,
    daily.temperature_2m_mean,
    daily.precipitation_probability_max,
    daily.sunrise,
    daily.sunset,
  ];
  if (arrays.some((values) => values.length !== dayCount)) {
    throw new Error("Open-Meteo daily arrays must have matching lengths.");
  }

  const days = daily.time.map((time, index) => ({
    time,
    weatherCode: daily.weather_code[index],
    temperatureMax: daily.temperature_2m_max[index],
    temperatureMin: daily.temperature_2m_min[index],
    temperatureMean: daily.temperature_2m_mean[index],
    precipitationProbability: daily.precipitation_probability_max[index],
    sunrise: daily.sunrise[index],
    sunset: daily.sunset[index],
  }));
  const currentDayIndex = Math.max(0, days.findLastIndex((day) => day.time <= parsed.current.time));
  const currentDay = days[Math.min(currentDayIndex, days.length - 1)];

  return {
    timezone: parsed.timezone,
    utcOffsetSeconds: parsed.utc_offset_seconds,
    coordinates: normalizeCoordinates(parsed.latitude, parsed.longitude) ?? {
      latitude: parsed.latitude,
      longitude: parsed.longitude,
    },
    current: {
      time: parsed.current.time,
      temperature: parsed.current.temperature_2m,
      apparentTemperature: parsed.current.apparent_temperature,
      humidity: parsed.current.relative_humidity_2m,
      weatherCode: parsed.current.weather_code,
      isDay: parsed.current.is_day === 1,
      precipitationProbability: currentDay.precipitationProbability,
    },
    days,
    weeklyAverageTemperature: roundTo(
      days.reduce((sum, day) => sum + day.temperatureMean, 0) / days.length,
      1,
    ),
  };
}

export function parseWeatherForecast(input: unknown): WeatherForecast {
  return weatherForecastSchema.parse(input);
}

export function weatherPresentation(code: number): { label: string; icon: WeatherIconName } {
  if (code === 0) return { label: "맑음", icon: "Sun" };
  if (code === 1 || code === 2) return { label: "대체로 맑음", icon: "CloudSun" };
  if (code === 3) return { label: "흐림", icon: "Cloud" };
  if (code === 45 || code === 48) return { label: "안개", icon: "CloudFog" };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { label: "비", icon: "CloudRain" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { label: "눈", icon: "Snowflake" };
  if (code >= 95) return { label: "뇌우", icon: "CloudLightning" };
  return { label: "변화 가능", icon: "CloudSun" };
}

export function weatherThemeAt(now: number, sunrise: number, sunset: number): WeatherTheme {
  const dawnStarts = sunrise - 90 * 60;
  const dawnEnds = sunrise + 45 * 60;
  const sunsetStarts = sunset - 60 * 60;
  const sunsetEnds = sunset + 45 * 60;
  if (now >= dawnStarts && now <= dawnEnds) return "dawn";
  if (now >= sunsetStarts && now <= sunsetEnds) return "sunset";
  if (now > dawnEnds && now < sunsetStarts) return "day";
  return "night";
}

export function createFallbackWeatherForecast(now = Math.floor(Date.now() / 1000)): WeatherForecast {
  const timezone = "Asia/Seoul";
  const utcOffsetSeconds = 9 * 60 * 60;
  const daySeconds = 24 * 60 * 60;
  const localDayStart = Math.floor((now + utcOffsetSeconds) / daySeconds) * daySeconds - utcOffsetSeconds;
  const daily = [
    { code: 1, max: 27, min: 19, mean: 23, precipitation: 10 },
    { code: 0, max: 29, min: 20, mean: 24.5, precipitation: 5 },
    { code: 61, max: 24, min: 18, mean: 21, precipitation: 80 },
    { code: 2, max: 25, min: 18, mean: 21.5, precipitation: 30 },
    { code: 80, max: 23, min: 17, mean: 20, precipitation: 60 },
    { code: 0, max: 28, min: 19, mean: 23.5, precipitation: 5 },
    { code: 1, max: 27, min: 20, mean: 23.5, precipitation: 15 },
  ];
  const days = daily.map((day, index) => {
    const time = localDayStart + index * daySeconds;
    return {
      time,
      weatherCode: day.code,
      temperatureMax: day.max,
      temperatureMin: day.min,
      temperatureMean: day.mean,
      precipitationProbability: day.precipitation,
      sunrise: time + 6 * 60 * 60 + 10 * 60,
      sunset: time + 18 * 60 * 60 + 55 * 60,
    };
  });
  return {
    timezone,
    utcOffsetSeconds,
    coordinates: { latitude: 37.57, longitude: 126.98 },
    current: {
      time: now,
      temperature: 27,
      apparentTemperature: 29,
      humidity: 64,
      weatherCode: 1,
      isDay: true,
      precipitationProbability: days[0].precipitationProbability,
    },
    days,
    weeklyAverageTemperature: roundTo(days.reduce((sum, day) => sum + day.temperatureMean, 0) / days.length, 1),
  };
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
