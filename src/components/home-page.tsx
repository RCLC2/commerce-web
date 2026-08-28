"use client";

import { useInfiniteQuery, useQueries, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { getEffectiveToken } from "@/lib/auth-token";
import { couponPriceForProduct } from "@/lib/product-card-pricing";
import { queryKeys } from "@/lib/query-keys";
import type { CMSHomeSection, Product } from "@/lib/types";
import { useSessionStore } from "@/lib/session-store";
import { ApiErrorState } from "./api-error-state";
import { ProductCard } from "./product-card";
import { ProductCardPrice } from "./product-card-price";
import { SponsoredProductSlot } from "./sponsored-product-slot";
import { SafeImage } from "./safe-image";
import { Button } from "./ui/button";


function productsForHomeSection(section: CMSHomeSection) {
  if (section.api_url.includes("/products/promotions")) {
    return api.listPromotionProducts();
  }
  if (section.api_url.includes("/products/latest") || section.api_url.includes("/products/recommendations")) {
    return api.listLatestProducts();
  }
  return api.listPopularProducts();
}

export function HomePage() {
  const token = useSessionStore((state) => state.accessToken);
  const memberID = useSessionStore((state) => state.memberID);
  const [eventIndex, setEventIndex] = useState(0);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const effectiveToken = getEffectiveToken(token);
  const eventsQuery = useQuery({
    queryKey: queryKeys.events,
    queryFn: api.listEvents,
  });
  const events = eventsQuery.data ?? [];
  const homeCategoryChipsQuery = useQuery({
    queryKey: queryKeys.homeCategoryChips,
    queryFn: api.listHomeCategoryChips,
  });
  const homeCategoryChips = homeCategoryChipsQuery.data ?? [];
  const homeSectionsQuery = useQuery({
    queryKey: ["home-sections"],
    queryFn: api.listHomeSections,
  });
  const homeSections = homeSectionsQuery.data ?? [];
  const recommendationQuery = useInfiniteQuery({
    queryKey: queryKeys.personalizedProducts({ sort: "new" }),
    initialPageParam: 0,
    queryFn: ({ pageParam }) => api.listRecommendedProducts({ limit: 12, offset: pageParam }),
    getNextPageParam: (lastPage, pages) => (
      lastPage.length === 12 ? pages.length * 12 : undefined
    ),
  });
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = recommendationQuery;
  const recommendationProducts = recommendationQuery.data?.pages.flat() ?? [];
  const profileQuery = useQuery({
    queryKey: queryKeys.homeMe(memberID),
    queryFn: () => api.me(effectiveToken ?? ""),
    enabled: Boolean(effectiveToken),
  });
  const profile = profileQuery.data;
  const recommendationTitle = `${profile?.email?.split("@")[0] ?? "사용자"}님을 위한 추천 상품`;
  const displayHomeCategoryChips = [...homeCategoryChips].sort((a, b) => a.sequence - b.sequence || a.id - b.id);
  const displayHomeSections = [...homeSections].sort((a, b) => a.sequence - b.sequence || a.id - b.id);
  const homeSectionQueries = useQueries({
    queries: displayHomeSections.map((section) => ({
      queryKey: ["home-section-products", section.api_url],
      queryFn: () => productsForHomeSection(section),
    })),
  });

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) {
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  function moveEvent(direction: "prev" | "next") {
    if (!events.length) {
      return;
    }
    setEventIndex((current) => {
      if (direction === "prev") {
        return current === 0 ? events.length - 1 : current - 1;
      }
      return current === events.length - 1 ? 0 : current + 1;
    });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24">
      <section className="py-5">
        {eventsQuery.isError ? (
          <ApiErrorState error={eventsQuery.error} onRetry={() => void eventsQuery.refetch()} retryLabel="이벤트 다시 시도" />
        ) : events.length ? (
          <div className="relative overflow-hidden rounded-md border border-line bg-white">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${eventIndex * 100}%)` }}
            >
              {events.map((event, index) => (
                <Link key={event.id} href={`/events/${event.id}`} className="block min-w-full">
                  <div className="relative h-64 bg-zinc-100 md:h-[380px]">
                    <SafeImage src={event.image_url} alt={event.title} fill sizes="100vw" className="object-cover" priority={index === 0} />
                    <div className="absolute inset-0 bg-black/30" />
                    <div className="absolute bottom-0 left-0 max-w-lg p-5 text-white md:p-8">
                      <p className="text-sm font-bold">진행중인 이벤트</p>
                      <h1 className="mt-2 text-3xl font-black md:text-5xl">{event.title}</h1>
                      <p className="mt-2 text-sm text-white/90">{event.subtitle}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="absolute right-4 top-4 rounded-full bg-black/55 px-3 py-1 text-xs font-bold text-white">
              {eventIndex + 1}/{events.length}
            </div>
            <div className="absolute inset-y-0 left-0 flex items-center px-2">
              <Button variant="secondary" size="icon" aria-label="이전 이벤트" onClick={() => moveEvent("prev")}>
                <ChevronLeft size={18} />
              </Button>
            </div>
            <div className="absolute inset-y-0 right-0 flex items-center px-2">
              <Button variant="secondary" size="icon" aria-label="다음 이벤트" onClick={() => moveEvent("next")}>
                <ChevronRight size={18} />
              </Button>
            </div>
          </div>
        ) : eventsQuery.isLoading ? (
          <div className="h-64 animate-pulse rounded-md bg-zinc-200" />
        ) : <p className="rounded-md border border-line bg-white p-6 text-sm text-muted">진행 중인 이벤트가 없습니다.</p>}
      </section>

      <section className="rounded-2xl border border-line bg-white p-3 shadow-sm" aria-label="홈 카테고리와 이벤트">
        {homeCategoryChipsQuery.isError ? <ApiErrorState className="m-3" error={homeCategoryChipsQuery.error} onRetry={() => void homeCategoryChipsQuery.refetch()} retryLabel="카테고리 다시 시도" /> : null}
        {homeCategoryChipsQuery.isLoading ? <p className="p-3 text-sm text-muted">카테고리를 불러오는 중입니다.</p> : null}
        {homeCategoryChipsQuery.isSuccess && displayHomeCategoryChips.length === 0 ? <p className="p-3 text-sm text-muted">표시할 홈 카테고리가 없습니다.</p> : null}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(72px,1fr))] gap-1.5">
          {displayHomeCategoryChips.map((chip) => (
            <Link key={chip.id} href={chip.href} className={`relative flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl p-1 transition hover:-translate-y-0.5 ${chip.chip_type === "CATEGORY_EVENT" ? "bg-rose-50 hover:bg-rose-100" : "hover:bg-zinc-50"}`}>
              {chip.chip_type === "CATEGORY_EVENT" ? <span className="absolute right-1.5 top-1.5 rounded-full bg-brand px-1.5 py-0.5 text-[8px] font-black tracking-wide text-white">EVENT</span> : null}
              <span className={`flex h-10 w-10 items-center justify-center rounded-full ${chip.chip_type === "CATEGORY_EVENT" ? "bg-white shadow-sm" : "bg-zinc-100"} text-brand`}>
                <SafeImage src={chip.icon_url} alt="" width={24} height={24} className="h-6 w-6 object-contain" />
              </span>
              <span className="line-clamp-1 text-center text-xs font-bold">{chip.title}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="py-3" aria-label="메인 보장형 광고">
        <SponsoredProductSlot placementKey="home.main_banner" className="border-2 shadow-sm" />
      </section>
		<section className="py-2" aria-label="인앱 광고 알림">
			<SponsoredProductSlot placementKey="crm.in_app_notification" impressionEventType="IN_APP_IMPRESSION" />
		</section>
      {homeSectionsQuery.isError ? <ApiErrorState className="my-7" error={homeSectionsQuery.error} onRetry={() => void homeSectionsQuery.refetch()} retryLabel="홈 구좌 다시 시도" /> : null}
      {homeSectionsQuery.isLoading ? <p className="py-7 text-sm text-muted">홈 상품 구좌를 불러오는 중입니다.</p> : null}
      {homeSectionsQuery.isSuccess && displayHomeSections.length === 0 ? <p className="py-7 text-sm text-muted">표시할 홈 상품 구좌가 없습니다.</p> : null}
      {displayHomeSections.map((section, index) => (
        <ProductCarouselSection
          key={section.id || section.api_url}
          title={section.title}
          description={section.description ?? ""}
          products={homeSectionQueries[index]?.data ?? []}
          isLoading={homeSectionQueries[index]?.isLoading ?? false}
          isSuccess={homeSectionQueries[index]?.isSuccess ?? false}
          error={homeSectionQueries[index]?.error}
          onRetry={() => void homeSectionQueries[index]?.refetch()}
        />
      ))}
      <section className="py-3" aria-label="스폰서드 상품">
        <SponsoredProductSlot placementKey="home_feed.sponsored_card" />
      </section>

      <section className="py-7">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-black">{recommendationTitle}</h2>
            {profileQuery.isError ? <p className="mt-1 text-xs font-bold text-amber-800">회원 정보를 불러오지 못해 일반 추천을 표시합니다.</p> : null}
          </div>
        </div>
        {recommendationQuery.isError ? (
          <ApiErrorState error={recommendationQuery.error} onRetry={() => void recommendationQuery.refetch()} retryLabel="추천 다시 시도" />
        ) : recommendationQuery.isLoading ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-4 md:gap-x-5">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="aspect-square animate-pulse rounded-md bg-zinc-200" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-4 md:gap-x-5">
            {recommendationProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
        {recommendationQuery.isSuccess && recommendationProducts.length === 0 ? <p className="text-sm text-muted">표시할 추천 상품이 없습니다.</p> : null}
        <div ref={loadMoreRef} className="h-8" />
        {recommendationQuery.hasNextPage || recommendationQuery.isFetchingNextPage ? (
          <p className="text-center text-xs text-muted">추천 상품을 더 불러오는 중입니다.</p>
        ) : null}
      </section>
    </main>
  );
}

function ProductCarouselSection({
  title,
  description,
  products,
  isLoading,
  isSuccess,
  error,
  onRetry,
}: {
  title: string;
  description: string;
  products: Product[];
  isLoading: boolean;
  isSuccess: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  const carouselRef = useRef<HTMLDivElement | null>(null);

  function slide(direction: "prev" | "next") {
    carouselRef.current?.scrollBy({
      left: direction === "prev" ? -640 : 640,
      behavior: "smooth",
    });
  }

  return (
    <section className="py-7">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="icon" aria-label={`${title} 이전`} onClick={() => slide("prev")}>
            <ChevronLeft size={18} />
          </Button>
          <Button variant="secondary" size="icon" aria-label={`${title} 다음`} onClick={() => slide("next")}>
            <ChevronRight size={18} />
          </Button>
        </div>
      </div>
      {isLoading ? (
        <div className="flex gap-3 overflow-hidden md:gap-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-56 w-[42vw] shrink-0 animate-pulse rounded-md bg-zinc-200 sm:w-48 md:w-52" />
          ))}
        </div>
      ) : error ? (
        <ApiErrorState error={error} onRetry={onRetry} />
      ) : (
        <div ref={carouselRef} className="no-scrollbar flex snap-x gap-3 overflow-x-auto scroll-smooth pb-1 md:gap-4">
          {products.map((product) => (
            <div key={`${product.id}-${title}`} className="w-[42vw] shrink-0 snap-start sm:w-48 md:w-52">
              <PopularSquareCard product={product} />
            </div>
          ))}
        </div>
      )}
      {isSuccess && products.length === 0 ? <p className="text-sm text-muted">표시할 상품이 없습니다.</p> : null}
    </section>
  );
}
function PopularSquareCard({ product }: { product: Product }) {
  return (
    <Link href={`/products/${product.id}`} className="group relative block aspect-square overflow-hidden rounded-md bg-zinc-100">
      <SafeImage
        src={product.image_url}
        alt={product.name}
        fill
        sizes="(max-width: 768px) 42vw, 208px"
        className="object-cover transition duration-300 group-hover:scale-[1.03]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3 text-white">
        <p className="truncate text-xs font-bold text-white/80">{product.market_name}</p>
        <h3 className="mt-1 line-clamp-2 text-sm font-black leading-5">{product.name}</h3>
        <ProductCardPrice
          variant="overlay"
          basePrice={product.base_price}
          discountPrice={product.discount_price}
          couponPrice={couponPriceForProduct(product)}
        />
      </div>
    </Link>
  );
}
