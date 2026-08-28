import { normalizeCoordinates, normalizeOpenMeteoForecast } from "@/lib/weather";

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

export async function GET(request: Request) {
  const requestURL = new URL(request.url);
  const coordinates = normalizeCoordinates(
    requestURL.searchParams.get("latitude") ?? "",
    requestURL.searchParams.get("longitude") ?? "",
  );
  if (!coordinates) {
    return Response.json({ error: "유효한 위도와 경도가 필요합니다." }, { status: 400 });
  }

  const weatherURL = new URL(OPEN_METEO_URL);
  weatherURL.searchParams.set("latitude", String(coordinates.latitude));
  weatherURL.searchParams.set("longitude", String(coordinates.longitude));
  weatherURL.searchParams.set("current", [
    "temperature_2m",
    "apparent_temperature",
    "relative_humidity_2m",
    "weather_code",
    "is_day",
  ].join(","));
  weatherURL.searchParams.set("daily", [
    "weather_code",
    "temperature_2m_max",
    "temperature_2m_min",
    "temperature_2m_mean",
    "precipitation_probability_max",
    "sunrise",
    "sunset",
  ].join(","));
  weatherURL.searchParams.set("forecast_days", "7");
  weatherURL.searchParams.set("timezone", "auto");
  weatherURL.searchParams.set("timeformat", "unixtime");

  try {
    const response = await fetch(weatherURL, {
      headers: { Accept: "application/json" },
      next: { revalidate: 900 },
    });
    if (!response.ok) {
      return Response.json({ error: "날씨 제공자가 응답하지 않았습니다." }, { status: 502 });
    }
    return Response.json(normalizeOpenMeteoForecast(await response.json()));
  } catch {
    return Response.json({ error: "날씨 정보를 불러오지 못했습니다." }, { status: 502 });
  }
}
