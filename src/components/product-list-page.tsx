"use client";

import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { ProductCard } from "./product-card";
import { Button } from "./ui/button";

const sorts = [
  { label: "인기순", value: "popularity" },
  { label: "신상품", value: "created_desc" },
  { label: "낮은 가격", value: "price_asc" },
  { label: "높은 가격", value: "price_desc" },
];

const categories = [
  { label: "전체", value: "", ids: [] },
  { label: "상의", value: "tops", ids: [11, 13] },
  { label: "팬츠", value: "pants", ids: [12] },
  { label: "원피스", value: "dress", ids: [15] },
  { label: "아우터", value: "outer", ids: [16] },
  { label: "가방", value: "bags", ids: [14] },
  { label: "스커트", value: "skirts", ids: [17] },
];

const priceRanges = [
  { label: "전체 가격", value: "", min: 0, max: Infinity },
  { label: "3만원 이하", value: "under-30000", min: 0, max: 30_000 },
  { label: "3-5만원", value: "30000-50000", min: 30_000, max: 50_000 },
  { label: "5만원 이상", value: "over-50000", min: 50_000, max: Infinity },
];

const pageLimit = 20;

function productPrice(product: Product) {
  return product.display_price ?? (product.discount_price || product.base_price);
}

export function ProductListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const sort = normalizeSort(searchParams.get("sort"));
  const category = searchParams.get("category") ?? "";
  const market = searchParams.get("market") ?? "";
  const price = searchParams.get("price") ?? "";
  const offset = Math.max(0, Number(searchParams.get("offset") ?? 0) || 0);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const selectedCategory = categories.find((item) => item.value === category) ?? categories[0];
  const selectedPrice = priceRanges.find((item) => item.value === price) ?? priceRanges[0];
  const selectedMarketID = Number(market) || undefined;
  const { data: markets = [] } = useQuery({
    queryKey: ["markets"],
    queryFn: () => api.listMarkets(),
  });
  const { data, isLoading, error } = useQuery({
    queryKey: ["products", "catalog", q, sort, selectedCategory.value, selectedPrice.value, selectedMarketID, offset],
    queryFn: () =>
      api.listProductPage({
        q: q || undefined,
        sort,
        categoryID: selectedCategory.ids[0],
        marketID: selectedMarketID,
        minPrice: selectedPrice.min,
        maxPrice: Number.isFinite(selectedPrice.max) ? selectedPrice.max : undefined,
        status: "SELLING",
        limit: pageLimit,
        offset,
      }),
  });
  const marketNameByID = useMemo(() => new Map(markets.map((item) => [item.id, item.name])), [markets]);
  const products = useMemo(
    () => (data?.items ?? []).map((product) => ({ ...product, market_name: product.market_name ?? marketNameByID.get(product.market_id) })),
    [data?.items, marketNameByID],
  );
  const selectedMarket = selectedMarketID ? markets.find((item) => item.id === selectedMarketID) : undefined;
  const pagination = data?.pagination ?? { limit: pageLimit, offset, count: 0, hasMore: false };

  function updateSearch(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    params.delete("offset");
    router.replace(`/products${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function updateOffset(nextOffset: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextOffset > 0) {
      params.set("offset", String(nextOffset));
    } else {
      params.delete("offset");
    }
    router.replace(`/products${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function clearFilters() {
    router.replace("/products?sort=popularity");
  }

  const activeFilters = [
    selectedCategory.value ? `카테고리: ${selectedCategory.label}` : null,
    q ? `검색: ${q}` : null,
    selectedMarket ? `마켓: ${selectedMarket.name}` : null,
    selectedPrice.value ? selectedPrice.label : null,
  ].filter(Boolean);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-black">{selectedCategory.value ? `${selectedCategory.label} 상품` : "상품"}</h1>
          <p className="mt-1 text-sm text-muted">
            {pagination.count.toLocaleString("ko-KR")}개 상품을 필터 조건에 맞춰 보여드립니다.
          </p>
        </div>
        <form
          className="flex h-11 items-center gap-2 rounded-md border border-line bg-white px-3 md:w-80"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            updateSearch({ q: String(formData.get("q") ?? "").trim() || undefined });
          }}
        >
          <Search size={18} className="text-muted" />
          <input
            key={q}
            name="q"
            defaultValue={q}
            className="w-full outline-none"
            placeholder="상품명, 태그, 마켓 검색"
            aria-label="상품 검색"
          />
        </form>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto border-b border-line pb-4">
        {categories.map((item) => (
          <button
            key={item.value || "all"}
            className={`h-10 shrink-0 rounded-md px-4 text-sm font-bold ${
              selectedCategory.value === item.value ? "bg-foreground text-white" : "bg-white"
            }`}
            onClick={() => updateSearch({ category: item.value || undefined })}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {sorts.map((item) => (
          <button
            key={item.value}
            className={`h-9 rounded-md px-3 text-sm font-bold ${sort === item.value ? "bg-brand text-white" : "bg-white"}`}
            onClick={() => updateSearch({ sort: item.value })}
          >
            {item.label}
          </button>
        ))}
        <Button variant="secondary" size="sm" className="ml-auto" onClick={() => setFiltersOpen((value) => !value)}>
          <SlidersHorizontal size={16} />
          필터
        </Button>
      </div>

      {filtersOpen ? (
        <section className="mt-4 grid gap-4 rounded-md border border-line bg-white p-4 md:grid-cols-4">
          <label className="block">
            <span className="text-xs font-black text-muted">마켓</span>
            <select className="mt-2 h-10 w-full rounded-md border border-line px-3 text-sm outline-none" value={market} onChange={(event) => updateSearch({ market: event.target.value || undefined })}>
              <option value="">전체 마켓</option>
              {markets.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-black text-muted">가격대</span>
            <select className="mt-2 h-10 w-full rounded-md border border-line px-3 text-sm outline-none" value={price} onChange={(event) => updateSearch({ price: event.target.value || undefined })}>
              {priceRanges.map((item) => (
                <option key={item.value || "all"} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
          <div>
            <span className="text-xs font-black text-muted">공개 상태</span>
            <div className="mt-2 inline-flex h-10 items-center rounded-md bg-emerald-50 px-3 text-sm font-black text-emerald-700">
              판매중
            </div>
          </div>
        </section>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {activeFilters.map((item) => (
          <span key={item} className="inline-flex h-8 items-center gap-1 rounded-md bg-zinc-100 px-3 text-xs font-bold text-zinc-700">
            {item}
          </span>
        ))}
        {activeFilters.length ? (
          <button className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-bold text-muted hover:text-foreground" onClick={clearFilters}>
            <X size={14} />
            초기화
          </button>
        ) : null}
      </div>

      {error ? <p className="mt-8 rounded-md border border-line bg-white p-4 text-sm text-brand">{error.message}</p> : null}
      {isLoading ? <p className="mt-8 text-sm text-muted">상품을 불러오는 중입니다.</p> : null}
      {!isLoading && !products.length ? (
        <div className="mt-8 rounded-md border border-line bg-white p-8 text-center">
          <p className="font-bold">조건에 맞는 상품이 없습니다.</p>
          <p className="mt-1 text-sm text-muted">카테고리나 필터를 조정해보세요.</p>
        </div>
      ) : null}
      <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-4 md:gap-x-5">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      {products.length ? (
        <p className="mt-8 text-center text-xs text-muted">
          평균 상품가 {formatPrice(Math.round(products.reduce((sum, product) => sum + productPrice(product), 0) / products.length))}
        </p>
      ) : null}
      <div className="mt-6 flex justify-center gap-2">
        <Button variant="secondary" disabled={offset === 0 || isLoading} onClick={() => updateOffset(Math.max(0, offset - pageLimit))}>
          이전
        </Button>
        <Button variant="secondary" disabled={!pagination.hasMore || isLoading} onClick={() => updateOffset(offset + pageLimit)}>
          다음
        </Button>
      </div>
    </main>
  );
}

function normalizeSort(value: string | null) {
  if (value === "popular") {
    return "popularity";
  }
  if (value === "new") {
    return "created_desc";
  }
  if (value === "price-low") {
    return "price_asc";
  }
  if (value === "price-high") {
    return "price_desc";
  }
  return value ?? "popularity";
}
