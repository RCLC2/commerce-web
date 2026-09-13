"use client";

import { PageHeading } from "./ui/page-heading";
import { TrendingUp as PageIcon } from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-client";
import { PageLayout } from "./page-layout";
import { ProductCard } from "./product-card";
import { Button } from "./ui/button";
import { EmptyState, InlineLoadingState } from "./ui/feedback";

type ProductSectionKind = "catalog" | "popular" | "promotion";

export function SimpleProductSection({
  title,
  description,
  query,
  kind = "catalog",
}: {
  title: string;
  description: string;
  query?: { q?: string; sort?: string };
  kind?: ProductSectionKind;
}) {
  const productsQuery = useQuery({
    queryKey: ["simple-products", kind, title, query],
    queryFn: () => listSectionProducts(kind, query),
  });
  const products = productsQuery.data ?? [];

  return (
    <PageLayout>
      <PageHeading icon={<PageIcon />} title={title} description={description} />
      {productsQuery.isLoading ? <InlineLoadingState className="mt-8" label="상품을 불러오는 중입니다." /> : null}
      {productsQuery.isError ? <div className="mt-6 rounded-control border border-status-negative-border bg-status-negative-subtle p-4 text-sm" role="alert"><p className="font-bold text-status-negative">{apiErrorMessage(productsQuery.error)}</p><Button className="mt-3" size="sm" variant="secondary" onClick={() => void productsQuery.refetch()}>다시 시도</Button></div> : null}
      {productsQuery.isSuccess && products.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<PageIcon className="size-7" />}
          title="표시할 상품이 없습니다"
          description="새로운 상품을 준비하고 있으니 잠시 후 다시 확인해주세요."
        />
      ) : null}
      <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-4 md:gap-x-5">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </PageLayout>
  );
}

function listSectionProducts(kind: ProductSectionKind, query?: { q?: string; sort?: string }) {
  if (kind === "popular") {
    return api.listPopularProducts();
  }
  if (kind === "promotion") {
    return api.listPromotionProducts();
  }
  return api.listProducts(query);
}
