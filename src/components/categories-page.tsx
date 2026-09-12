"use client";

import { Button } from "@/components/ui/button";

import { PageHeading } from "./ui/page-heading";
import { Grid2X2 as PageIcon } from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { CommerceCategory } from "@/lib/types";
import { PageLayout } from "./page-layout";
import { ProductCard } from "./product-card";
import { ButtonLink } from "./ui/button-link";

export function CategoriesPage() {
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const { data: categories = [], isLoading } = useQuery({
    queryKey: queryKeys.categoryTree,
    queryFn: api.listCategoryTree,
  });
  const { data: products = [] } = useQuery({
    queryKey: queryKeys.products({ sort: "popular" }),
    queryFn: () => api.listProducts({ sort: "popular" }),
  });

  const orderedCategories = useMemo(() => [...categories].sort(compareCategoryOrder), [categories]);
  const flattened = useMemo(() => flattenCategories(orderedCategories), [orderedCategories]);
  const selectedCategory = flattened.find((category) => category.slug === selectedSlug) ?? orderedCategories[0];
  const filterChips = selectedCategory ? categoryFilterChips(selectedCategory) : [];
  const activeFilter = flattened.find((category) => category.slug === selectedSlug) ?? selectedCategory;
  const activeIDs = activeFilter?.category_ids?.length ? activeFilter.category_ids : activeFilter ? [activeFilter.id] : [];
  const filteredProducts = activeIDs.length ? products.filter((product) => activeIDs.includes(product.category_id)).slice(0, 8) : products.slice(0, 8);

  return (
    <PageLayout>
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <PageHeading icon={<PageIcon />} title="카테고리관" description="카테고리별 상품과 인기 상품을 확인하세요." />
        </div>
        <ButtonLink href="/products" variant="secondary" size="sm">
          전체 상품
          <ChevronRight size={16} />
        </ButtonLink>
      </div>

      {isLoading ? <p className="mt-6 text-sm text-content-secondary">카테고리를 불러오는 중입니다.</p> : null}

      <section className="mt-6 overflow-hidden rounded-surface border border-border-subtle bg-surface-raised shadow-card">
        <div className="flex gap-2 overflow-x-auto border-b border-border-subtle p-3">
          {orderedCategories.map((category) => (
            <Button variant="ghost"
              key={category.id}
              className={`h-10 shrink-0 rounded-control px-4 text-sm font-bold ${selectedCategory?.id === category.id ? "bg-action-primary/10 text-action-primary ring-1 ring-brand/25" : "border border-border-subtle bg-surface-raised text-content-secondary hover:bg-surface-subtle"}`}
              onClick={() => setSelectedSlug(category.slug)}
            >
              {category.name}
            </Button>
          ))}
        </div>
        {selectedCategory ? (
          <div className="grid gap-6 p-4 lg:grid-cols-[280px_1fr]">
            <aside className="space-y-3">
              <Link href={selectedCategory.href} className="block rounded-md border border-action-primary/20 bg-action-primary/10 px-4 py-4 text-action-primary">
                <p className="text-lg font-bold">{selectedCategory.name}</p>
                <p className="mt-1 text-xs font-bold text-action-primary/70">{selectedCategory.category_ids?.length ?? 1}개 카테고리 묶음</p>
              </Link>
              <div className="flex flex-wrap gap-2 lg:block lg:space-y-2">
                {filterChips.map((category) => (
                  <Button variant="ghost"
                    key={category.id}
                    className={`rounded-control px-3 py-2 text-left text-sm font-bold lg:w-full ${activeFilter?.id === category.id ? "bg-action-primary/10 text-action-primary ring-1 ring-brand/25" : "border border-border-subtle bg-surface-raised text-content-secondary hover:bg-surface-subtle"}`}
                    onClick={() => setSelectedSlug(category.slug)}
                  >
                    {category.name}
                  </Button>
                ))}
              </div>
            </aside>
            <div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">{activeFilter?.name ?? selectedCategory.name} 실시간 상품</h2>
                  <p className="mt-1 text-sm text-content-secondary">하위 카테고리 기준으로 즉시 필터링됩니다.</p>
                </div>
                <Link href={activeFilter?.href ?? selectedCategory.href} className="text-sm font-bold text-action-primary">상품 더보기</Link>
              </div>
              {filteredProducts.length ? (
                <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-4">
                  {filteredProducts.map((product) => <ProductCard key={product.id} product={product} />)}
                </div>
              ) : (
                <div className="mt-4 rounded-surface border border-dashed border-border-subtle bg-surface-raised p-8 text-center text-sm font-bold text-content-secondary">아직 연결된 상품이 없습니다.</div>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </PageLayout>
  );
}

function compareCategoryOrder(a: CommerceCategory, b: CommerceCategory) {
  return a.sort_order - b.sort_order || a.id - b.id;
}

function flattenCategories(categories: CommerceCategory[]): CommerceCategory[] {
  return categories.flatMap((category) => [category, ...(category.children ? flattenCategories([...category.children].sort(compareCategoryOrder)) : [])]);
}

function categoryFilterChips(category: CommerceCategory) {
  const children = [...(category.children ?? [])].sort(compareCategoryOrder);
  if (!children.length) {
    return [category];
  }
  return children.flatMap((child) => {
    const grandchildren = [...(child.children ?? [])].sort(compareCategoryOrder);
    return grandchildren.length ? [child, ...grandchildren] : [child];
  });
}
