import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Droplets,
  MapPin,
  Snowflake,
  Sun,
  Umbrella,
} from "lucide-react";
import type { ComponentType } from "react";
import type { WeatherForecast, WeatherIconName, WeatherTheme } from "@/lib/weather";
import { weatherPresentation, weatherThemeAt } from "@/lib/weather";
import { Button } from "../ui/button";

const iconComponents: Record<WeatherIconName, ComponentType<{ size?: number; className?: string }>> = {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudRain,
  Snowflake,
  CloudLightning,
};

const themeClasses: Record<WeatherTheme, string> = {
  dawn: "from-indigo-950 via-fuchsia-700 to-amber-300",
  day: "from-sky-700 via-sky-400 to-amber-100",
  sunset: "from-indigo-950 via-violet-700 to-orange-400",
  night: "from-slate-950 via-indigo-950 to-slate-800",
};

const themeLabels: Record<WeatherTheme, string> = {
  dawn: "새벽",
  day: "낮",
  sunset: "노을",
  night: "밤",
};

export type WeatherLocationMode = "checking" | "current" | "seoul";

export function WeatherPanel({
  forecast,
  locationMode,
  usingFixture,
  loading,
  onRetry,
}: {
  forecast: WeatherForecast;
  locationMode: WeatherLocationMode;
  usingFixture: boolean;
  loading: boolean;
  onRetry: () => void;
}) {
  const today = forecast.days[0];
  const theme = weatherThemeAt(forecast.current.time, today.sunrise, today.sunset);
  const currentPresentation = weatherPresentation(forecast.current.weatherCode);
  const CurrentIcon = iconComponents[currentPresentation.icon];

  return (
    <section aria-label="오늘과 이번 주 날씨">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-base font-black">이번 주 날씨</h2>
          <p className="mt-1 flex items-center gap-1 text-xs font-bold text-muted">
            <MapPin size={13} />
            {locationMode === "current" ? "현재 위치 기준" : locationMode === "checking" ? "현재 위치 확인 중" : "서울 기준"}
          </p>
        </div>
        <p className="text-sm font-bold text-muted">주간 평균 <strong className="ml-1 text-xl text-brand">{Math.round(forecast.weeklyAverageTemperature)}°</strong></p>
      </div>

      <div className="no-scrollbar grid grid-cols-7 gap-2 overflow-x-auto pb-1 max-sm:grid-cols-[repeat(7,76px)]">
        {forecast.days.slice(0, 7).map((day, index) => {
          const presentation = weatherPresentation(day.weatherCode);
          const Icon = iconComponents[presentation.icon];
          return (
            <div key={day.time} className={`rounded-2xl border bg-white px-2 py-3 text-center ${index === 0 ? "border-2 border-brand bg-brand/5" : "border-line"}`}>
              <p className="text-[11px] font-black">{index === 0 ? "오늘" : formatWeekday(day.time, forecast.timezone)}</p>
              <Icon size={24} className="mx-auto my-2 text-brand" />
              <p className="text-[10px] text-muted"><strong className="text-brand">{Math.round(day.temperatureMax)}°</strong> / {Math.round(day.temperatureMin)}°</p>
            </div>
          );
        })}
      </div>

      <div className={`relative mt-3 min-h-44 overflow-hidden rounded-3xl bg-gradient-to-br ${themeClasses[theme]} p-5 text-white shadow-xl sm:p-6`}>
        <div className="pointer-events-none absolute -bottom-20 right-[12%] h-40 w-40 rounded-full bg-amber-50/90 shadow-[0_0_55px_rgba(254,215,170,0.8)]" />
        {theme === "night" ? <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(circle,#fff_1px,transparent_1px)] [background-size:31px_31px]" /> : null}
        <div className="relative z-10 flex flex-col justify-between gap-5 sm:flex-row">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-black backdrop-blur">
              {themeLabels[theme]} · {formatTime(forecast.current.time, forecast.timezone)}
            </span>
            <div className="mt-3 flex items-center gap-3">
              <CurrentIcon size={42} />
              <strong className="text-5xl font-black">{Math.round(forecast.current.temperature)}°</strong>
            </div>
            <p className="mt-2 text-sm font-bold text-white/90">{currentPresentation.label} · 체감 {Math.round(forecast.current.apparentTemperature)}°</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:w-64">
            <WeatherStat icon={Droplets} label="습도" value={`${Math.round(forecast.current.humidity)}%`} />
            <WeatherStat icon={Umbrella} label="강수 확률" value={`${Math.round(forecast.current.precipitationProbability)}%`} />
            <WeatherStat icon={Sun} label="낮 최고" value={`${Math.round(today.temperatureMax)}°`} />
            <WeatherStat icon={CloudSun} label="밤 최저" value={`${Math.round(today.temperatureMin)}°`} />
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <p role={usingFixture ? "status" : undefined}>
          {usingFixture ? "날씨를 업데이트하지 못해 예시 데이터를 표시하고 있습니다." : loading ? "최신 날씨로 업데이트 중입니다." : "15분마다 최신 예보를 확인합니다."}
        </p>
        <div className="flex items-center gap-3">
          {usingFixture ? <Button size="sm" variant="secondary" onClick={onRetry}>날씨 다시 시도</Button> : null}
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="font-bold hover:text-foreground">Weather data by Open-Meteo</a>
        </div>
      </div>
    </section>
  );
}

function WeatherStat({ icon: Icon, label, value }: { icon: ComponentType<{ size?: number }>; label: string; value: string }) {
  return <div className="rounded-2xl bg-white/15 p-3 backdrop-blur"><p className="flex items-center gap-1 text-[10px] text-white/75"><Icon size={13} /> {label}</p><strong className="mt-1 block text-base">{value}</strong></div>;
}

function formatWeekday(time: number, timezone: string) {
  return new Intl.DateTimeFormat("ko-KR", { weekday: "short", timeZone: timezone }).format(new Date(time * 1000));
}

function formatTime(time: number, timezone: string) {
  return new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timezone }).format(new Date(time * 1000));
}
