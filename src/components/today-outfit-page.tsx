"use client";

import { useQuery } from "@tanstack/react-query";
import { Shirt } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ApiErrorState } from "@/components/api-error-state";
import { EquipmentSlider } from "@/components/today-outfit/equipment-slider";
import { OutfitProductList } from "@/components/today-outfit/outfit-product-list";
import { WeatherPanel, type WeatherLocationMode } from "@/components/today-outfit/weather-panel";
import { api } from "@/lib/api";
import { shouldRetryApiError } from "@/lib/api-client";
import { outfitProductAnchorID, type TodayOutfitWeather } from "@/lib/today-outfit";
import { createFallbackWeatherForecast, normalizeCoordinates, parseWeatherForecast } from "@/lib/weather";

const SEOUL_COORDINATES = { latitude: 37.57, longitude: 126.98 };

export function TodayOutfitPage() {
  const [coordinates, setCoordinates] = useState(SEOUL_COORDINATES);
  const [locationMode, setLocationMode] = useState<WeatherLocationMode>("seoul");
  const [activeLookID, setActiveLookID] = useState<number | null>(null);
  const [selection, setSelection] = useState<{ lookID: number; productID: number } | null>(null);
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
    queryKey: ["today-outfit-weather", coordinates.latitude, coordinates.longitude],
    queryFn: () => fetchWeather(coordinates),
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });
  const forecast = weatherQuery.data ?? fallbackForecast;
  const outfitWeather: TodayOutfitWeather = {
    temperature: forecast.current.temperature,
    apparentTemperature: forecast.current.apparentTemperature,
    weatherCode: forecast.current.weatherCode,
    precipitationProbability: forecast.current.precipitationProbability,
  };
  const outfitQuery = useQuery({
    queryKey: [
      "today-outfit",
      outfitWeather.temperature,
      outfitWeather.apparentTemperature,
      outfitWeather.weatherCode,
      outfitWeather.precipitationProbability,
    ],
    queryFn: () => api.getTodayOutfit(outfitWeather),
    enabled: weatherQuery.isSuccess || weatherQuery.isError,
    staleTime: 15 * 60 * 1000,
    retry: shouldRetryApiError,
  });
  const looks = outfitQuery.data?.looks ?? [];
  const requestedLookIndex = looks.findIndex((look) => look.id === activeLookID);
  const safeLookIndex = requestedLookIndex >= 0 ? requestedLookIndex : 0;
  const activeLook = looks[safeLookIndex];
  const selectedProductID = selection && activeLook && selection.lookID === activeLook.id
    ? selection.productID
    : null;

  function selectLook(index: number) {
    setActiveLookID(looks[index]?.id ?? null);
    setSelection(null);
  }

  function revealProduct(productID: number) {
    if (!activeLook) return;
    setSelection({ lookID: activeLook.id, productID });
    const anchorID = outfitProductAnchorID(activeLook.id, productID);
    requestAnimationFrame(() => {
      const target = document.getElementById(anchorID);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.focus({ preventScroll: true });
    });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-28 pt-8">
      <div className="mb-7 flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand text-white shadow-lg"><Shirt size={23} /></span>
        <div>
          <h1 className="text-2xl font-black">오늘의 코디</h1>
          <p className="mt-1 text-sm text-muted">지금 날씨와 실제 판매 상품을 조합한 AI 코디를 확인해 보세요.</p>
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
        {outfitQuery.isPending ? <OutfitLoadingState /> : null}
        {outfitQuery.isError ? (
          <ApiErrorState
            error={outfitQuery.error}
            onRetry={() => void outfitQuery.refetch()}
            retryLabel="코디 다시 불러오기"
          />
        ) : null}
        {activeLook ? (
          <>
            <EquipmentSlider
              looks={looks}
              index={safeLookIndex}
              onIndexChange={selectLook}
              onProductSelect={revealProduct}
            />
            <OutfitProductList look={activeLook} selectedProductID={selectedProductID} />
          </>
        ) : null}
      </div>
    </main>
  );
}

function OutfitLoadingState() {
  return (
    <section aria-label="오늘의 코디 불러오는 중" aria-busy="true">
      <div className="h-7 w-52 animate-pulse rounded bg-zinc-200" />
      <div className="mt-4 min-h-[560px] animate-pulse rounded-3xl border border-line bg-zinc-100" />
      <div className="mt-8 h-7 w-40 animate-pulse rounded bg-zinc-200" />
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
        {Array.from({ length: 7 }, (_, index) => <div key={index} className="aspect-[3/4] animate-pulse rounded-xl bg-zinc-100" />)}
      </div>
    </section>
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
