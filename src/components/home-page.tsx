"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Backpack,
  ChevronLeft,
  ChevronRight,
  Gem,
  Shirt,
  ShoppingBag,
  Sparkles,
  Star,
  Watch,
  Footprints,
} from "lucide-react";
import Link from "next/link";
import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { getEffectiveToken } from "@/lib/auth-token";
import { queryKeys } from "@/lib/query-keys";
import type { CommerceCategory, Product } from "@/lib/types";
import { useSessionStore } from "@/lib/session-store";
import { formatPrice } from "@/lib/utils";
import { ProductCard } from "./product-card";
import { SafeImage } from "./safe-image";
import { Button } from "./ui/button";

const categoryIcons = {
  tops: Shirt,
  pants: Watch,
  dress: Sparkles,
  outer: ShoppingBag,
  bags: Backpack,
  skirts: Sparkles,
  today: Footprints,
  "free-shipping": Gem,
};

function categoryIcon(category: CommerceCategory) {
  return categoryIcons[category.slug as keyof typeof categoryIcons] ?? Star;
}

export function HomePage() {
  const token = useSessionStore((state) => state.accessToken);
  const [eventIndex, setEventIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(8);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const popularCarouselRef = useRef<HTMLDivElement | null>(null);
  const promotionCarouselRef = useRef<HTMLDivElement | null>(null);
  const effectiveToken = getEffectiveToken(token);
  const { data: events = [] } = useQuery({
    queryKey: queryKeys.events,
    queryFn: api.listEvents,
  });
  const { data: categories = [] } = useQuery({
    queryKey: queryKeys.categories,
    queryFn: api.listCategories,
  });
  const { data: popularProducts = [], isLoading: isPopularLoading } = useQuery({
    queryKey: queryKeys.products({ sort: "popular" }),
    queryFn: api.listPopularProducts,
  });
  const { data: promotionProducts = [], isLoading: isPromotionLoading } = useQuery({
    queryKey: queryKeys.products({ sort: "promotion" }),
    queryFn: api.listPromotionProducts,
  });
  const { data: recommendationProducts = [], isLoading: isRecommendationLoading } = useQuery({
    queryKey: queryKeys.personalizedProducts({ sort: "new" }),
    queryFn: api.listRecommendedProducts,
  });
  const { data: profile } = useQuery({
    queryKey: queryKeys.homeMe(effectiveToken),
    queryFn: () => api.me(effectiveToken ?? ""),
    enabled: Boolean(effectiveToken),
  });
  const recommendationTitle = `${profile?.user_name ?? "사용자"}님을 위한 추천 상품`;
  const rootCategories = categories.filter((category) => !category.parent_id && category.level === 1);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) {
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setVisibleCount((count) => Math.min(count + 8, recommendationProducts.length));
      }
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [recommendationProducts.length]);

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

  function slideCarousel(ref: RefObject<HTMLDivElement | null>, direction: "prev" | "next") {
    ref.current?.scrollBy({
      left: direction === "prev" ? -640 : 640,
      behavior: "smooth",
    });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24">
      <section className="py-5">
        {events.length ? (
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
        ) : (
          <div className="h-64 animate-pulse rounded-md bg-zinc-200" />
        )}
      </section>

      <section className="rounded-md border border-line bg-white p-3">
        <div className="grid grid-cols-5 gap-1 md:grid-cols-10">
          {rootCategories.map((category) => {
            const Icon = categoryIcon(category);
            return (
              <Link key={category.href} href={category.href} className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-md p-1 hover:bg-zinc-50">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-brand">
                  <Icon size={19} />
                </span>
                <span className="text-xs font-bold">{category.name}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <ProductCarouselSection
        title="인기 상품"
        description="지금 많이 찾는 상품 20개"
        products={popularProducts}
        isLoading={isPopularLoading}
        carouselRef={popularCarouselRef}
        onPrev={() => slideCarousel(popularCarouselRef, "prev")}
        onNext={() => slideCarousel(popularCarouselRef, "next")}
      />

      <ProductCarouselSection
        title="프로모션 상품"
        description="혜택과 함께 둘러보는 추천 프로모션"
        products={promotionProducts}
        isLoading={isPromotionLoading}
        carouselRef={promotionCarouselRef}
        onPrev={() => slideCarousel(promotionCarouselRef, "prev")}
        onNext={() => slideCarousel(promotionCarouselRef, "next")}
      />

      <section className="py-7">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-black">{recommendationTitle}</h2>
          </div>
        </div>
        {isRecommendationLoading ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-4 md:gap-x-5">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="aspect-[3/4] animate-pulse rounded-md bg-zinc-200" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-4 md:gap-x-5">
            {recommendationProducts.slice(0, visibleCount).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
        <div ref={loadMoreRef} className="h-8" />
        {visibleCount < recommendationProducts.length ? (
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
  carouselRef,
  onPrev,
  onNext,
}: {
  title: string;
  description: string;
  products: Product[];
  isLoading: boolean;
  carouselRef: RefObject<HTMLDivElement | null>;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <section className="py-7">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">{title}</h2>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="icon" aria-label={`${title} 이전`} onClick={onPrev}>
            <ChevronLeft size={18} />
          </Button>
          <Button variant="secondary" size="icon" aria-label={`${title} 다음`} onClick={onNext}>
            <ChevronRight size={18} />
          </Button>
        </div>
      </div>
      {isLoading ? (
        <div className="flex gap-3 overflow-hidden md:gap-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-64 w-[42vw] shrink-0 animate-pulse rounded-md bg-zinc-200 sm:w-48 md:w-52" />
          ))}
        </div>
      ) : (
        <div ref={carouselRef} className="no-scrollbar flex snap-x gap-3 overflow-x-auto scroll-smooth pb-1 md:gap-4">
          {products.map((product) => (
            <div key={`${product.id}-${title}`} className="w-[42vw] shrink-0 snap-start sm:w-48 md:w-52">
              <PopularSquareCard product={product} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function PopularSquareCard({ product }: { product: Product }) {
  const price = product.discount_price || product.base_price;

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
        <p className="mt-1 text-sm font-black">{formatPrice(price)}</p>
      </div>
    </Link>
  );
}
