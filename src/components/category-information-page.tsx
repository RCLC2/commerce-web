"use client";

import { PageHeading } from "./ui/page-heading";
import { Grid2X2 as PageIcon } from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Clock3, Store } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Pagination } from "./ui/pagination";
import { FilterChip } from "./ui/filter-chip";
import { api } from "@/lib/api";
import type { CommerceCategory, Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { ProductCard } from "./product-card";
import { SafeImage } from "./safe-image";
import { Button } from "./ui/button";

const PAGE_SIZE = 8;

export function CategoryInformationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedSlug = searchParams.get("category");
  const requestedPage = Number(searchParams.get("page"));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  function changePage(next: number, slug = selectedSlug) {
    const params = new URLSearchParams();
    if (slug) params.set("category", slug);
    if (next > 1) params.set("page", String(next));
    router.push(`/categories${params.size ? `?${params}` : ""}`, { scroll: false });
  }
  const informationQuery = useQuery({
    queryKey: ["category-information", selectedSlug ?? "server-default", page, PAGE_SIZE],
    queryFn: () => api.getCategoryInformation({ category: selectedSlug ?? undefined, page, pageSize: PAGE_SIZE }),
    placeholderData: (previous) => previous,
  });

  const information = informationQuery.data;
  const roots = useMemo(
    () => [...(information?.categories ?? [])].sort(compareCategoryOrder),
    [information?.categories],
  );
  const selected = information?.selected_category;
  const selectedRoot = roots.find((category) => containsCategory(category, selected?.slug ?? selectedSlug ?? "")) ?? roots[0];
  const filters = selectedRoot ? [selectedRoot, ...flattenChildren(selectedRoot)] : [];
  const products = information?.products ?? [];
  const carousel = information?.realtime_popular_carousel;

  function selectCategory(slug: string) {
    changePage(1, slug);
  }

  if (informationQuery.isLoading && !information) {
    return <CategoryLoading />;
  }

  if (informationQuery.error || !information || !selected) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-md border border-status-negative-border bg-status-negative-subtle p-8 text-center">
          <h1 className="text-xl font-bold text-status-negative">카테고리관을 불러오지 못했습니다.</h1>
          <p className="mt-2 text-sm text-status-negative">잠시 후 다시 시도해주세요.</p>
          <Button className="mt-5" variant="secondary" onClick={() => void informationQuery.refetch()}>다시 시도</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <PageHeading icon={<PageIcon />} title="카테고리관" description="카테고리별 상품과 실시간 인기 상품을 확인하세요." />
        </div>
      </div>

      <nav className="no-scrollbar mt-4 flex gap-2 overflow-x-auto" aria-label="대분류">
        {roots.map((category) => (
          <FilterChip
            selected={selectedRoot?.id === category.id}
            key={category.id}
            type="button"
            className="rounded-control"
            onClick={() => selectCategory(category.slug)}
          >
            {category.name}
          </FilterChip>
        ))}
      </nav>

      <div className={`mt-5 grid gap-4 ${filters.length > 1 ? "lg:grid-cols-[200px_minmax(0,1fr)]" : ""}`}>
        {filters.length > 1 ? <aside>
          <div className="lg:sticky lg:top-24">
            <p className="pb-2 text-xs font-bold text-content-secondary">세부 카테고리</p>
            <div className="flex gap-2 overflow-x-auto lg:grid">
              {filters.map((category) => (
                <FilterChip
                  selected={selected.slug === category.slug}
                  key={category.id}
                  type="button"
                  className="justify-start rounded-control text-left lg:w-full"
                  onClick={() => selectCategory(category.slug)}
                >
                  {category.name}
                  <ChevronRight size={15} className="opacity-60" />
                </FilterChip>
              ))}
            </div>
          </div>
        </aside> : null}

        <section className="min-w-0" aria-busy={informationQuery.isFetching}>
          <div className="flex items-end justify-between gap-4 border-b border-border-subtle pb-3">
            <div>
              <h2 className="text-lg font-bold">{selected.name} 상품</h2>
            </div>
            {informationQuery.isFetching ? <span className="text-xs font-bold text-content-secondary">업데이트 중</span> : null}
          </div>

          {products.length ? (
            <>
              {carousel?.products.length ? <RealtimePopularCarousel carousel={carousel} /> : null}
              <ProductGrid products={products} />
            </>
          ) : (
            <div className="mt-5 rounded-md bg-surface-subtle p-12 text-center text-sm font-bold text-content-secondary">이 카테고리에 등록된 상품이 없습니다.</div>
          )}

          <Pagination page={information.pagination.page} totalPages={information.pagination.total_pages} hasNext={information.pagination.has_next} disabled={informationQuery.isFetching} onChange={changePage} />
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
    <section className="mt-4 border-b border-border-subtle pb-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="text-base font-bold">실시간 인기</h3>
        <div className="flex items-center gap-2">
          <div className="mr-1 hidden items-center gap-1 text-xs font-bold text-content-secondary md:flex"><Clock3 size={13} /> {new Date(carousel.captured_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 기준</div>
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
    <article className="group relative aspect-square overflow-hidden rounded-md bg-surface-subtle">
      <Link href={`/products/${product.id}`} className="absolute inset-0">
        <SafeImage src={product.image_url} alt={product.name} fill sizes="(max-width: 640px) 62vw, 208px" className="object-cover transition duration-300 group-hover:scale-[1.03]" />
      </Link>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/5" />
      <span className="absolute left-2 top-2 z-20 flex h-8 min-w-8 items-center justify-center rounded-md bg-surface-raised px-2 text-sm font-bold text-action-primary shadow-sm">{rank}</span>
      <div className="absolute inset-x-0 bottom-0 z-20 p-3 text-content-inverse">
        <Link href={`/markets/${marketId}`} className="inline-flex max-w-full items-center gap-1 text-xs font-medium text-content-inverse/90 hover:text-content-inverse hover:underline">
          <Store size={13} className="shrink-0" aria-hidden="true" /><span className="truncate">{marketName}</span>
        </Link>
        <Link href={`/products/${product.id}`} className="block">
          <h4 className="mt-1 line-clamp-2 text-sm font-bold leading-5 hover:underline">{product.name}</h4>
        </Link>
        <div className="mt-1 flex items-baseline gap-1.5">
          <strong className="text-sm font-bold">{formatPrice(price)}</strong>
          {price < product.base_price ? <span className="text-xs text-content-inverse/65 line-through">{formatPrice(product.base_price)}</span> : null}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {(product.tag_chips ?? []).slice(0, 2).map((chip) => (
            <span key={chip.code} className="rounded-sm bg-surface-raised/90 px-1.5 py-0.5 text-xs font-bold text-content-secondary">{chip.label}</span>
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
  return <main className="mx-auto max-w-6xl animate-pulse px-4 py-8"><div className="h-16 rounded-md bg-border-subtle" /><div className="mt-6 h-11 w-2/3 rounded-md bg-border-subtle" /><div className="mt-7 grid grid-cols-2 gap-4 md:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index}><div className="aspect-square rounded-md bg-border-subtle" /><div className="mt-3 h-4 rounded bg-border-subtle" /></div>)}</div></main>;
}
