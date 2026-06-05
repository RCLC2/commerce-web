"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search, Store, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { ProductCard } from "./product-card";
import { SafeImage } from "./safe-image";

export function SearchPage() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";

  return <SearchExperience key={q} initialQuery={q} />;
}

function SearchExperience({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [input, setInput] = useState(initialQuery);
  const [focused, setFocused] = useState(false);
  const [segment, setSegment] = useState("전체");
  const trimmedInput = input.trim();
  const committedQuery = initialQuery.trim();
  const { data: results, isLoading, error } = useQuery({
    queryKey: queryKeys.integratedSearch(committedQuery),
    queryFn: () => api.search(committedQuery),
    enabled: committedQuery.length > 0,
  });
  const { data: suggestions = [] } = useQuery({
    queryKey: queryKeys.searchSuggestions(trimmedInput),
    queryFn: () => api.searchSuggestions(trimmedInput),
    enabled: trimmedInput.length > 0,
  });
  const { data: categories = [] } = useQuery({
    queryKey: queryKeys.categories,
    queryFn: api.listCategories,
  });
  const { data: trending } = useQuery({
    queryKey: queryKeys.trendingSearches(segment),
    queryFn: () => api.trendingSearches(segment),
  });
  const products = results?.products ?? [];
  const markets = results?.markets ?? [];
  const matchedCategories = useMemo(() => {
    if (!committedQuery) {
      return [];
    }
    return categories
      .filter((category) => category.name.includes(committedQuery) || committedQuery.includes(category.name))
      .slice(0, 2);
  }, [categories, committedQuery]);
  const relatedKeywords = useMemo(() => {
    if (!committedQuery) {
      return [];
    }
    return [
      `여름${committedQuery}`,
      `나시${committedQuery}`,
      `레이어드 ${committedQuery}`,
      `빅사이즈 ${committedQuery}`,
      `반팔${committedQuery}`,
      `셔츠${committedQuery}`,
      `하객룩 ${committedQuery}`,
    ];
  }, [committedQuery]);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(trimmedInput ? `/search?q=${encodeURIComponent(trimmedInput)}` : "/search");
    setFocused(false);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-2">
      <form className="sticky top-0 z-20 flex h-16 items-center gap-3 bg-background" onSubmit={submitSearch}>
        <button type="button" aria-label="뒤로가기" onClick={() => router.back()} className="flex h-11 w-11 shrink-0 items-center justify-center">
          <ArrowLeft size={28} />
        </button>
        <div className="relative flex h-12 min-w-0 flex-1 items-center gap-2 rounded-md bg-zinc-100 px-3">
          <Search size={20} className="shrink-0 text-muted" />
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => window.setTimeout(() => setFocused(false), 120)}
            className="w-full bg-transparent text-lg font-bold outline-none"
            placeholder="하나만 사도 무료배송"
            aria-label="검색어 입력"
            autoFocus
          />
          {input ? (
            <button type="button" aria-label="검색어 지우기" onClick={() => setInput("")} className="text-muted">
              <XCircle size={22} />
            </button>
          ) : null}
          {focused && suggestions.length ? (
            <div className="absolute left-0 right-0 top-14 overflow-hidden rounded-md border border-line bg-white shadow-xl">
              {suggestions.map((item) => (
                <Link key={item.id} href={item.href} className="flex items-center justify-between px-3 py-3 text-sm hover:bg-zinc-50">
                  <span className="font-black">{item.label}</span>
                  <span className="font-bold text-brand">{item.type === "PRODUCT" ? "상품" : item.type === "MARKET" ? "마켓" : "검색"} ↗</span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </form>

      {!committedQuery ? (
        <section className="pt-7">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-black">인기 검색어</h1>
            <p className="text-sm font-bold text-muted">
              {trending?.captured_at
                ? new Date(trending.captured_at).toLocaleString("ko-KR", {
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })
                : "--.-- --:--"} 기준
            </p>
          </div>
          <div className="mt-5 flex gap-3 overflow-x-auto">
            {(trending?.segments ?? ["전체"]).map((filter) => (
              <button
                key={filter}
                className={`h-11 shrink-0 rounded-full border px-5 text-sm font-black ${segment === filter ? "border-brand bg-brand text-white" : "border-line bg-white text-muted"}`}
                onClick={() => setSegment(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
          <div className="mt-6 divide-y divide-transparent">
            {(trending?.items ?? []).map((item) => (
              <button key={item.keyword} className="flex h-14 w-full items-center justify-between text-left" onClick={() => router.push(`/search?q=${encodeURIComponent(item.keyword)}`)}>
                <span className="flex items-center gap-5 text-lg">
                  <strong className="w-6 text-center">{item.rank}</strong>
                  {item.keyword}
                </span>
                <span className={item.trend === "UP" ? "text-brand" : "text-muted"}>{item.trend === "UP" ? "⌃" : "-"}</span>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <>
          <section className="pt-8">
            <div className="space-y-5">
              {matchedCategories.map((category) => (
                <Link key={category.id} href={category.href} className="flex items-center justify-between text-lg">
                  <span><strong>{committedQuery}</strong>/{category.name}</span>
                  <span className="text-sm font-bold text-brand">카테고리 ↗</span>
                </Link>
              ))}
              {markets.slice(0, 3).map((market) => (
                <Link key={market.id} href={`/markets/${market.id}`} className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-line bg-zinc-100">
                      <SafeImage src={market.profile_image_url} alt="" fill sizes="56px" className="object-cover" />
                    </div>
                    <span className="truncate text-lg font-black">{market.name}</span>
                  </div>
                  <span className="text-sm font-bold text-brand">마켓 ↗</span>
                </Link>
              ))}
            </div>
            {relatedKeywords.length ? <div className="mt-8 border-t border-line pt-3">
              {relatedKeywords.map((keyword) => (
                <button key={keyword} className="block h-14 text-left text-lg" onClick={() => router.push(`/search?q=${encodeURIComponent(keyword)}`)}>
                  {keyword.includes(committedQuery) ? keyword.split(committedQuery).map((part, index) => (
                    <span key={`${part}-${index}`}>{part}{index < keyword.split(committedQuery).length - 1 ? <strong>{committedQuery}</strong> : null}</span>
                  )) : keyword}
                </button>
              ))}
            </div> : null}
          </section>

          <section className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">상품</h2>
              <span className="text-sm font-bold text-muted">{products.length}개</span>
            </div>
            {error ? <p className="mt-4 rounded-md border border-line bg-white p-4 text-sm text-brand">{error.message}</p> : null}
            {isLoading ? <p className="mt-4 text-sm text-muted">검색 결과를 불러오는 중입니다.</p> : null}
            {!isLoading && !error && !products.length ? (
              <p className="mt-4 rounded-md border border-line bg-white p-4 text-sm text-muted">검색된 상품이 없습니다.</p>
            ) : null}
            {products.length ? (
              <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-4 md:gap-x-5">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : null}
          </section>

          <section className="mt-9">
            <h2 className="text-xl font-black">마켓</h2>
            {!isLoading && !error && !markets.length ? (
              <p className="mt-4 rounded-md border border-line bg-white p-4 text-sm text-muted">검색된 마켓이 없습니다.</p>
            ) : null}
            {markets.length ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {markets.map((market) => (
                  <Link key={market.id} href={`/markets/${market.id}`} className="flex gap-3 rounded-md border border-line bg-white p-3">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-zinc-100">
                      <SafeImage src={market.profile_image_url} alt="" fill sizes="64px" className="object-cover" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <Store size={14} className="text-brand" />
                        <p className="truncate font-black">{market.name}</p>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{market.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : null}
          </section>
        </>
      )}
    </main>
  );
}
