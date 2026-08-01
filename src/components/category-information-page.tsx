"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Clock3, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { CommerceCategory, Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { ProductCard } from "./product-card";
import { SafeImage } from "./safe-image";
import { Button } from "./ui/button";

const PAGE_SIZE = 8;

export function CategoryInformationPage() {
  const [selectedSlug, setSelectedSlug] = useState("outer");
  const [page, setPage] = useState(1);
  const informationQuery = useQuery({
    queryKey: ["category-information", selectedSlug, page, PAGE_SIZE],
    queryFn: () => api.getCategoryInformation({ category: selectedSlug, page, pageSize: PAGE_SIZE }),
    placeholderData: (previous) => previous,
  });

  const information = informationQuery.data;
  const roots = useMemo(
    () => [...(information?.categories ?? [])].sort(compareCategoryOrder),
    [information?.categories],
  );
  const selected = information?.selected_category;
  const selectedRoot = roots.find((category) => containsCategory(category, selected?.slug ?? selectedSlug)) ?? roots[0];
  const filters = selectedRoot ? [selectedRoot, ...flattenChildren(selectedRoot)] : [];
  const products = information?.products ?? [];
  const carousel = information?.realtime_popular_carousel;

  function selectCategory(slug: string) {
    setSelectedSlug(slug);
    setPage(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (informationQuery.isLoading && !information) {
    return <CategoryLoading />;
  }

  if (informationQuery.error || !information || !selected) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-md border border-red-200 bg-red-50 p-8 text-center">
          <h1 className="text-xl font-black text-red-900">카테고리관을 불러오지 못했습니다.</h1>
          <p className="mt-2 text-sm text-red-700">잠시 후 다시 시도해주세요.</p>
          <Button className="mt-5" variant="secondary" onClick={() => void informationQuery.refetch()}>다시 시도</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-black">카테고리관</h1>
          <p className="mt-1 text-sm text-muted">카테고리별 상품과 실시간 인기 상품을 확인하세요.</p>
        </div>
        <span className="text-sm font-bold text-muted">{information.bundle_label}</span>
      </div>

      {information.is_demo ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-900">
          서버의 CategoryInformation API가 아직 404를 반환해 화면 검수용 데모 데이터를 표시하고 있습니다.
        </div>
      ) : null}

      <nav className="no-scrollbar mt-6 flex gap-2 overflow-x-auto rounded-md border border-line bg-white p-3" aria-label="대분류">
        {roots.map((category) => (
          <button
            key={category.id}
            type="button"
            className={`shrink-0 rounded-md px-4 py-2 text-sm font-black transition ${selectedRoot?.id === category.id ? "bg-brand/10 text-brand ring-1 ring-brand/25" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"}`}
            onClick={() => selectCategory(category.slug)}
          >
            {category.name}
          </button>
        ))}
      </nav>

      <div className="mt-4 grid gap-6 rounded-md border border-line bg-white p-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside>
          <div className="rounded-md border border-line bg-zinc-50 p-3 lg:sticky lg:top-24">
            <p className="px-2 pb-2 text-xs font-black tracking-wider text-muted">세부 카테고리</p>
            <div className="flex gap-2 overflow-x-auto lg:grid">
              {filters.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={`flex shrink-0 items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left text-sm font-bold transition lg:w-full ${selected.slug === category.slug ? "bg-brand/10 text-brand ring-1 ring-brand/25" : "bg-white text-zinc-700 hover:bg-zinc-100"}`}
                  onClick={() => selectCategory(category.slug)}
                >
                  {category.name}
                  <ChevronRight size={15} className="opacity-60" />
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="min-w-0" aria-busy={informationQuery.isFetching}>
          <div className="flex items-end justify-between gap-4 border-b border-line pb-3">
            <div>
              <p className="text-xs font-black text-brand">PAGE {information.pagination.page}</p>
              <h2 className="mt-1 text-xl font-black">{selected.name} 상품</h2>
            </div>
            {informationQuery.isFetching ? <span className="text-xs font-bold text-muted">업데이트 중</span> : null}
          </div>

          {products.length ? (
            <>
              {carousel?.products.length ? <RealtimePopularCarousel carousel={carousel} /> : null}
              <ProductGrid products={products} />
            </>
          ) : (
            <div className="mt-5 rounded-md bg-zinc-100 p-12 text-center text-sm font-bold text-muted">이 카테고리에 등록된 상품이 없습니다.</div>
          )}

          <div className="mt-10 flex items-center justify-center gap-3" aria-label="상품 페이지네이션">
            <Button variant="secondary" disabled={page <= 1 || informationQuery.isFetching} onClick={() => setPage((value) => Math.max(1, value - 1))}>
              <ChevronLeft size={16} /> 이전
            </Button>
            <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-md border border-brand/30 bg-brand/10 px-3 text-sm font-black text-brand">{information.pagination.page}</span>
            <Button variant="secondary" disabled={!information.pagination.has_next || informationQuery.isFetching} onClick={() => setPage((value) => value + 1)}>
              다음 <ChevronRight size={16} />
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}

function ProductGrid({ products }: { products: Product[] }) {
  if (!products.length) return null;
  return <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-4">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>;
}

function RealtimePopularCarousel({ carousel }: { carousel: NonNullable<Awaited<ReturnType<typeof api.getCategoryInformation>>["realtime_popular_carousel"]> }) {
  const carouselRef = useRef<HTMLDivElement | null>(null);
  function slide(direction: "prev" | "next") {
    carouselRef.current?.scrollBy({
      left: direction === "prev" ? -640 : 640,
      behavior: "smooth",
    });
  }

  return (
    <section className="mt-4 border-b border-line pb-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-black text-brand"><Sparkles size={14} /> 실시간 인기</p>
          <h3 className="mt-1 text-base font-black">{carousel.title}</h3>
          <p className="mt-1 text-xs text-muted">{carousel.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="mr-1 hidden items-center gap-1 text-xs font-bold text-muted md:flex"><Clock3 size={13} /> {new Date(carousel.captured_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 기준</div>
          <Button variant="secondary" size="icon" aria-label="이전 인기 상품" onClick={() => slide("prev")}><ChevronLeft size={18} /></Button>
          <Button variant="secondary" size="icon" aria-label="다음 인기 상품" onClick={() => slide("next")}><ChevronRight size={18} /></Button>
        </div>
      </div>
      <div ref={carouselRef} className="no-scrollbar flex snap-x gap-3 overflow-x-auto scroll-smooth pb-1 md:gap-4">
        {carousel.products.map((product, index) => (
          <div key={product.id} className="w-[62vw] max-w-56 shrink-0 snap-start sm:w-52">
            <RankedPopularSquareCard product={product} rank={index + 1} />
          </div>
        ))}
      </div>
    </section>
  );
}

function RankedPopularSquareCard({ product, rank }: { product: Product; rank: number }) {
  const price = product.discount_price || product.base_price;
  const marketId = product.market?.id ?? product.market_id;
  const marketName = product.market?.name ?? product.market_name ?? `마켓 ${marketId}`;

  return (
    <article className="group relative aspect-square overflow-hidden rounded-md bg-zinc-100">
      <Link href={`/products/${product.id}`} className="absolute inset-0">
        <SafeImage src={product.image_url} alt={product.name} fill sizes="(max-width: 640px) 62vw, 208px" className="object-cover transition duration-300 group-hover:scale-[1.03]" />
      </Link>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/5" />
      <span className="absolute left-2 top-2 z-20 flex h-8 min-w-8 items-center justify-center rounded-md bg-white px-2 text-sm font-black text-brand shadow-sm">{rank}</span>
      <div className="absolute inset-x-0 bottom-0 z-20 p-3 text-white">
        <Link href={`/markets/${marketId}`} className="inline-flex max-w-full text-xs font-bold text-white/80 hover:text-white hover:underline">
          <span className="truncate">{marketName}</span>
        </Link>
        <Link href={`/products/${product.id}`} className="block">
          <h4 className="mt-1 line-clamp-2 text-sm font-black leading-5 hover:underline">{product.name}</h4>
        </Link>
        <div className="mt-1 flex items-baseline gap-1.5">
          <strong className="text-sm font-black">{formatPrice(price)}</strong>
          {price < product.base_price ? <span className="text-[11px] text-white/65 line-through">{formatPrice(product.base_price)}</span> : null}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {(product.tag_chips ?? []).slice(0, 2).map((chip) => (
            <span key={chip.code} className="rounded-sm bg-white/90 px-1.5 py-0.5 text-[10px] font-black text-zinc-700">{chip.label}</span>
          ))}
        </div>
      </div>
    </article>
  );
}

function flattenChildren(category: CommerceCategory): CommerceCategory[] {
  return [...(category.children ?? [])].sort(compareCategoryOrder).flatMap((child) => [child, ...flattenChildren(child)]);
}

function containsCategory(category: CommerceCategory, slug: string): boolean {
  return category.slug === slug || (category.children ?? []).some((child) => containsCategory(child, slug));
}

function compareCategoryOrder(a: CommerceCategory, b: CommerceCategory) {
  return a.sort_order - b.sort_order || a.id - b.id;
}

function CategoryLoading() {
  return <main className="mx-auto max-w-6xl animate-pulse px-4 py-8"><div className="h-16 rounded-md bg-zinc-200" /><div className="mt-6 h-11 w-2/3 rounded-md bg-zinc-200" /><div className="mt-7 grid grid-cols-2 gap-4 md:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index}><div className="aspect-square rounded-md bg-zinc-200" /><div className="mt-3 h-4 rounded bg-zinc-200" /></div>)}</div></main>;
}
