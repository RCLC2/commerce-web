"use client";

import { Button } from "@/components/ui/button";

import { PageHeading } from "./ui/page-heading";
import { Pagination } from "./ui/pagination";
import { FilterChip } from "./ui/filter-chip";

import { useQuery } from "@tanstack/react-query";
import { ChevronDown, PackageSearch, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { PLPInformation, PLPProductParams } from "@/lib/types";
import { ApiErrorState } from "./api-error-state";
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
          <PageHeading icon={<PackageSearch />} title={selectedCategory ? `${selectedCategory.name} 상품` : "전체 상품"} description={`조건에 맞는 상품 ${(productPage?.total ?? informationQuery.data?.total_product_count ?? 0).toLocaleString("ko-KR")}개를 확인하세요.`} />
        </div>

      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto border-y border-border-subtle py-2">
        <FilterChip selected={!selectedCategory} onClick={() => updateSearch({ category: undefined })}>전체</FilterChip>
        {categories.map((item) => <FilterChip key={item.id} selected={selectedCategory?.id === item.id} onClick={() => updateSearch({ category: item.slug })}>{`— `.repeat(Math.max(0, item.depth - 1))}{item.name}</FilterChip>)}
      </div>

      <details className="group/filters mt-3 rounded-control border border-border-subtle bg-surface-raised">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 rounded-control px-3 text-sm transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-primary [&::-webkit-details-marker]:hidden">
          <span className="flex flex-wrap items-center gap-x-2"><span className="font-bold">필터</span><span className="text-xs text-content-secondary">가격 · 배송 · 혜택</span></span>
          <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-content-secondary">상세 설정<ChevronDown size={16} className="transition-transform group-open/filters:rotate-180" aria-hidden="true" /></span>
        </summary>
        <div className="border-t border-border-subtle p-3 md:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-bold text-content-secondary">가격대</span>
            {priceRanges.map((item) => (
              <QuickFilter
                key={item.code || "all"}
                active={price === item.code}
                label={item.label}
                onClick={() => updateSearch({ price: item.code || undefined })}
              />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border-subtle pt-4">
            <span className="mr-1 text-xs font-bold text-content-secondary">배송 · 혜택</span>
            <QuickFilter active={onSale} label="할인중" onClick={() => updateSearch({ sale: onSale ? undefined : "on" })} />
            <QuickFilter active={freeShippingSelected} label="무료배송" onClick={toggleFreeShipping} />
            <QuickFilter active={inStock} label="재고 있음" onClick={() => updateSearch({ stock: inStock ? undefined : "available" })} />
            {(informationQuery.data?.tag_chips ?? []).filter((item) => item.code !== "FREE_SHIPPING").map((item) => (
              <QuickFilter
                key={item.code}
                active={tagChip === item.code}
                label={item.label}
                onClick={() => updateSearch({ tag_chip: tagChip === item.code ? undefined : item.code })}
              />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border-subtle pt-4">
            <span className="mr-1 text-xs font-bold text-content-secondary">정렬 방식</span>
            {sortOptions.map((item) => <QuickFilter key={item.code} active={sort === item.code} label={item.label} onClick={() => updateSearch({ sort: item.code })} />)}
          </div>
        </div>
      </details>

      <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="빠른 필터">
        {sortOptions.some((item) => item.code === "popular") ? <QuickFilter active={sort === "popular"} label="인기순" onClick={() => updateSearch({ sort: "popular" })} /> : null}
        <QuickFilter active={onSale} label="할인중" onClick={() => updateSearch({ sale: onSale ? undefined : "on" })} />
        <QuickFilter active={freeShippingSelected} label="무료배송" onClick={toggleFreeShipping} />
      </div>

      {activeFilters.length ? <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="적용한 필터">
        {activeFilters.map((item) => <span key={item} className="inline-flex h-8 items-center rounded-full bg-surface-subtle px-3 text-xs font-bold text-content-secondary">{item}</span>)}
        {activeFilters.length ? <Button variant="ghost" type="button" className="inline-flex h-8 items-center gap-1 px-2 text-xs font-bold text-content-secondary hover:text-content-primary" onClick={clearFilters}><X size={14} /> 초기화</Button> : null}
      </div> : null}

      {informationQuery.error || productsQuery.error ? (
        <ApiErrorState
          className="mt-8"
          error={informationQuery.error ?? productsQuery.error}
          onRetry={() => void (informationQuery.error ? informationQuery.refetch() : productsQuery.refetch())}
          retryLabel="상품 목록 다시 시도"
        />
      ) : null}
      {productsQuery.isLoading ? <p className="mt-8 text-sm text-content-secondary">상품을 불러오는 중입니다.</p> : null}
      {!productsQuery.isLoading && productPage && !productPage.items.length ? (
        <div className="mt-8 rounded-md border border-border-subtle bg-surface-raised p-10 text-center"><p className="font-bold">조건에 맞는 상품이 없습니다.</p><p className="mt-1 text-sm text-content-secondary">필터를 조정해보세요.</p></div>
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
