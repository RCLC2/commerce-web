"use client";

import { useQuery } from "@tanstack/react-query";
import { Shirt } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EquipmentSlider } from "@/components/today-outfit/equipment-slider";
import { WeatherPanel, type WeatherLocationMode } from "@/components/today-outfit/weather-panel";
import { outfitLooksByGender, type OutfitGender } from "@/lib/today-outfit-fixtures";
import { createFallbackWeatherForecast, normalizeCoordinates, parseWeatherForecast } from "@/lib/weather";

const SEOUL_COORDINATES = { latitude: 37.57, longitude: 126.98 };

export function TodayOutfitPage() {
  const [gender, setGender] = useState<OutfitGender>("female");
  const [coordinates, setCoordinates] = useState(SEOUL_COORDINATES);
  const [locationMode, setLocationMode] = useState<WeatherLocationMode>("seoul");
  const fallbackForecast = useMemo(() => createFallbackWeatherForecast(), []);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (position) => {
        const nextCoordinates = normalizeCoordinates(position.coords.latitude, position.coords.longitude);
        if (!nextCoordinates) return;
        setCoordinates(nextCoordinates);
        setLocationMode("current");
      },
      () => undefined,
      { enableHighAccuracy: false, timeout: 5_000, maximumAge: 15 * 60 * 1000 },
    );
  }, []);

  const weatherQuery = useQuery({
    queryKey: ["today-outfit-weather", coordinates?.latitude, coordinates?.longitude],
    queryFn: () => fetchWeather(coordinates),
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });
  const forecast = weatherQuery.data ?? fallbackForecast;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-28 pt-8">
      <div className="mb-7 flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand text-white shadow-lg"><Shirt size={23} /></span>
        <div>
          <h1 className="text-2xl font-black">오늘의 코디</h1>
          <p className="mt-1 text-sm text-muted">지금 날씨에 맞춘 샘플 코디를 장비창처럼 골라보세요.</p>
        </div>
      </div>

      <WeatherPanel
        forecast={forecast}
        locationMode={locationMode}
        usingFixture={weatherQuery.isError}
        loading={weatherQuery.isFetching}
        onRetry={() => void weatherQuery.refetch()}
      />

      <div className="mt-9">
        <EquipmentSlider key={gender} looks={outfitLooksByGender[gender]} gender={gender} onGenderChange={setGender} />
      </div>
    </main>
  );
}

async function fetchWeather(coordinates: { latitude: number; longitude: number }) {
  const query = new URLSearchParams({
    latitude: String(coordinates.latitude),
    longitude: String(coordinates.longitude),
  });
  const response = await fetch(`/api/weather?${query.toString()}`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("날씨 정보를 불러오지 못했습니다.");
  return parseWeatherForecast(await response.json());
}
