"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, ArrowUp, ChevronLeft, ChevronRight, Minus, Package, Search, Sparkles, Star, Store, Users, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Market, Product, SearchResultSection } from "@/lib/types";
import { formatFollowerCount, formatPrice } from "@/lib/utils";
import { ProductCard } from "./product-card";
import { SafeImage } from "./safe-image";
import { Button } from "./ui/button";

export function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q")?.trim() ?? "";
  const audience = searchParams.get("audience") === "men" ? "men" : "women";
  const productPage = positivePage(searchParams.get("product_page"));
  const marketPage = positivePage(searchParams.get("market_page"));
  const pageKey = `${query}:${audience}:${productPage}:${marketPage}`;
  return <SearchExperience key={pageKey} initialQuery={query} audience={audience} productPage={productPage} marketPage={marketPage} />;
}

function SearchExperience({
  initialQuery,
  audience,
  productPage,
  marketPage,
}: {
  initialQuery: string;
  audience: "women" | "men";
  productPage: number;
  marketPage: number;
}) {
  const router = useRouter();
  const [input, setInput] = useState(initialQuery);
  const [now, setNow] = useState<Date | null>(null);
  const carouselRefs = useRef(new Map<number, HTMLDivElement>());
  const trimmedInput = input.trim();
  const searchRequest = { q: initialQuery, audience, productPage, marketPage } as const;
  const { data: results, isLoading, error, refetch: refetchResults } = useQuery({
    queryKey: queryKeys.integratedSearch(searchRequest),
    queryFn: () => api.search(searchRequest),
    enabled: initialQuery.length > 0,
  });
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

  function changePage(kind: "product" | "market", page: number) {
    const params = new URLSearchParams({ q: initialQuery, audience });
    if (kind === "product") {
      params.set("product_page", String(page));
      if (marketPage > 1) params.set("market_page", String(marketPage));
    } else {
      params.set("market_page", String(page));
      if (productPage > 1) params.set("product_page", String(productPage));
    }
    router.push(`/search?${params.toString()}`, { scroll: false });
  }

  function slide(sectionID: number, direction: "prev" | "next") {
    carouselRefs.current.get(sectionID)?.scrollBy({ left: direction === "prev" ? -720 : 720, behavior: "smooth" });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-2">
      <form className="sticky top-0 z-30 flex h-16 items-center gap-3 bg-background/95 backdrop-blur" onSubmit={submitSearch}>
        <button type="button" aria-label="뒤로가기" onClick={goBack} className="flex h-11 w-11 shrink-0 items-center justify-center">
          <ArrowLeft size={27} />
        </button>
        <div className="relative flex h-12 min-w-0 flex-1 items-center gap-2 rounded-md bg-zinc-100 px-3">
          <Search size={20} className="shrink-0 text-muted" />
          <input value={input} onChange={(event) => setInput(event.target.value)} className="w-full bg-transparent text-lg font-bold outline-none" placeholder="상품, 마켓, 키워드 검색" aria-label="검색어 입력" autoFocus />
          {input ? <button type="button" aria-label="검색어 지우기" onClick={() => setInput("")} className="text-muted"><XCircle size={22} /></button> : null}
        </div>
      </form>

      {!initialQuery ? (
        <section className="mx-auto max-w-3xl pt-7">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl font-black">인기 검색어</h1>
            <p className="text-sm font-bold text-muted">{now ? now.toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }) : "--.-- --:--"} 현재</p>
          </div>
          <div className="mt-5 flex gap-3">
            {(trending?.segments ?? [{ id: "women" as const, label: "여성" }, { id: "men" as const, label: "남성" }]).map((segment) => (
              <button key={segment.id} type="button" className={`h-11 rounded-full border px-6 text-sm font-black ${audience === segment.id ? "border-brand bg-brand text-white" : "border-line bg-white text-muted"}`} onClick={() => router.push(`/search?audience=${segment.id}`)}>
                {segment.label}
              </button>
            ))}
          </div>
          <div className="mt-6">
            {trendingQuery.isLoading ? <p className="text-sm text-muted">인기 검색어를 불러오는 중입니다.</p> : null}
            {trendingQuery.isError ? <div className="rounded-md border border-brand/30 bg-red-50 p-4 text-sm"><p className="font-bold text-brand">인기 검색어를 불러오지 못했습니다.</p><Button className="mt-3" size="sm" variant="secondary" onClick={() => void trendingQuery.refetch()}>다시 시도</Button></div> : null}
            {trendingQuery.isSuccess && !trendingQuery.data.items.length ? <p className="text-sm text-muted">표시할 인기 검색어가 없습니다.</p> : null}
            {(trending?.items ?? []).map((item) => (
              <button key={item.keyword} className="flex h-14 w-full items-center justify-between text-left" onClick={() => goToSearch(item.keyword)}>
                <span className="flex items-center gap-5 text-lg"><strong className="w-6 text-center">{item.rank}</strong>{item.keyword}</span>
                <TrendIcon trend={item.trend} />
              </button>
            ))}
          </div>
        </section>
      ) : (
        <div className="mx-auto max-w-4xl">
          <ResultListHeader title="상품" total={results?.products.total ?? 0} />
          <div className="space-y-7">
            {productSections.map((section) => <SearchCarousel key={section.id} section={section} setRef={(node) => { if (node) carouselRefs.current.set(section.id, node); else carouselRefs.current.delete(section.id); }} onSlide={(direction) => slide(section.id, direction)} />)}
          </div>
          {error ? <ErrorBox message={error.message} onRetry={() => void refetchResults()} /> : null}
          {isLoading ? <LoadingGrid /> : null}
          {!isLoading && !error && !results?.products.items.length ? <EmptyBox message="검색된 상품이 없습니다." /> : null}
          {results?.products.items.length ? <div className="mt-7 grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-4 md:gap-x-5">{results.products.items.map((product) => <ProductCard key={product.id} product={product} />)}</div> : null}
          {results ? <Pagination page={results.products.page} totalPages={results.products.total_pages} onChange={(page) => changePage("product", page)} label="상품" /> : null}

          <div className="mt-12 border-t border-line pt-2">
            <ResultListHeader title="마켓" total={results?.markets.total ?? 0} />
            <div className="space-y-7">
              {marketSections.map((section) => <SearchCarousel key={section.id} section={section} setRef={(node) => { if (node) carouselRefs.current.set(section.id, node); else carouselRefs.current.delete(section.id); }} onSlide={(direction) => slide(section.id, direction)} />)}
            </div>
          </div>
          {!isLoading && !error && !results?.markets.items.length ? <EmptyBox message="검색된 마켓이 없습니다." /> : null}
          {results?.markets.items.length ? <div className="mt-7 space-y-4">{results.markets.items.map((market) => <MarketCard key={market.id} market={market} />)}</div> : null}
          {results ? <Pagination page={results.markets.page} totalPages={results.markets.total_pages} onChange={(page) => changePage("market", page)} label="마켓" /> : null}
        </div>
      )}
    </main>
  );
}

