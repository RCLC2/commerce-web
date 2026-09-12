"use client";

import { useInfiniteQuery, useQueries, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Store } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { cryptoSafeID } from "@/lib/ad-events";
import { getEffectiveToken } from "@/lib/auth-token";
import { couponPriceForProduct } from "@/lib/product-card-pricing";
import { queryKeys } from "@/lib/query-keys";
import type { CMSHomeSection, CommerceEvent, HomeCategoryChip, Product } from "@/lib/types";
import { useSessionStore } from "@/lib/session-store";
import { ApiErrorState } from "./api-error-state";
import { ProductCard } from "./product-card";
import { ProductCardPrice } from "./product-card-price";
import { HomeContextTextCard, HomeFeatureCard } from "./home-placement-cards";
import { PageLayout } from "./page-layout";
import { SafeImage } from "./safe-image";
import { Button } from "./ui/button";
import { LoadingState } from "./ui/feedback";


function productsForHomeSection(section: CMSHomeSection) {
  if (section.api_url.includes("/products/promotions")) {
    return api.listPromotionProducts();
  }
  if (section.api_url.includes("/products/latest")) {
    return api.listLatestProducts();
  }
  return api.listPopularProducts();
}

function isLegacyRecommendationSection(section: CMSHomeSection) {
  return section.api_url.includes("/products/recommendations");
}

export function usesEdgeChevronControls(section: CMSHomeSection) {
  try {
    const pathname = new URL(section.api_url, "https://commerce.local").pathname.replace(/\/+$/, "");
    return pathname === "/api/v1/products/popular" || pathname === "/api/v1/products/promotions";
  } catch {
    return false;
  }
}

const HOME_RECOMMENDATION_PAGE_SIZE = 12;

function nextRecommendationOffset(lastPage: { products: Product[] }, pages: Array<{ products: Product[] }>) {
  if (lastPage.products.length < HOME_RECOMMENDATION_PAGE_SIZE) {
    return undefined;
  }

  const previousProductIDs = new Set(
    pages.slice(0, -1).flatMap((page) => page.products.map((product) => product.id)),
  );
  if (lastPage.products.every((product) => previousProductIDs.has(product.id))) {
    return undefined;
  }

  return pages.length * HOME_RECOMMENDATION_PAGE_SIZE;
}

function HomeCategoryChipLink({ chip, className }: { chip: HomeCategoryChip; className?: string }) {
  return (
    <Link
      href={chip.href}
      className={`relative flex min-h-20 flex-col items-center justify-center gap-1 rounded-control p-1 transition hover:-translate-y-0.5 ${chip.chip_type === "CATEGORY_EVENT" ? "bg-action-secondary hover:bg-action-secondary" : "hover:bg-surface-subtle"} ${className ?? ""}`}
    >
      {chip.chip_type === "CATEGORY_EVENT" ? <span className="absolute right-1.5 top-1.5 rounded-full bg-action-primary px-1.5 py-0.5 text-xs font-bold tracking-wide text-content-inverse">이벤트</span> : null}
      <span className={`flex h-10 w-10 items-center justify-center rounded-full ${chip.chip_type === "CATEGORY_EVENT" ? "bg-surface-raised shadow-card" : "border border-border-subtle bg-surface-raised"} text-action-primary`}>
        <SafeImage src={chip.icon_url} alt="" width={24} height={24} className="h-6 w-6 object-contain" />
      </span>
      <span className="line-clamp-1 text-center text-xs font-bold">{chip.title}</span>
    </Link>
  );
}

const MOBILE_CATEGORY_PAGE_SIZE = 8;

function createCategoryPages(chips: HomeCategoryChip[]) {
  return Array.from(
    { length: Math.ceil(chips.length / MOBILE_CATEGORY_PAGE_SIZE) },
    (_, pageIndex) => chips.slice(pageIndex * MOBILE_CATEGORY_PAGE_SIZE, (pageIndex + 1) * MOBILE_CATEGORY_PAGE_SIZE),
  );
}

