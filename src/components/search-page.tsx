"use client";

import { PageHeading } from "./ui/page-heading";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, ArrowUp, ChevronLeft, ChevronRight, Minus, Package, Search, Sparkles, Star, Store, Users, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { scrollCarouselByCard } from "@/lib/carousel";
import type { Market, Product, SearchResultSection, SearchSuggestion } from "@/lib/types";
import { couponPriceForProduct } from "@/lib/product-card-pricing";
import { formatFollowerCount } from "@/lib/utils";
import { ProductCard } from "./product-card";
import { ProductCardPrice } from "./product-card-price";
import { PageLayout } from "./page-layout";
import { ApiErrorState } from "./api-error-state";
import { SponsoredPlacement } from "./advertising/sponsored-placement";
import { SafeImage } from "./safe-image";
import { Button } from "./ui/button";
import { EmptyState, InlineLoadingState } from "./ui/feedback";
import { SearchField } from "./ui/search-field";
import { InfiniteScrollTrigger } from "./ui/infinite-scroll-trigger";

export function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q")?.trim() ?? "";
  const audience = searchParams.get("audience") === "men" ? "men" : "women";
  return <SearchExperience key={`${query}:${audience}`} initialQuery={query} audience={audience} />;
}

function SearchExperience({
  initialQuery,
  audience,
}: {
  initialQuery: string;
  audience: "women" | "men";
}) {
  const router = useRouter();
  const [input, setInput] = useState(initialQuery);
  const [debouncedInput, setDebouncedInput] = useState(initialQuery);
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [now, setNow] = useState<Date | null>(null);
  const carouselRefs = useRef(new Map<number, HTMLDivElement>());
  const trimmedInput = input.trim();
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedInput(trimmedInput), 180);
    return () => window.clearTimeout(timer);
  }, [trimmedInput]);
  const suggestionsQuery = useQuery({
    queryKey: ["search-page-suggestions", debouncedInput],
    queryFn: () => api.searchSuggestions(debouncedInput),
    enabled: searchFocused && debouncedInput.length > 0,
  });
  const autocompleteSuggestions = searchFocused && debouncedInput === trimmedInput
    ? (suggestionsQuery.data ?? []).slice(0, 8)
    : [];
  const showSuggestionPanel = searchFocused && trimmedInput.length > 0;
  const suggestionsPending = showSuggestionPanel && (debouncedInput !== trimmedInput || suggestionsQuery.isPending);
  const suggestionsFailed = showSuggestionPanel && debouncedInput === trimmedInput && suggestionsQuery.isError;
  const productResultsQuery = useInfiniteQuery({
    queryKey: ["integrated-search-products", initialQuery, audience],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => api.search({ q: initialQuery, audience, productPage: pageParam, marketPage: 1 }),
    getNextPageParam: (lastPage) => lastPage.products.page < lastPage.products.total_pages ? lastPage.products.page + 1 : undefined,
    enabled: initialQuery.length > 0,
  });
  const marketResultsQuery = useInfiniteQuery({
    queryKey: ["integrated-search-markets", initialQuery, audience],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => api.search({ q: initialQuery, audience, productPage: 1, marketPage: pageParam }),
    getNextPageParam: (lastPage) => lastPage.markets.page < lastPage.markets.total_pages ? lastPage.markets.page + 1 : undefined,
    enabled: initialQuery.length > 0 && productResultsQuery.isSuccess,
    initialData: productResultsQuery.data ? { pages: [productResultsQuery.data.pages[0]], pageParams: [1] } : undefined,
    staleTime: 60_000,
  });
  const results = productResultsQuery.data?.pages[0];
  const products = productResultsQuery.data?.pages.flatMap((page) => page.products.items) ?? [];
  const markets = marketResultsQuery.data?.pages.flatMap((page) => page.markets.items) ?? [];
  const suggestedKeywords = [...new Set([
    ...(results?.related_keywords ?? []),
    ...(results?.suggestions ?? []).filter((item) => item.type === "KEYWORD").map((item) => item.label),
  ].map((keyword) => keyword.trim()).filter((keyword) => keyword && keyword !== initialQuery))].slice(0, 4);
  const trendingQuery = useQuery({
    queryKey: queryKeys.trendingSearches(audience),
    queryFn: () => api.trendingSearches(audience),
    enabled: initialQuery.length === 0,
  });
  const trending = trendingQuery.data;
  const sections = useMemo(
    () => [...(results?.sections ?? [])].sort((a, b) => a.sequence - b.sequence || a.id - b.id),
    [results?.sections],
  );
  const productSections = sections.filter((section) => section.section_type === "PRODUCT_CAROUSEL");
  const marketSections = sections.filter((section) => section.section_type === "MARKET_CAROUSEL");

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  function goToSearch(keyword: string) {
    const next = keyword.trim();
    if (!next) return;
    router.push(`/search?q=${encodeURIComponent(next)}&audience=${audience}`);
    setSearchFocused(false);
  }

  function goToSuggestion(suggestion: SearchSuggestion) {
    if (suggestion.type === "KEYWORD") {
      goToSearch(suggestion.label);
    } else if (suggestion.href.startsWith("/") && !suggestion.href.startsWith("//")) {
      router.push(suggestion.href);
      setSearchFocused(false);
    }
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (trimmedInput) goToSearch(trimmedInput);
    else router.push(`/search?audience=${audience}`);
  }

  function goBack() {
    const navigation = (window as Window & { navigation?: { canGoBack?: boolean } }).navigation;
    if (navigation?.canGoBack) {
      router.back();
      return;
    }

    router.replace("/");
  }

  function slide(sectionID: number, direction: "prev" | "next") {
    scrollCarouselByCard(carouselRefs.current.get(sectionID) ?? null, direction === "prev" ? -1 : 1);
  }

  return (
    <PageLayout className="pt-2">
      <form className="sticky top-0 z-30 flex h-16 items-center gap-3 bg-background/95 backdrop-blur" onSubmit={submitSearch}>
        <Button variant="ghost" size="icon" type="button" aria-label="뒤로가기" onClick={goBack} className="flex h-11 w-11 shrink-0 items-center justify-center">
          <ArrowLeft size={27} />
        </Button>
        <SearchField
          className="flex-1"
          value={input}
          onChange={(event) => { setInput(event.target.value); setActiveSuggestion(-1); setSearchFocused(true); }}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => window.setTimeout(() => setSearchFocused(false), 120)}
          onKeyDown={(event) => {
            if (event.key === "Escape") { setSearchFocused(false); setActiveSuggestion(-1); }
            if (!autocompleteSuggestions.length) return;
            if (event.key === "ArrowDown") { event.preventDefault(); setActiveSuggestion((current) => (current + 1) % autocompleteSuggestions.length); }
            if (event.key === "ArrowUp") { event.preventDefault(); setActiveSuggestion((current) => (current - 1 + autocompleteSuggestions.length) % autocompleteSuggestions.length); }
            if (event.key === "Enter" && activeSuggestion >= 0) { event.preventDefault(); goToSuggestion(autocompleteSuggestions[activeSuggestion]); }
          }}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showSuggestionPanel}
          aria-controls={showSuggestionPanel ? "search-page-suggestions" : undefined}
          aria-activedescendant={activeSuggestion >= 0 ? `search-page-suggestion-${activeSuggestion}` : undefined}
          inputClassName="text-lg font-bold"
          icon={<Search size={20} className="size-5 shrink-0 text-content-secondary" aria-hidden="true" />}
          endAdornment={input ? <Button variant="ghost" size="icon" type="button" aria-label="검색어 지우기" onClick={() => setInput("")} className="text-content-secondary"><XCircle size={22} /></Button> : null}
          placeholder="상품, 마켓, 키워드 검색"
          aria-label="검색어 입력"
          autoFocus
        />
        {showSuggestionPanel ? (
          <div id="search-page-suggestions" role="listbox" aria-label="검색어 제안" className="absolute left-14 right-0 top-full z-40 overflow-hidden rounded-surface border border-border-subtle bg-surface-raised shadow-float">
            {suggestionsPending ? <p className="px-4 py-3 text-sm text-content-secondary" role="status">추천 검색어를 찾는 중입니다.</p> : null}
            {suggestionsFailed ? <p className="px-4 py-3 text-sm text-content-secondary" role="status">추천 검색어를 불러오지 못했습니다. Enter를 누르면 입력한 검색어로 검색할 수 있습니다.</p> : null}
            {!suggestionsPending && !suggestionsFailed && !autocompleteSuggestions.length ? <p className="px-4 py-3 text-sm text-content-secondary" role="status">일치하는 추천어가 없습니다. Enter를 눌러 검색해보세요.</p> : null}
            {autocompleteSuggestions.map((suggestion, index) => (
              <button key={suggestion.id} id={`search-page-suggestion-${index}`} type="button" role="option" aria-selected={activeSuggestion === index} onMouseDown={(event) => event.preventDefault()} onClick={() => goToSuggestion(suggestion)} className={`flex min-h-11 w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm hover:bg-surface-subtle ${activeSuggestion === index ? "bg-action-secondary" : ""}`}>
                <span className="truncate font-bold">{suggestion.label}</span>
                <span className="shrink-0 text-xs text-content-secondary">{suggestion.type === "PRODUCT" ? "상품" : suggestion.type === "MARKET" ? "마켓" : "검색어"}</span>
              </button>
            ))}
          </div>
        ) : null}
      </form>

      {!initialQuery ? (
        <section className="pt-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <PageHeading icon={<Search />} title="인기 검색어" />
            <p className="text-sm font-bold text-content-secondary">{now ? now.toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }) : "--.-- --:--"} 현재</p>
          </div>
          <div className="mt-5 flex gap-3">
            {(trending?.segments ?? [{ id: "women" as const, label: "여성" }, { id: "men" as const, label: "남성" }]).map((segment) => (
              <Button variant="ghost" key={segment.id} type="button" className={`h-11 rounded-full border px-6 text-sm font-bold ${audience === segment.id ? "border-action-primary bg-action-primary text-content-inverse" : "border-border-subtle bg-surface-raised text-content-secondary"}`} onClick={() => router.push(`/search?audience=${segment.id}`)}>
                {segment.label}
              </Button>
            ))}
          </div>
          <div className="mt-6">
            {trendingQuery.isLoading ? <InlineLoadingState label="인기 검색어를 불러오는 중입니다." /> : null}
            {trendingQuery.isError ? <div className="rounded-control border border-status-negative-border bg-status-negative-subtle p-4 text-sm" role="alert"><p className="font-bold text-status-negative">인기 검색어를 불러오지 못했습니다.</p><Button className="mt-3" size="sm" variant="secondary" onClick={() => void trendingQuery.refetch()}>다시 시도</Button></div> : null}
            {trendingQuery.isSuccess && !trendingQuery.data.items.length ? (
              <EmptyState
                icon={<Search className="size-7" />}
                title="표시할 인기 검색어가 없습니다"
                description="다른 검색어를 입력해 원하는 상품과 마켓을 찾아보세요."
              />
            ) : null}
            {(trending?.items ?? []).map((item) => (
              <Button variant="ghost" key={item.keyword} className="flex h-14 w-full items-center justify-between text-left" onClick={() => goToSearch(item.keyword)}>
                <span className="flex items-center gap-5 text-lg"><strong className="w-6 text-center">{item.rank}</strong>{item.keyword}</span>
                <TrendIcon trend={item.trend} />
              </Button>
            ))}
          </div>
        </section>
      ) : (
        <div className="mx-auto max-w-4xl">
          <PageHeading className="my-5" icon={<Search />} title="검색 결과" description={`‘${initialQuery}’ 검색 결과입니다.`} />
          <section className="mb-5" aria-label="검색 스폰서드 상품">
            <SponsoredPlacement placementKey="search.sponsored_top" />
          </section>
          <ResultListHeader title="상품" total={results?.products.total ?? 0} />
          <div className="space-y-7">
            {productSections.map((section) => <SearchCarousel key={section.id} section={section} setRef={(node) => { if (node) carouselRefs.current.set(section.id, node); else carouselRefs.current.delete(section.id); }} onSlide={(direction) => slide(section.id, direction)} />)}
          </div>
          {productResultsQuery.isError && !results ? <ErrorBox error={productResultsQuery.error} onRetry={() => void productResultsQuery.refetch()} /> : null}
          {productResultsQuery.isLoading ? <LoadingGrid /> : null}
          {productResultsQuery.isSuccess && !products.length ? (
            <EmptyBox
              icon={<Package className="size-7" />}
              title="검색된 상품이 없습니다"
              description={suggestedKeywords.length ? "다른 검색어로 찾아보세요. 아래 추천 검색어를 눌러 바로 다시 검색할 수 있습니다." : "검색어를 바꿔 다시 찾아보세요."}
              action={suggestedKeywords.length ? (
                <div aria-label="추천 검색어">
                  <p className="mb-2 text-xs font-bold text-content-secondary">추천 검색어</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {suggestedKeywords.map((keyword) => <Button key={keyword} variant="secondary" size="sm" onClick={() => goToSearch(keyword)}>{keyword}</Button>)}
                  </div>
                </div>
              ) : undefined}
            />
          ) : null}
          {products.length ? <div className="mt-7 grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-4 md:gap-x-5">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : null}
          <InfiniteScrollTrigger
            hasMore={Boolean(productResultsQuery.hasNextPage)}
            loading={productResultsQuery.isFetchingNextPage}
            error={productResultsQuery.isFetchNextPageError}
            label="검색 상품"
            onLoadMore={() => void productResultsQuery.fetchNextPage()}
          />

          <div className="mt-12 border-t border-border-subtle pt-2">
            <ResultListHeader title="마켓" total={results?.markets.total ?? 0} />
            <div className="space-y-7">
              {marketSections.map((section) => <SearchCarousel key={section.id} section={section} setRef={(node) => { if (node) carouselRefs.current.set(section.id, node); else carouselRefs.current.delete(section.id); }} onSlide={(direction) => slide(section.id, direction)} />)}
            </div>
          </div>
          {marketResultsQuery.isError && !marketResultsQuery.data ? <ErrorBox error={marketResultsQuery.error} onRetry={() => void marketResultsQuery.refetch()} /> : null}
          {marketResultsQuery.isLoading ? <InlineLoadingState label="마켓을 불러오는 중입니다." /> : null}
          {marketResultsQuery.isSuccess && !markets.length ? <EmptyBox icon={<Store className="size-7" />} title="검색된 마켓이 없습니다" description="다른 키워드로 마켓을 찾아보세요." /> : null}
          {markets.length ? <div className="mt-7 space-y-4">{markets.map((market) => <MarketCard key={market.id} market={market} />)}</div> : null}
          <InfiniteScrollTrigger
            hasMore={Boolean(marketResultsQuery.hasNextPage)}
            loading={marketResultsQuery.isFetchingNextPage}
            error={marketResultsQuery.isFetchNextPageError}
            label="검색 마켓"
            onLoadMore={() => void marketResultsQuery.fetchNextPage()}
          />
        </div>
      )}
    </PageLayout>
  );
}

