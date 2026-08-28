"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Flame, Minus, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

type Audience = "women" | "men";
type TrendDirection = "UP" | "DOWN" | "SAME";

const audienceTabs: Array<{ id: Audience; label: string }> = [
  { id: "women", label: "여성" },
  { id: "men", label: "남성" },
];

export default function Snapshot() {
  const [audience, setAudience] = useState<Audience>("women");
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: queryKeys.trendingSearches(audience),
    queryFn: () => api.trendingSearches(audience),
  });

  return (
    <main className="mx-auto min-h-[70vh] max-w-4xl px-4 pb-28 pt-8">
      <header className="flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-orange-50 text-orange-500">
              <Flame size={21} aria-hidden="true" />
            </span>
            <h1 className="text-2xl font-black">트렌드관</h1>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">
            지금 가장 많이 찾는 스타일 키워드를 순위와 움직임으로 확인해 보세요.
          </p>
        </div>

        <div className="inline-flex w-fit rounded-full bg-zinc-100 p-1" role="tablist" aria-label="트렌드 대상">
          {audienceTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={audience === tab.id}
              onClick={() => setAudience(tab.id)}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-black transition",
                audience === tab.id ? "bg-white text-foreground shadow-sm" : "text-muted hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <section className="mt-6" aria-label={`${audience === "women" ? "여성" : "남성"} 인기 검색어`}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-brand">Realtime ranking</p>
            <h2 className="mt-1 text-lg font-black">실시간 인기 검색어</h2>
          </div>
          {isFetching && !isLoading ? <span className="text-xs font-bold text-muted">업데이트 중</span> : null}
        </div>

        {isLoading ? (
          <div className="grid gap-2 sm:grid-cols-2" aria-label="트렌드 불러오는 중">
            {Array.from({ length: 10 }, (_, index) => (
              <div key={index} className="h-[74px] animate-pulse rounded-xl bg-zinc-100" />
            ))}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-line bg-white p-8 text-center" role="status">
            <p className="font-black text-brand">트렌드를 불러오지 못했습니다.</p>
            <p className="mt-2 text-sm text-muted">{apiErrorMessage(error)}</p>
            <Button className="mt-5" variant="secondary" onClick={() => refetch()}>
              다시 불러오기
            </Button>
          </div>
        ) : null}

        {!isLoading && !error && data?.items.length === 0 ? (
          <div className="rounded-xl border border-line bg-white p-8 text-center text-sm font-bold text-muted">
            아직 집계된 검색어가 없습니다.
          </div>
        ) : null}

        {!isLoading && !error && data?.items.length ? (
          <ol className="grid gap-2 sm:grid-cols-2">
            {data.items.map((item) => (
              <li key={item.keyword}>
                <Link
                  href={`/search?q=${encodeURIComponent(item.keyword)}&audience=${audience}`}
                  className="group grid min-h-[74px] grid-cols-[2rem_1fr_auto_auto] items-center gap-3 rounded-xl border border-line bg-white px-4 transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
                >
                  <span className={cn("text-lg font-black", item.rank <= 3 ? "text-brand" : "text-foreground")}>
                    {String(item.rank).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 truncate font-black">{item.keyword}</span>
                  <TrendIcon direction={item.trend} />
                  <Search size={16} className="text-zinc-300 transition group-hover:text-brand" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ol>
        ) : null}
      </section>
    </main>
  );
}

function TrendIcon({ direction }: { direction: TrendDirection }) {
  if (direction === "UP") {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-black text-red-500" aria-label="순위 상승">
        <ArrowUp size={14} aria-hidden="true" />
        UP
      </span>
    );
  }
  if (direction === "DOWN") {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-black text-blue-500" aria-label="순위 하락">
        <ArrowDown size={14} aria-hidden="true" />
        DOWN
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-black text-muted" aria-label="순위 유지">
      <Minus size={14} aria-hidden="true" />
      SAME
    </span>
  );
}