function HomeCategoryChips({ chips }: { chips: HomeCategoryChip[] }) {
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const [activePage, setActivePage] = useState(0);
  const pages = createCategoryPages(chips);
  const activePageIndex = Math.min(activePage, Math.max(0, pages.length - 1));

  if (chips.length === 0) return null;

  function updateActivePage() {
    const slider = sliderRef.current;
    if (!slider) return;
    const pageWidth = slider.clientWidth;
    if (!pageWidth) return;
    setActivePage(Math.min(pages.length - 1, Math.max(0, Math.round(slider.scrollLeft / pageWidth))));
  }

  function moveToPage(pageIndex: number) {
    const slider = sliderRef.current;
    if (!slider) return;
    const left = slider.clientWidth * pageIndex;
    const behavior: ScrollBehavior = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

    if (typeof slider.scrollTo === "function") {
      slider.scrollTo({ left, behavior });
    } else {
      slider.scrollLeft = left;
    }
  }

  return (
    <>
      <div className="sm:hidden">
        <div
          ref={sliderRef}
          role="region"
          aria-label="홈 카테고리 페이지 슬라이드"
          className="no-scrollbar flex min-w-0 snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth motion-reduce:scroll-auto"
          onScroll={updateActivePage}
        >
          {pages.map((page, pageIndex) => (
            <div
              key={pageIndex}
              role="group"
              aria-label={`카테고리 페이지 ${pageIndex + 1} / ${pages.length}`}
              className="grid h-[10.375rem] w-full shrink-0 snap-start grid-cols-4 grid-rows-[repeat(2,5rem)] gap-1.5"
            >
              {page.map((chip) => <HomeCategoryChipLink key={chip.id} chip={chip} />)}
            </div>
          ))}
        </div>
        {pages.length > 1 ? (
          <nav className="mt-1 flex h-11 items-center justify-center" aria-label="홈 카테고리 페이지 위치">
            <p className="sr-only" aria-live="polite">카테고리 페이지 {activePageIndex + 1} / {pages.length}</p>
            {pages.map((_, pageIndex) => {
              const isActive = activePageIndex === pageIndex;
              return (
                <button
                  key={pageIndex}
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-primary"
                  aria-label={`카테고리 페이지 ${pageIndex + 1}로 이동`}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => moveToPage(pageIndex)}
                >
                  <span aria-hidden="true" className={`rounded-full transition-all motion-reduce:transition-none ${isActive ? "h-1.5 w-3.5 bg-action-primary" : "h-1.5 w-1.5 bg-content-secondary/45"}`} />
                </button>
              );
            })}
          </nav>
        ) : null}
      </div>

      <div className="hidden grid-cols-[repeat(auto-fit,minmax(72px,1fr))] gap-1.5 sm:grid">
        {chips.map((chip) => <HomeCategoryChipLink key={chip.id} chip={chip} />)}
      </div>
    </>
  );
}

