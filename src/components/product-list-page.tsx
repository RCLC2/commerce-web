"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { PLPInformation, PLPProductParams } from "@/lib/types";
import { ProductCard } from "./product-card";

function positivePage(raw: string | null) {
  const page = Number(raw);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function ProductListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get("category") ?? "";
  const shipping = searchParams.get("shipping") === "free" ? "free" : undefined;
  const onSale = searchParams.get("sale") === "on";
  const inStock = searchParams.get("stock") === "available";
  const tagChip = searchParams.get("tag_chip") ?? "";
  const price = searchParams.get("price") ?? "";
  const page = positivePage(searchParams.get("page"));

  const informationQuery = useQuery({
    queryKey: queryKeys.plpInformation,
    queryFn: api.getPLPInformation,
    staleTime: 5 * 60 * 1000,
  });
  const categories = flattenPLPCategories(informationQuery.data?.categories ?? []);
  const priceRanges = informationQuery.data?.price_ranges ?? [];
  const sortOptions = informationQuery.data?.sort_options ?? [];
  const requestedSort = searchParams.get("sort");
  const sort = (sortOptions.some((item) => item.code === requestedSort) ? requestedSort : informationQuery.data?.default_sort) as PLPProductParams["sort"];
  const selectedCategory = categories.find((item) => item.slug === category);
  const selectedPrice = priceRanges.find((item) => item.code === price) ?? priceRanges[0];
  const categoryIDs = selectedCategory?.category_ids?.length ? selectedCategory.category_ids : selectedCategory ? [selectedCategory.id] : undefined;
  const request: PLPProductParams = {
    categoryIDs,
    minPrice: selectedPrice?.min_price || undefined,
    maxPrice: selectedPrice?.max_price || undefined,
    shipping,
    onSale,
    inStock,
    tagChip: tagChip || undefined,
    sort,
    page,
  };
  const productsQuery = useQuery({
    queryKey: queryKeys.plpProducts(request),
    queryFn: () => api.listPLPProducts(request),
    enabled: informationQuery.isSuccess,
  });
  const productPage = productsQuery.data;

  function updateSearch(next: Record<string, string | undefined>, resetPage = true) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    if (resetPage) params.delete("page");
    router.replace(`/products${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false });
  }

  function clearFilters() {
    router.replace("/products");
  }

  const selectedTagChip = informationQuery.data?.tag_chips.find((item) => item.code === tagChip);
  const activeFilters = [
    selectedCategory ? `카테고리: ${selectedCategory.name}` : null,
    selectedPrice?.code ? selectedPrice.label : null,
    shipping ? "무료배송" : null,
    onSale ? "할인중" : null,
    inStock ? "재고 있음" : null,
    selectedTagChip ? `태그: ${selectedTagChip.label}` : null,
  ].filter((item): item is string => Boolean(item));

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-brand">Product Listing Page</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">{selectedCategory ? `${selectedCategory.name} 상품` : "전체 상품"}</h1>
          <p className="mt-2 text-sm font-semibold text-muted">
            서버가 필터링한 상품 <strong className="text-foreground">{(productPage?.total ?? informationQuery.data?.total_product_count ?? 0).toLocaleString("ko-KR")}개</strong>를 보여드립니다.
          </p>
        </div>

      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto border-y border-line py-3">
        <button type="button" className={`h-10 shrink-0 rounded-full px-5 text-sm font-black ${!selectedCategory ? "bg-foreground text-white" : "bg-white"}`} onClick={() => updateSearch({ category: undefined })}>전체</button>
        {categories.map((item) => (
          <button type="button" key={item.id} className={`h-10 shrink-0 rounded-full px-5 text-sm font-black ${selectedCategory?.id === item.id ? "bg-foreground text-white" : "bg-white"}`} onClick={() => updateSearch({ category: item.slug })}>
            {`— `.repeat(Math.max(0, item.depth - 1))}{item.name}
          </button>
        ))}
      </div>

      <section className="mt-4 rounded-md border border-line bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-black text-muted">가격대</span>
          {priceRanges.map((item) => (
            <QuickFilter
              key={item.code || "all"}
              active={price === item.code}
              label={item.label}
              onClick={() => updateSearch({ price: item.code || undefined })}
            />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <span className="mr-1 text-xs font-black text-muted">빠른 필터</span>
          <QuickFilter active={onSale} label="할인중" onClick={() => updateSearch({ sale: onSale ? undefined : "on" })} />
          <QuickFilter active={inStock} label="재고 있음" onClick={() => updateSearch({ stock: inStock ? undefined : "available" })} />
          {(informationQuery.data?.tag_chips ?? []).map((item) => (
            <QuickFilter
              key={item.code}
              active={tagChip === item.code}
              label={item.label}
              onClick={() => updateSearch({ tag_chip: tagChip === item.code ? undefined : item.code })}
            />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <span className="mr-1 text-xs font-black text-muted">정렬 방식</span>
          {sortOptions.map((item) => <QuickFilter key={item.code} active={sort === item.code} label={item.label} onClick={() => updateSearch({ sort: item.code })} />)}
        </div>
      </section>

      <div className="mt-4 flex min-h-8 flex-wrap items-center gap-2">
        {activeFilters.map((item) => <span key={item} className="inline-flex h-8 items-center rounded-full bg-zinc-100 px-3 text-xs font-bold text-zinc-700">{item}</span>)}
        {activeFilters.length ? <button type="button" className="inline-flex h-8 items-center gap-1 px-2 text-xs font-bold text-muted hover:text-foreground" onClick={clearFilters}><X size={14} /> 초기화</button> : null}
      </div>

      {informationQuery.error || productsQuery.error ? <p className="mt-8 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-bold text-brand">PLP 정보를 불러오지 못했습니다.</p> : null}
      {productsQuery.isLoading ? <p className="mt-8 text-sm text-muted">상품을 불러오는 중입니다.</p> : null}
      {!productsQuery.isLoading && productPage && !productPage.items.length ? (
        <div className="mt-8 rounded-md border border-line bg-white p-10 text-center"><p className="font-black">조건에 맞는 상품이 없습니다.</p><p className="mt-1 text-sm text-muted">필터를 조정해보세요.</p></div>
      ) : null}
      <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-4 md:gap-x-5">
        {(productPage?.items ?? []).map((product) => <ProductCard key={product.id} product={product} />)}
      </div>

      {productPage ? <Pagination page={productPage.page} totalPages={productPage.total_pages} onChange={(nextPage) => updateSearch({ page: String(nextPage) }, false)} /> : null}

    </main>
  );
}

function flattenPLPCategories(categories: PLPInformation["categories"]): PLPInformation["categories"] {
  return categories.flatMap((category) => [category, ...flattenPLPCategories(category.children ?? [])]);
}

function QuickFilter({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button type="button" className={`h-9 rounded-full border px-4 text-sm font-black ${active ? "border-brand bg-brand text-white" : "border-line bg-white text-zinc-700"}`} onClick={onClick}>{label}</button>;
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => Math.max(1, Math.min(totalPages - 4, page - 2)) + index).filter((value) => value <= totalPages);
  return (
    <nav aria-label="상품 페이지" className="mt-10 flex items-center justify-center gap-2">
      <button type="button" aria-label="이전 페이지" disabled={page <= 1} onClick={() => onChange(page - 1)} className="flex h-10 w-10 items-center justify-center rounded-md border border-line bg-white disabled:opacity-30"><ChevronLeft size={18} /></button>
      {pages.map((item) => <button type="button" key={item} aria-current={item === page ? "page" : undefined} onClick={() => onChange(item)} className={`h-10 min-w-10 rounded-md px-3 text-sm font-black ${item === page ? "bg-foreground text-white" : "border border-line bg-white"}`}>{item}</button>)}
      <button type="button" aria-label="다음 페이지" disabled={page >= totalPages} onClick={() => onChange(page + 1)} className="flex h-10 w-10 items-center justify-center rounded-md border border-line bg-white disabled:opacity-30"><ChevronRight size={18} /></button>
    </nav>
  );
}
