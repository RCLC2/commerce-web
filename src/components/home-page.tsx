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
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { getEffectiveToken } from "@/lib/auth-token";
import { queryKeys } from "@/lib/query-keys";
import type { CMSCarousel, CommerceCategory, CommerceEvent, Product } from "@/lib/types";
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
  const [heroIndex, setHeroIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(8);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const popularCarouselRef = useRef<HTMLDivElement | null>(null);
  const effectiveToken = getEffectiveToken(token);
  const { data: activeCarousels = [] } = useQuery({
    queryKey: queryKeys.activeCarousels,
    queryFn: api.activeCarousels,
  });
  const { data: events = [] } = useQuery({
    queryKey: queryKeys.events,
    queryFn: api.listEvents,
  });
  const { data: categories = [] } = useQuery({
    queryKey: queryKeys.categories,
    queryFn: api.listCategories,
  });
  const { data: products = [], isLoading } = useQuery({
    queryKey: queryKeys.personalizedProducts,
    queryFn: () => api.listProducts({ sort: "popular" }),
  });
  const { data: profile } = useQuery({
    queryKey: queryKeys.homeMe(effectiveToken),
    queryFn: () => api.me(effectiveToken ?? ""),
    enabled: Boolean(effectiveToken),
  });
  const recommendationProducts = useMemo(() => {
    if (!products.length) {
      return [];
    }
    return Array.from({ length: 5 }).flatMap(() => products);
  }, [products]);
  const popularProducts = useMemo(() => {
    if (!products.length) {
      return [];
    }
    return Array.from({ length: 20 }, (_, index) => products[index % products.length]);
  }, [products]);
  const recommendationTitle = `${profile?.user_name ?? "사용자"}님을 위한 추천 상품`;
  const heroItems = activeCarousels.length ? activeCarousels : events;
  const usingCMSCarousels = activeCarousels.length > 0;
  const safeHeroIndex = heroItems.length ? Math.min(heroIndex, heroItems.length - 1) : 0;

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

  function moveHero(direction: "prev" | "next") {
    if (!heroItems.length) {
      return;
    }
    setHeroIndex((current) => {
      const lastIndex = heroItems.length - 1;
      const currentIndex = Math.min(current, lastIndex);
      if (direction === "prev") {
        return currentIndex === 0 ? lastIndex : currentIndex - 1;
      }
      return currentIndex === lastIndex ? 0 : currentIndex + 1;
    });
  }

  function slidePopularProducts(direction: "prev" | "next") {
    popularCarouselRef.current?.scrollBy({
      left: direction === "prev" ? -640 : 640,
      behavior: "smooth",
    });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24">
      <section className="py-5">
        {heroItems.length ? (
          <div className="relative overflow-hidden rounded-md border border-line bg-white">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${safeHeroIndex * 100}%)` }}
            >
              {heroItems.map((item, index) => (
                <Link key={`${usingCMSCarousels ? "cms" : "event"}-${item.id}`} href={heroHref(item, usingCMSCarousels)} className="block min-w-full">
                  <div className="relative h-64 bg-zinc-100 md:h-[380px]">
                    <SafeImage src={item.image_url} alt={item.title} fill sizes="100vw" className="object-cover" priority={index === 0} />
                    <div className="absolute inset-0 bg-black/30" />
                    <div className="absolute bottom-0 left-0 max-w-lg p-5 text-white md:p-8">
                      <p className="text-sm font-bold">{usingCMSCarousels ? heroTargetLabel(item as CMSCarousel) : "진행중인 이벤트"}</p>
                      <h1 className="mt-2 text-3xl font-black md:text-5xl">{item.title}</h1>
                      <p className="mt-2 text-sm text-white/90">{usingCMSCarousels ? "지금 노출 중인 CMS 캐러셀" : (item as CommerceEvent).subtitle}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="absolute right-4 top-4 rounded-full bg-black/55 px-3 py-1 text-xs font-bold text-white">
              {safeHeroIndex + 1}/{heroItems.length}
            </div>
            <div className="absolute inset-y-0 left-0 flex items-center px-2">
              <Button variant="secondary" size="icon" aria-label="이전 캐러셀" onClick={() => moveHero("prev")}>
                <ChevronLeft size={18} />
              </Button>
            </div>
            <div className="absolute inset-y-0 right-0 flex items-center px-2">
              <Button variant="secondary" size="icon" aria-label="다음 캐러셀" onClick={() => moveHero("next")}>
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
          {categories.map((category) => {
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

      <section className="py-7">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">인기 상품</h2>
            <p className="mt-1 text-sm text-muted">지금 많이 찾는 상품 20개</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="icon" aria-label="인기 상품 이전" onClick={() => slidePopularProducts("prev")}>
              <ChevronLeft size={18} />
            </Button>
            <Button variant="secondary" size="icon" aria-label="인기 상품 다음" onClick={() => slidePopularProducts("next")}>
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
          <div
            ref={popularCarouselRef}
            className="flex snap-x gap-3 overflow-x-auto scroll-smooth pb-2 md:gap-4"
          >
            {popularProducts.map((product, index) => (
              <div key={`${product.id}-popular-${index}`} className="w-[42vw] shrink-0 snap-start sm:w-48 md:w-52">
                <PopularSquareCard product={product} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="py-7">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-black">{recommendationTitle}</h2>
          </div>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-4 md:gap-x-5">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="aspect-[3/4] animate-pulse rounded-md bg-zinc-200" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-4 md:gap-x-5">
            {recommendationProducts.slice(0, visibleCount).map((product, index) => (
              <ProductCard key={`${product.id}-${index}`} product={product} />
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

function heroHref(item: CMSCarousel | CommerceEvent, isCMSCarousel: boolean) {
  if (!isCMSCarousel) {
    return `/events/${item.id}`;
  }
  const carousel = item as CMSCarousel;
  if (carousel.target_id <= 0) {
    return "/";
  }
  if (carousel.target_type === "MARKET") {
    return `/markets/${carousel.target_id}`;
  }
  if (carousel.target_type === "PRODUCT") {
    return `/products/${carousel.target_id}`;
  }
  return "/";
}

function heroTargetLabel(carousel: CMSCarousel) {
  if (carousel.target_type === "MARKET") {
    return `마켓 #${carousel.target_id}`;
  }
  if (carousel.target_type === "PRODUCT") {
    return `상품 #${carousel.target_id}`;
  }
  return "알 수 없는 대상";
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