export function HomePage() {
  const token = useSessionStore((state) => state.accessToken);
  const memberID = useSessionStore((state) => state.memberID);
  const hydrated = useSessionStore((state) => state.hydrated);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [homePlacementRequestID] = useState(() => `home-${cryptoSafeID()}`);
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
  const homePlacementsQuery = useQuery({
    queryKey: queryKeys.homePlacements(memberID),
    queryFn: () => api.homePlacements(homePlacementRequestID, effectiveToken),
    enabled: hydrated,
    retry: false,
  });
  const recommendationQuery = useInfiniteQuery({
    queryKey: queryKeys.homeRecommendations(memberID),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      if (!effectiveToken) {
        return {
          source: "GUEST" as const,
          products: await api.listPopularProducts({ limit: HOME_RECOMMENDATION_PAGE_SIZE, offset: pageParam }),
        };
      }
      const recommendations = await api.listMyRecommendations(effectiveToken, {
        limit: HOME_RECOMMENDATION_PAGE_SIZE,
        offset: pageParam,
      });
      return {
        source: recommendations[0]?.source ?? "BATCH",
        products: recommendations.map((recommendation) => recommendation.product),
      };
    },
    getNextPageParam: nextRecommendationOffset,
    enabled: hydrated,
  });
  const recommendationProducts = Array.from(
    new Map(
      (recommendationQuery.data?.pages.flatMap((page) => page.products) ?? [])
        .map((product) => [product.id, product] as const),
    ).values(),
  );
  const profileQuery = useQuery({
    queryKey: queryKeys.homeMe(memberID),
    queryFn: () => api.me(effectiveToken ?? ""),
    enabled: Boolean(effectiveToken),
  });
  const profile = profileQuery.data;
  const profileName = profile?.email?.split("@")[0] || "회원";
  const recommendationSource = recommendationQuery.data?.pages[0]?.source ?? (hydrated && !effectiveToken ? "GUEST" : undefined);
  const recommendationTitle = recommendationSource === "GUEST"
    ? "지금 많이 보는 상품"
    : recommendationSource === "FALLBACK"
      ? "요즘 인기 있는 상품"
      : `${profileName}님을 위한 추천 상품`;
  const recommendationDescription = recommendationSource === "GUEST"
    ? "로그인하면 취향과 쇼핑 활동을 반영한 추천을 볼 수 있어요."
    : recommendationSource === "FALLBACK"
      ? "취향을 더 알아가는 동안 회원들이 많이 보는 상품을 보여드려요."
      : "최근 활동과 선호를 반영해 고른 상품이에요.";
  const displayHomeCategoryChips = [...homeCategoryChips].sort((a, b) => a.sequence - b.sequence || a.id - b.id);
  const displayHomeSections = [...homeSections]
    .filter((section) => !isLegacyRecommendationSection(section))
    .sort((a, b) => a.sequence - b.sequence || a.id - b.id);
  const homeSectionQueries = useQueries({
    queries: displayHomeSections.map((section) => ({
      queryKey: ["home-section-products", section.api_url],
      queryFn: () => productsForHomeSection(section),
    })),
  });

  const { fetchNextPage, hasNextPage, isFetchingNextPage } = recommendationQuery;
  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    }, { rootMargin: "320px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <PageLayout className="pt-0">
      <section className="py-5">
        {eventsQuery.isError ? (
          <ApiErrorState error={eventsQuery.error} onRetry={() => void eventsQuery.refetch()} retryLabel="이벤트 다시 시도" />
        ) : events.length ? (
          <EventCarousel events={events} />
        ) : eventsQuery.isLoading ? (
          <LoadingState className="min-h-52 md:min-h-72" label="이벤트를 불러오는 중입니다." />
        ) : <p className="rounded-md border border-border-subtle bg-surface-raised p-6 text-sm text-content-secondary">진행 중인 이벤트가 없습니다.</p>}
      </section>

      <section className="rounded-surface border border-border-subtle bg-surface-raised p-3 shadow-card" aria-label="홈 카테고리와 이벤트">
        {homeCategoryChipsQuery.isError ? <ApiErrorState className="m-3" error={homeCategoryChipsQuery.error} onRetry={() => void homeCategoryChipsQuery.refetch()} retryLabel="카테고리 다시 시도" /> : null}
        {homeCategoryChipsQuery.isLoading ? <LoadingState className="min-h-20" label="카테고리를 불러오는 중입니다." /> : null}
        {homeCategoryChipsQuery.isSuccess && displayHomeCategoryChips.length === 0 ? <p className="p-3 text-sm text-content-secondary">표시할 홈 카테고리가 없습니다.</p> : null}
        {homeCategoryChipsQuery.isSuccess ? <HomeCategoryChips chips={displayHomeCategoryChips} /> : null}
      </section>
      {homePlacementsQuery.isLoading ? <LoadingState className="min-h-24" label="맞춤 혜택을 불러오는 중입니다." /> : (
        <HomeContextTextCard
          card={homePlacementsQuery.data?.context_text.card}
          token={effectiveToken}
          memberID={memberID}
        />
      )}
      {homeSectionsQuery.isError ? <ApiErrorState className="my-7" error={homeSectionsQuery.error} onRetry={() => void homeSectionsQuery.refetch()} retryLabel="홈 구좌 다시 시도" /> : null}
      {homeSectionsQuery.isLoading ? <LoadingState className="min-h-40" label="홈 상품 구좌를 불러오는 중입니다." /> : null}
      {homeSectionsQuery.isSuccess && displayHomeSections.length === 0 ? <p className="py-7 text-sm text-content-secondary">표시할 홈 상품 구좌가 없습니다.</p> : null}
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
          edgeChevronControls={usesEdgeChevronControls(section)}
        />
      ))}
      <section className="py-2" aria-label="홈 추천 카드">
        {homePlacementsQuery.isLoading ? <LoadingState className="min-h-44" label="추천 카드를 불러오는 중입니다." /> : <HomeFeatureCard card={homePlacementsQuery.data?.feature_card.card} token={effectiveToken} memberID={memberID} />}
      </section>

      <section id="recommendations" className="scroll-mt-20 py-7">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold">{recommendationTitle}</h2>
            <p className="mt-1 text-sm text-content-secondary">{recommendationDescription}</p>
            {effectiveToken && profileQuery.isError ? <p className="mt-1 text-xs font-bold text-status-warning">회원 이름을 불러오지 못했지만 추천 결과는 그대로 표시합니다.</p> : null}
          </div>
        </div>
        {recommendationQuery.isError ? (
          <ApiErrorState error={recommendationQuery.error} onRetry={() => void recommendationQuery.refetch()} retryLabel="추천 다시 시도" />
        ) : recommendationQuery.isLoading ? (
          <LoadingState className="min-h-64" label="추천 상품을 불러오는 중입니다." />
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-4 md:gap-x-5">
            {recommendationProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
        {recommendationQuery.isSuccess && recommendationProducts.length === 0 ? <p className="text-sm text-content-secondary">표시할 추천 상품이 없습니다.</p> : null}
        <div ref={loadMoreRef} className="h-8" aria-hidden="true" />
        {recommendationQuery.hasNextPage || recommendationQuery.isFetchingNextPage ? (
          <LoadingState className="min-h-20" label="추천 상품을 더 불러오는 중입니다." />
        ) : null}
      </section>
    </PageLayout>
  );
}

const EVENT_AUTOPLAY_INTERVAL_MS = 3_000;
const CAROUSEL_CONTROL_SIZE_CLASSNAME = "h-12 min-h-12 w-12";
const CAROUSEL_PRODUCT_CHEVRON_CLASSNAME = `${CAROUSEL_CONTROL_SIZE_CLASSNAME} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-primary`;
const CAROUSEL_EDGE_CHEVRON_CLASSNAME = `rounded-full border-0 bg-transparent text-content-inverse shadow-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] not-disabled:hover:bg-black/35 not-disabled:hover:text-content-inverse not-disabled:active:bg-black/45 focus-visible:bg-black/45 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-content-inverse ${CAROUSEL_CONTROL_SIZE_CLASSNAME}`;

export function EventCarousel({ events }: { events: CommerceEvent[] }) {
  const [eventIndex, setEventIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const currentEventIndex = events.length ? eventIndex % events.length : 0;
  const isAutoplayPaused = isHovered || isFocusWithin;

  useEffect(() => {
    if (events.length < 2 || isAutoplayPaused) {
      return;
    }

    const timeoutID = window.setTimeout(() => {
      setEventIndex((current) => (current + 1) % events.length);
    }, EVENT_AUTOPLAY_INTERVAL_MS);

    return () => window.clearTimeout(timeoutID);
  }, [eventIndex, events.length, isAutoplayPaused]);

  function moveEvent(direction: "prev" | "next") {
    if (!events.length) {
      return;
    }
    setEventIndex((current) => {
      const normalizedIndex = current % events.length;
      if (direction === "prev") {
        return normalizedIndex === 0 ? events.length - 1 : normalizedIndex - 1;
      }
      return normalizedIndex === events.length - 1 ? 0 : normalizedIndex + 1;
    });
  }

  if (!events.length) {
    return null;
  }

  return (
    <div
      className="relative overflow-hidden rounded-surface border border-border-subtle bg-surface-raised shadow-card"
      role="region"
      aria-label="진행 중인 이벤트"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocusWithin(true)}
      onBlur={(event) => {
        if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
          setIsFocusWithin(false);
        }
      }}
    >
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${currentEventIndex * 100}%)` }}
      >
        {events.map((event, index) => (
          <Link key={event.id} href={`/events/${event.id}`} className="block min-w-full">
            <div className="relative h-52 bg-surface-subtle md:h-72">
              <SafeImage src={event.image_url} alt={event.title} fill sizes="100vw" className="object-cover" priority={index === 0} />
              <div className="absolute inset-0 bg-black/30" />
              <div className="absolute bottom-0 left-0 max-w-lg p-5 text-content-inverse md:p-8">
                <p className="text-sm font-bold">진행중인 이벤트</p>
                <h1 className="mt-1.5 text-2xl font-bold md:text-3xl">{event.title}</h1>
                <p className="mt-2 text-sm text-content-inverse/90">{event.subtitle}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <div className="absolute right-4 top-4 rounded-full bg-black/55 px-3 py-1 text-xs font-bold text-content-inverse">
        {currentEventIndex + 1}/{events.length}
      </div>
      <div className="absolute inset-y-0 left-0 hidden items-center px-2 sm:flex">
        <Button
          variant="ghost"
          size="icon"
          aria-label="이전 이벤트"
          onClick={() => moveEvent("prev")}
          className={CAROUSEL_EDGE_CHEVRON_CLASSNAME}
        >
          <ChevronLeft size={24} />
        </Button>
      </div>
      <div className="absolute inset-y-0 right-0 hidden items-center px-2 sm:flex">
        <Button
          variant="ghost"
          size="icon"
          aria-label="다음 이벤트"
          onClick={() => moveEvent("next")}
          className={CAROUSEL_EDGE_CHEVRON_CLASSNAME}
        >
          <ChevronRight size={24} />
        </Button>
      </div>
    </div>
  );
}

export function ProductCarouselSection({
  title,
  description,
  products,
  isLoading,
  isSuccess,
  error,
  onRetry,
  edgeChevronControls,
}: {
  title: string;
  description: string;
  products: Product[];
  isLoading: boolean;
  isSuccess: boolean;
  error: unknown;
  onRetry: () => void;
  edgeChevronControls: boolean;
}) {
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const showEdgeChevronControls = edgeChevronControls && products.length > 0;

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
          <h2 className="text-xl font-bold">{title}</h2>
          {description ? <p className="mt-1 text-sm text-content-secondary">{description}</p> : null}
        </div>
        {!edgeChevronControls ? (
          <div className="hidden gap-2 sm:flex">
            <Button variant="secondary" size="icon" aria-label={`${title} 이전`} onClick={() => slide("prev")} className={CAROUSEL_PRODUCT_CHEVRON_CLASSNAME}>
              <ChevronLeft size={24} />
            </Button>
            <Button variant="secondary" size="icon" aria-label={`${title} 다음`} onClick={() => slide("next")} className={CAROUSEL_PRODUCT_CHEVRON_CLASSNAME}>
              <ChevronRight size={24} />
            </Button>
          </div>
        ) : null}
      </div>
      {isLoading ? (
        <LoadingState className="min-h-56" label={`${title} 상품을 불러오는 중입니다.`} />
      ) : error ? (
        <ApiErrorState error={error} onRetry={onRetry} />
      ) : (
        <div className={showEdgeChevronControls ? "relative" : undefined}>
          <div ref={carouselRef} className="no-scrollbar flex min-w-0 snap-x gap-3 overflow-x-auto scroll-smooth pb-1 md:gap-4">
            {products.map((product) => (
              <div key={`${product.id}-${title}`} className="w-[42vw] shrink-0 snap-start sm:w-48 md:w-52">
                <PopularSquareCard product={product} />
              </div>
            ))}
          </div>
          {showEdgeChevronControls ? (
            <div className="pointer-events-none absolute inset-y-0 left-0 hidden items-center px-2 sm:flex">
              <Button
                variant="ghost"
                size="icon"
                aria-label={`${title} 이전`}
                onClick={() => slide("prev")}
                className={`${CAROUSEL_EDGE_CHEVRON_CLASSNAME} pointer-events-auto`}
              >
                <ChevronLeft size={24} />
              </Button>
            </div>
          ) : null}
          {showEdgeChevronControls ? (
            <div className="pointer-events-none absolute inset-y-0 right-0 hidden items-center px-2 sm:flex">
              <Button
                variant="ghost"
                size="icon"
                aria-label={`${title} 다음`}
                onClick={() => slide("next")}
                className={`${CAROUSEL_EDGE_CHEVRON_CLASSNAME} pointer-events-auto -translate-x-2`}
              >
                <ChevronRight size={24} />
              </Button>
            </div>
          ) : null}
        </div>
      )}
      {isSuccess && products.length === 0 ? <p className="text-sm text-content-secondary">표시할 상품이 없습니다.</p> : null}
    </section>
  );
}
function PopularSquareCard({ product }: { product: Product }) {
  return (
    <Link href={`/products/${product.id}`} className="group relative block aspect-square overflow-hidden rounded-md bg-surface-subtle">
      <SafeImage
        src={product.image_url}
        alt={product.name}
        fill
        sizes="(max-width: 768px) 42vw, 208px"
        className="object-cover transition duration-300 group-hover:scale-[1.03]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3 text-content-inverse">
        <p className="flex items-center gap-1 text-xs font-medium text-content-inverse/90"><Store size={13} className="shrink-0" aria-hidden="true" /><span className="truncate">{product.market_name}</span></p>
        <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-5">{product.name}</h3>
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