function SearchCarousel({ section, setRef, onSlide }: { section: SearchResultSection; setRef: (node: HTMLDivElement | null) => void; onSlide: (direction: "prev" | "next") => void }) {
  const products = section.products ?? [];
  const markets = section.markets ?? [];
  if (!products.length && !markets.length) return null;
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold">{section.title}</h2>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" aria-label={`${section.title} 이전`} onClick={() => onSlide("prev")} className="flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle bg-surface-raised"><ChevronLeft size={18} /></Button>
          <Button variant="ghost" size="icon" aria-label={`${section.title} 다음`} onClick={() => onSlide("next")} className="flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle bg-surface-raised"><ChevronRight size={18} /></Button>
        </div>
      </div>
      <div ref={setRef} className="no-scrollbar flex snap-x gap-4 overflow-x-auto pb-2">
        {products.map((product) => <CompactProductCard key={`product-${product.id}`} product={product} />)}
        {markets.map((market) => <CompactMarketCard key={`market-${market.id}`} market={market} />)}
      </div>
    </section>
  );
}

function CompactProductCard({ product }: { product: Product }) {
  return (
    <Link href={"/products/" + product.id} className="flex h-36 w-[72vw] max-w-72 shrink-0 snap-start gap-3 rounded-surface border border-border-subtle bg-surface-raised p-3 shadow-card">
      <div className="relative aspect-square h-full shrink-0 overflow-hidden rounded-control bg-surface-subtle">
        <SafeImage src={product.image_url} alt={product.name} fill sizes="120px" className="object-cover" />
      </div>
      <div className="min-w-0 py-1">
        <p className="text-xs font-bold text-content-secondary">{product.market_name ?? "마켓 " + product.market_id}</p>
        <p className="mt-2 line-clamp-2 text-sm font-bold leading-5">{product.name}</p>
        <ProductCardPrice variant="compact" basePrice={product.base_price} discountPrice={product.discount_price} couponPrice={couponPriceForProduct(product)} />
      </div>
    </Link>
  );
}

