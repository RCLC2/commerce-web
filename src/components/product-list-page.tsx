"use client";

import { Button } from "@/components/ui/button";

import { PageHeading } from "./ui/page-heading";
import { Pagination } from "./ui/pagination";
import { FilterChip } from "./ui/filter-chip";

import { useQuery } from "@tanstack/react-query";
import { ChevronDown, PackageSearch, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { PLPInformation, PLPProductParams } from "@/lib/types";
import { ApiErrorState } from "./api-error-state";
import { ProductCard } from "./product-card";

function positivePage(raw: string | null) {
  const page = Number(raw);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

type ActiveFilter = {
  key: string;
  label: string;
  clear: Record<string, string | undefined>;
};

export function ProductListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [detailFiltersOpen, setDetailFiltersOpen] = useState(false);
  const category = searchParams.get("category") ?? "";
  const shipping = searchParams.get("shipping") === "free" ? "free" : undefined;
  const onSale = searchParams.get("sale") === "on";
  const inStock = searchParams.get("stock") === "available";
  const tagChip = searchParams.get("tag_chip") ?? "";
  const freeShippingSelected = Boolean(shipping) || tagChip === "FREE_SHIPPING";
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
  const productResultsLoading = informationQuery.isLoading || productsQuery.isPending || productsQuery.isFetching;
  const productCountLabel = productPage ? `${productPage.total.toLocaleString("ko-KR")}개` : productResultsLoading ? "조회 중" : "—";

  function updateSearch(next: Record<string, string | undefined>, resetPage = true) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    if (resetPage) params.delete("page");
    router.push(`/products${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false });
  }

  function clearFilters() {
    router.replace("/products");
  }

  function toggleFreeShipping() {
    updateSearch({
      shipping: freeShippingSelected ? undefined : "free",
      ...(tagChip === "FREE_SHIPPING" ? { tag_chip: undefined } : {}),
    });
  }

  const selectedTagChip = informationQuery.data?.tag_chips.find((item) => item.code === tagChip);
  const activeFilterCandidates: Array<ActiveFilter | null> = [
    selectedCategory ? { key: "category", label: `카테고리: ${selectedCategory.name}`, clear: { category: undefined } } : null,
    price && selectedPrice?.code ? { key: "price", label: selectedPrice.label, clear: { price: undefined } } : null,
    freeShippingSelected ? { key: "shipping", label: "무료배송", clear: { shipping: undefined, ...(tagChip === "FREE_SHIPPING" ? { tag_chip: undefined } : {}) } } : null,
    onSale ? { key: "sale", label: "할인중", clear: { sale: undefined } } : null,
    inStock ? { key: "stock", label: "재고 있음", clear: { stock: undefined } } : null,
    selectedTagChip && tagChip !== "FREE_SHIPPING" ? { key: "tag_chip", label: `상품 특징: ${selectedTagChip.label}`, clear: { tag_chip: undefined } } : null,
  ];
  const activeFilters = activeFilterCandidates.filter((item): item is ActiveFilter => item !== null);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 md:pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <PageHeading icon={<PackageSearch />} title={selectedCategory ? `${selectedCategory.name} 상품` : "전체 상품"} />
        </div>

      </div>

      <div className="mt-4 flex gap-1 overflow-x-auto border-y border-border-subtle py-2" role="group" aria-label="상품 카테고리">
        <FilterChip variant="navigation" selected={!selectedCategory} onClick={() => updateSearch({ category: undefined })}>전체</FilterChip>
        {categories.map((item) => <FilterChip variant="navigation" key={item.id} selected={selectedCategory?.id === item.id} onClick={() => updateSearch({ category: item.slug })}>{`— `.repeat(Math.max(0, item.depth - 1))}{item.name}</FilterChip>)}
      </div>

      <section className="mt-5 border-y border-border-subtle py-3" aria-labelledby="product-filter-heading">
        <div className="flex flex-wrap items-center gap-2">
          <span id="product-filter-heading" className="mr-1 text-sm font-bold">필터</span>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="빠른 필터">
            <QuickFilter active={onSale} label="할인중" onClick={() => updateSearch({ sale: onSale ? undefined : "on" })} />
            <QuickFilter active={freeShippingSelected} label="무료배송" onClick={toggleFreeShipping} />
            <QuickFilter active={inStock} label="재고 있음" onClick={() => updateSearch({ stock: inStock ? undefined : "available" })} />
          </div>
          <button
            type="button"
            aria-expanded={detailFiltersOpen}
            aria-controls="product-detail-filters"
            className="ml-auto flex min-h-11 items-center gap-1 rounded-control px-2 text-xs font-bold text-content-secondary transition-colors hover:bg-surface-subtle hover:text-content-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-primary sm:min-h-9"
            onClick={() => setDetailFiltersOpen((open) => !open)}
          >
            상세 필터
            <ChevronDown size={16} className={`transition-transform ${detailFiltersOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
        </div>
        {detailFiltersOpen ? (
          <div id="product-detail-filters" className="mt-3 border-t border-border-subtle pt-4">
            <FilterRow label="가격대">
              {priceRanges.map((item) => (
                <QuickFilter
                  key={item.code || "all"}
                  active={price === item.code}
                  label={item.label}
                  onClick={() => updateSearch({ price: item.code || undefined })}
                />
              ))}
            </FilterRow>
            <FilterRow label="상품 특징" divided>
              {(informationQuery.data?.tag_chips ?? []).filter((item) => item.code !== "FREE_SHIPPING").map((item) => (
                <QuickFilter
                  key={item.code}
                  active={tagChip === item.code}
                  label={item.label}
                  onClick={() => updateSearch({ tag_chip: tagChip === item.code ? undefined : item.code })}
                />
              ))}
            </FilterRow>
          </div>
        ) : null}
      </section>

      {activeFilters.length ? <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="적용한 필터">
        {activeFilters.map((item) => (
          <button key={item.key} type="button" className="inline-flex min-h-11 items-center gap-1 rounded-full bg-surface-subtle px-3 text-xs font-bold text-content-secondary transition-colors hover:bg-action-secondary hover:text-content-primary sm:h-8 sm:min-h-0" onClick={() => updateSearch(item.clear)} aria-label={`${item.label} 필터 해제`}>
            {item.label}<X size={13} aria-hidden="true" />
          </button>
        ))}
        <Button variant="ghost" type="button" className="inline-flex min-h-11 items-center gap-1 px-2 text-xs font-bold text-content-secondary hover:text-content-primary sm:h-8 sm:min-h-0" onClick={clearFilters}><X size={14} /> 초기화</Button>
      </div> : null}

      <div className="mt-5 flex items-center justify-between gap-4 border-t border-border-subtle pt-4">
        <p className="text-sm font-bold">전체 {productCountLabel}</p>
        <label className="relative shrink-0">
          <span className="sr-only">상품 정렬</span>
          <select
            aria-label="상품 정렬"
            className="h-11 appearance-none rounded-control border border-border-interactive bg-surface-raised pl-3 pr-9 text-sm font-bold outline-none transition-colors hover:border-action-primary focus:border-action-primary focus:ring-4 focus:ring-action-primary/10 sm:h-10"
            value={sort ?? ""}
            onChange={(event) => updateSearch({ sort: event.target.value })}
            disabled={!sortOptions.length}
          >
            {sortOptions.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-content-secondary" aria-hidden="true" />
        </label>
      </div>

      {informationQuery.error || productsQuery.error ? (
        <ApiErrorState
          className="mt-8"
          error={informationQuery.error ?? productsQuery.error}
          onRetry={() => void (informationQuery.error ? informationQuery.refetch() : productsQuery.refetch())}
          retryLabel="상품 목록 다시 시도"
        />
      ) : null}
      {productResultsLoading && !informationQuery.error && !productsQuery.error ? <p className="mt-8 text-sm text-content-secondary" role="status">상품을 불러오는 중입니다.</p> : null}
      {!productResultsLoading && productsQuery.isSuccess && productPage && !productPage.items.length ? (
        <div className="mt-8 rounded-surface border border-border-subtle bg-surface-raised p-10 text-center shadow-card"><p className="font-bold">조건에 맞는 상품이 없습니다.</p><p className="mt-1 text-sm text-content-secondary">필터를 조정해보세요.</p></div>
      ) : null}
      <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-4 md:gap-x-5">
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
  return <FilterChip selected={active} onClick={onClick}>{label}</FilterChip>;
}

function FilterRow({ label, children, divided = false }: { label: string; children: React.ReactNode; divided?: boolean }) {
  return (
    <div className={`grid gap-2 md:grid-cols-[5rem_minmax(0,1fr)] md:items-start ${divided ? "mt-4 border-t border-border-subtle pt-4" : ""}`}>
      <span className="pt-2 text-xs font-bold text-content-secondary">{label}</span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