function SearchCarousel({ section, setRef, onSlide }: { section: SearchResultSection; setRef: (node: HTMLDivElement | null) => void; onSlide: (direction: "prev" | "next") => void }) {
  const products = section.products ?? [];
  const markets = section.markets ?? [];
  if (!products.length && !markets.length) return null;
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-black">{section.title}</h2>
        <div className="flex gap-2">
          <button aria-label={`${section.title} 이전`} onClick={() => onSlide("prev")} className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white"><ChevronLeft size={18} /></button>
          <button aria-label={`${section.title} 다음`} onClick={() => onSlide("next")} className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white"><ChevronRight size={18} /></button>
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
  return <Link href={`/products/${product.id}`} className="flex h-36 w-[72vw] max-w-72 shrink-0 snap-start gap-3 rounded-md border border-line bg-white p-3"><div className="relative aspect-square h-full shrink-0 overflow-hidden rounded-md bg-zinc-100"><SafeImage src={product.image_url} alt={product.name} fill sizes="120px" className="object-cover" /></div><div className="min-w-0 py-1"><p className="text-xs font-bold text-muted">{product.market_name ?? `마켓 ${product.market_id}`}</p><p className="mt-2 line-clamp-2 text-sm font-black leading-5">{product.name}</p><p className="mt-3 text-sm font-black text-brand">{formatPrice(product.discount_price || product.base_price)}</p></div></Link>;
}

function CompactMarketCard({ market }: { market: Market }) {
  return <Link href={`/markets/${market.id}`} className="flex h-36 w-[72vw] max-w-72 shrink-0 snap-start gap-3 rounded-md border border-line bg-white p-3"><div className="relative h-full w-24 shrink-0 overflow-hidden rounded-md bg-zinc-100"><SafeImage src={market.profile_image_url} alt={market.name} fill sizes="96px" className="object-cover" /></div><div className="min-w-0 py-1"><div className="flex items-center gap-1"><Store size={14} className="text-brand" /><p className="truncate font-black">{market.name}</p></div><p className="mt-2 line-clamp-2 text-xs leading-5 text-muted">{market.description}</p><p className="mt-3 text-xs font-bold text-brand">팔로워 {formatFollowerCount(market.follower_count ?? 0)}</p></div></Link>;
}