function CompactMarketCard({ market }: { market: Market }) {
  return <Link href={`/markets/${market.id}`} className="flex h-36 w-[72vw] max-w-72 shrink-0 snap-start gap-3 rounded-surface border border-border-subtle bg-surface-raised p-3 shadow-card"><div className="relative h-full w-24 shrink-0 overflow-hidden rounded-control bg-surface-subtle"><SafeImage src={market.profile_image_url} alt={market.name} fill sizes="96px" className="object-cover" /></div><div className="min-w-0 py-1"><div className="flex items-center gap-1"><Store size={14} className="text-action-primary" /><p className="truncate font-bold">{market.name}</p></div><p className="mt-2 line-clamp-2 text-xs leading-5 text-content-secondary">{market.description}</p><p className="mt-3 text-xs font-bold text-action-primary">팔로워 {formatFollowerCount(market.follower_count ?? 0)}</p></div></Link>;
}

function MarketCard({ market }: { market: Market }) {
  return (
    <article className="rounded-surface border border-border-subtle bg-surface-raised p-4 shadow-card md:p-5">
      <div className="flex gap-4">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-control bg-surface-subtle"><SafeImage src={market.profile_image_url} alt="" fill sizes="64px" className="object-cover" /></div>
      <div className="min-w-0"><div className="flex items-center gap-1"><Store size={14} className="text-action-primary" /><p className="truncate font-bold">{market.name}</p></div><p className="mt-1 line-clamp-2 text-xs leading-5 text-content-secondary">{market.description}</p><p className="mt-1 text-xs font-bold text-content-secondary">팔로워 {formatFollowerCount(market.follower_count ?? 0)}</p></div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <MarketMetric icon={<Sparkles size={14} />} label="마켓 만족도" value={market.satisfaction_rate == null ? "-" : `${market.satisfaction_rate.toFixed(0)}%`} />
        <MarketMetric icon={<Star size={14} />} label="평균 상품 평점" value={market.average_product_rating == null ? "-" : market.average_product_rating.toFixed(1)} />
        <MarketMetric icon={<Package size={14} />} label="상품 수" value={(market.product_count ?? 0).toLocaleString("ko-KR")} />
        <MarketMetric icon={<Sparkles size={14} />} label="신상품 수" value={(market.new_product_count ?? 0).toLocaleString("ko-KR")} />
        <MarketMetric icon={<Users size={14} />} label="팔로워 수" value={formatFollowerCount(market.follower_count ?? 0)} />
      </div>
      {(market.popular_products ?? []).length ? <div className="mt-4"><p className="mb-2 text-xs font-bold text-content-secondary">인기 상품</p><div className="no-scrollbar flex snap-x gap-3 overflow-x-auto pb-1">{(market.popular_products ?? []).slice(0, 3).map((product) => <div key={product.id} className="w-28 shrink-0 snap-start sm:w-32"><MarketPopularProductCard product={product} /></div>)}</div></div> : null}
      <div className="mt-2 flex justify-end"><Link href={`/markets/${market.id}`} className="inline-flex h-7 items-center gap-0.5 rounded border border-border-subtle px-2 text-xs font-bold hover:border-action-primary hover:text-action-primary">더보기 <ChevronRight size={13} /></Link></div>
    </article>
  );
}

function MarketPopularProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/products/${product.id}`} className="group relative block aspect-square overflow-hidden rounded-control bg-surface-subtle">
      <SafeImage src={product.image_url} alt={product.name} fill sizes="128px" className="object-cover transition duration-300 group-hover:scale-[1.03]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-2 text-content-inverse">
        <p className="truncate text-xs font-bold text-content-inverse/80">{product.market_name}</p>
        <h4 className="mt-0.5 line-clamp-2 text-xs font-bold leading-4">{product.name}</h4>
        <ProductCardPrice variant="overlay" basePrice={product.base_price} discountPrice={product.discount_price} couponPrice={couponPriceForProduct(product)} />
      </div>
    </Link>
  );
}

function MarketMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-control border border-border-subtle bg-surface-raised p-3 shadow-card"><p className="flex items-center gap-1 text-xs font-bold text-content-secondary">{icon}{label}</p><p className="mt-1 text-sm font-bold">{value}</p></div>;
}

function ResultListHeader({ title, total }: { title: string; total: number }) { return <div className="mb-4 mt-8 flex items-center justify-between"><h2 className="text-xl font-bold">{title}</h2><span className="text-sm font-bold text-content-secondary">총 {total.toLocaleString("ko-KR")}개</span></div>; }
function EmptyBox({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return <EmptyState className="mt-7" icon={icon} title={title} description={description} action={action} />;
}
function ErrorBox({ error, onRetry }: { error: unknown; onRetry: () => void }) { return <ApiErrorState error={error} onRetry={onRetry} retryLabel="검색 다시 시도" />; }
function LoadingGrid() { return <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="aspect-square animate-pulse rounded-control bg-surface-subtle" />)}</div>; }
function TrendIcon({ trend }: { trend: "UP" | "DOWN" | "SAME" }) { if (trend === "UP") return <ArrowUp size={18} className="text-status-negative" />; if (trend === "DOWN") return <ArrowDown size={18} className="text-status-info" />; return <Minus size={18} className="text-content-secondary" />; }
