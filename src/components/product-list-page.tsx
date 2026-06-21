"use client";

import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { CommerceCategory, Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { ProductCard } from "./product-card";
import { Button } from "./ui/button";

const sorts = [
  { label: "인기순", value: "popular" },
  { label: "신상품", value: "new" },
  { label: "낮은 가격", value: "price-low" },
  { label: "높은 가격", value: "price-high" },
];

const priceRanges = [
  { label: "전체 가격", value: "", min: 0, max: Infinity },
  { label: "3만원 이하", value: "under-30000", min: 0, max: 30_000 },
  { label: "3-5만원", value: "30000-50000", min: 30_000, max: 50_000 },
  { label: "5만원 이상", value: "over-50000", min: 50_000, max: Infinity },
];

const tagFilters = ["오늘출발", "신상", "무료배송", "리뷰많음", "쿠폰가능"];

function productPrice(product: Product) {
  return product.discount_price || product.base_price;
}

function categoryFilterIDs(category: CommerceCategory | undefined) {
  if (!category) {
    return [];
  }
  return category.category_ids?.length ? category.category_ids : [category.id];
}

export function ProductListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const sort = searchParams.get("sort") ?? "popular";
  const category = searchParams.get("category") ?? "";
  const shipping = searchParams.get("shipping") ?? "";
  const sale = searchParams.get("sale") ?? "";
  const stock = searchParams.get("stock") ?? "";
  const market = searchParams.get("market") ?? "";
  const tag = searchParams.get("tag") ?? "";
  const price = searchParams.get("price") ?? "";
  const [filtersOpen, setFiltersOpen] = useState(true);
  const { data: serverCategories = [] } = useQuery({
    queryKey: queryKeys.categories,
    queryFn: api.listCategories,
  });
  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ["products", "catalog"],
    queryFn: () => api.listProducts({ sort: "popular" }),
  });

  const categories = useMemo(
    () => [...serverCategories].sort((a, b) => a.sort_order - b.sort_order),
    [serverCategories],
  );

  const markets = useMemo(
    () => Array.from(new Set(products.map((product) => product.market_name).filter((item): item is string => Boolean(item)))).sort(),
    [products],
  );

  const selectedCategory = categories.find((item) => item.slug === category);
  const selectedCategoryIDs = useMemo(() => categoryFilterIDs(selectedCategory), [selectedCategory]);
  const selectedPrice = priceRanges.find((item) => item.value === price) ?? priceRanges[0];

  const filteredProducts = useMemo(() => {
    const query = q.trim().toLowerCase();
    const result = products.filter((product) => {
      const matchesQuery =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.tags?.some((item) => item.toLowerCase().includes(query)) ||
        product.market_name?.toLowerCase().includes(query);
      const matchesCategory = !selectedCategoryIDs.length || selectedCategoryIDs.includes(product.category_id);
      const matchesShipping = shipping !== "free" || product.shipping_type === "FREE";
      const matchesSale = sale !== "on" || product.discount_price < product.base_price;
      const matchesStock =
        stock !== "available" || product.options?.some((option) => option.is_active && option.quantity > 0);
      const matchesMarket = !market || product.market_name === market;
      const matchesTag = !tag || product.tags?.includes(tag) || (tag === "무료배송" && product.shipping_type === "FREE");
      const matchesPrice = productPrice(product) >= selectedPrice.min && productPrice(product) <= selectedPrice.max;

      return matchesQuery && matchesCategory && matchesShipping && matchesSale && matchesStock && matchesMarket && matchesTag && matchesPrice;
    });

    return result.sort((a, b) => {
      if (sort === "price-low") {
        return productPrice(a) - productPrice(b);
      }
      if (sort === "price-high") {
        return productPrice(b) - productPrice(a);
      }
      if (sort === "new") {
        return b.id - a.id;
      }
      return b.popularity_score - a.popularity_score;
    });
  }, [market, products, q, sale, selectedCategoryIDs, selectedPrice.max, selectedPrice.min, shipping, sort, stock, tag]);

  function updateSearch(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    router.replace(`/products${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function clearFilters() {
    router.replace("/products?sort=popular");
  }

  const activeFilters = [
    selectedCategory ? `카테고리: ${selectedCategory.name}` : null,
    q ? `검색: ${q}` : null,
    market ? `마켓: ${market}` : null,
    selectedPrice.value ? selectedPrice.label : null,
    shipping === "free" ? "무료배송" : null,
    sale === "on" ? "할인중" : null,
    stock === "available" ? "재고 있음" : null,
    tag ? `태그: ${tag}` : null,
  ].filter(Boolean);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-black">{selectedCategory ? `${selectedCategory.name} 상품` : "상품"}</h1>
          <p className="mt-1 text-sm text-muted">
            {filteredProducts.length.toLocaleString("ko-KR")}개 상품을 필터 조건에 맞춰 보여드립니다.
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
        <button
          className={`h-10 shrink-0 rounded-md px-4 text-sm font-bold ${
            !selectedCategory ? "bg-foreground text-white" : "bg-white"
          }`}
          onClick={() => updateSearch({ category: undefined })}
        >
          전체
        </button>
        {categories.map((item) => (
          <button
            key={item.id}
            className={`h-10 shrink-0 rounded-md px-4 text-sm font-bold ${
              selectedCategory?.id === item.id ? "bg-foreground text-white" : "bg-white"
            }`}
            onClick={() => updateSearch({ category: item.slug })}
          >
            {item.name}
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
                <option key={item} value={item}>{item}</option>
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
          <label className="block">
            <span className="text-xs font-black text-muted">태그</span>
            <select className="mt-2 h-10 w-full rounded-md border border-line px-3 text-sm outline-none" value={tag} onChange={(event) => updateSearch({ tag: event.target.value || undefined })}>
              <option value="">전체 태그</option>
              {tagFilters.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <div>
            <span className="text-xs font-black text-muted">빠른 조건</span>
            <div className="mt-2 flex flex-wrap gap-2">
              <button className={`h-9 rounded-md px-3 text-sm font-bold ${shipping === "free" ? "bg-emerald-600 text-white" : "bg-zinc-100"}`} onClick={() => updateSearch({ shipping: shipping === "free" ? undefined : "free" })}>
                무료배송
              </button>
              <button className={`h-9 rounded-md px-3 text-sm font-bold ${sale === "on" ? "bg-brand text-white" : "bg-zinc-100"}`} onClick={() => updateSearch({ sale: sale === "on" ? undefined : "on" })}>
                할인중
              </button>
              <button className={`h-9 rounded-md px-3 text-sm font-bold ${stock === "available" ? "bg-sky-600 text-white" : "bg-zinc-100"}`} onClick={() => updateSearch({ stock: stock === "available" ? undefined : "available" })}>
                재고 있음
              </button>
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
      {!isLoading && !filteredProducts.length ? (
        <div className="mt-8 rounded-md border border-line bg-white p-8 text-center">
          <p className="font-bold">조건에 맞는 상품이 없습니다.</p>
          <p className="mt-1 text-sm text-muted">카테고리나 필터를 조정해보세요.</p>
        </div>
      ) : null}
      <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-4 md:gap-x-5">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      {filteredProducts.length ? (
        <p className="mt-8 text-center text-xs text-muted">
          평균 상품가 {formatPrice(Math.round(filteredProducts.reduce((sum, product) => sum + productPrice(product), 0) / filteredProducts.length))}
        </p>
      ) : null}
    </main>
  );
}