function MarketCard({ market }: { market: Market }) {
  return (
    <article className="rounded-md border border-line bg-white p-4 md:p-5">
      <div className="flex gap-4">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-zinc-100"><SafeImage src={market.profile_image_url} alt="" fill sizes="64px" className="object-cover" /></div>
      <div className="min-w-0"><div className="flex items-center gap-1"><Store size={14} className="text-brand" /><p className="truncate font-black">{market.name}</p></div><p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{market.description}</p><p className="mt-1 text-xs font-bold text-muted">팔로워 {formatFollowerCount(market.follower_count ?? 0)}</p></div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <MarketMetric icon={<Sparkles size={14} />} label="마켓 만족도" value={market.satisfaction_rate == null ? "-" : `${market.satisfaction_rate.toFixed(0)}%`} />
        <MarketMetric icon={<Star size={14} />} label="평균 상품 평점" value={market.average_product_rating == null ? "-" : market.average_product_rating.toFixed(1)} />
        <MarketMetric icon={<Package size={14} />} label="상품 수" value={(market.product_count ?? 0).toLocaleString("ko-KR")} />
        <MarketMetric icon={<Sparkles size={14} />} label="신상품 수" value={(market.new_product_count ?? 0).toLocaleString("ko-KR")} />
        <MarketMetric icon={<Users size={14} />} label="팔로워 수" value={formatFollowerCount(market.follower_count ?? 0)} />
      </div>
      {(market.popular_products ?? []).length ? <div className="mt-4"><p className="mb-2 text-xs font-black text-muted">인기 상품</p><div className="no-scrollbar flex snap-x gap-3 overflow-x-auto pb-1">{(market.popular_products ?? []).slice(0, 3).map((product) => <div key={product.id} className="w-28 shrink-0 snap-start sm:w-32"><MarketPopularProductCard product={product} /></div>)}</div></div> : null}
      <div className="mt-2 flex justify-end"><Link href={`/markets/${market.id}`} className="inline-flex h-7 items-center gap-0.5 rounded border border-line px-2 text-xs font-black hover:border-brand hover:text-brand">더보기 <ChevronRight size={13} /></Link></div>
    </article>
  );
}

function MarketPopularProductCard({ product }: { product: Product }) {
  const price = product.discount_price || product.base_price;
  return (
    <Link href={`/products/${product.id}`} className="group relative block aspect-square overflow-hidden rounded-md bg-zinc-100">
      <SafeImage src={product.image_url} alt={product.name} fill sizes="128px" className="object-cover transition duration-300 group-hover:scale-[1.03]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-2 text-white">
        <p className="truncate text-[10px] font-bold text-white/80">{product.market_name}</p>
        <h4 className="mt-0.5 line-clamp-2 text-xs font-black leading-4">{product.name}</h4>
        <p className="mt-0.5 text-xs font-black">{formatPrice(price)}</p>
      </div>
    </Link>
  );
}

function MarketMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-md bg-zinc-50 p-3"><p className="flex items-center gap-1 text-[11px] font-bold text-muted">{icon}{label}</p><p className="mt-1 text-sm font-black">{value}</p></div>;
}

function Pagination({ page, totalPages, onChange, label }: { page: number; totalPages: number; onChange: (page: number) => void; label: string }) {
  if (totalPages <= 1) return null;
  const pages = Array.from(new Set([1, page - 1, page, page + 1, totalPages])).filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b);
  return <nav aria-label={`${label} 검색 결과 페이지`} className="mt-7 flex items-center justify-center gap-2"><button disabled={page <= 1} onClick={() => onChange(page - 1)} className="h-9 rounded-md border border-line px-3 text-sm font-bold disabled:opacity-30">이전</button>{pages.map((value, index) => <span key={value} className="contents">{index > 0 && value - pages[index - 1] > 1 ? <span className="px-1 text-muted">…</span> : null}<button aria-current={value === page ? "page" : undefined} onClick={() => onChange(value)} className={`h-9 min-w-9 rounded-md border px-3 text-sm font-black ${value === page ? "border-brand bg-brand text-white" : "border-line bg-white"}`}>{value}</button></span>)}<button disabled={page >= totalPages} onClick={() => onChange(page + 1)} className="h-9 rounded-md border border-line px-3 text-sm font-bold disabled:opacity-30">다음</button></nav>;
}

function ResultListHeader({ title, total }: { title: string; total: number }) { return <div className="mb-4 mt-8 flex items-center justify-between"><h2 className="text-xl font-black">{title}</h2><span className="text-sm font-bold text-muted">총 {total.toLocaleString("ko-KR")}개</span></div>; }
function EmptyBox({ message }: { message: string }) { return <p className="rounded-md border border-line bg-white p-5 text-sm text-muted">{message}</p>; }
function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) { return <div className="rounded-md border border-brand/30 bg-red-50 p-5 text-sm"><p className="font-bold text-brand">{message}</p><Button className="mt-3" size="sm" variant="secondary" onClick={onRetry}>검색 다시 시도</Button></div>; }
function LoadingGrid() { return <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="aspect-square animate-pulse rounded-md bg-zinc-200" />)}</div>; }
function TrendIcon({ trend }: { trend: "UP" | "DOWN" | "SAME" }) { if (trend === "UP") return <ArrowUp size={18} className="text-red-500" />; if (trend === "DOWN") return <ArrowDown size={18} className="text-blue-500" />; return <Minus size={18} className="text-muted" />; }
function positivePage(value: string | null) { const parsed = Number(value); return Number.isInteger(parsed) && parsed > 0 ? parsed : 1; }
