"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ProductCard } from "./product-card";

export function SimpleProductSection({
  title,
  description,
  query,
}: {
  title: string;
  description: string;
  query?: { q?: string; sort?: string };
}) {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["simple-products", title, query],
    queryFn: () => api.listProducts(query),
  });

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-8">
      <h1 className="text-2xl font-black">{title}</h1>
      <p className="mt-1 text-sm text-muted">{description}</p>
      {isLoading ? <p className="mt-8 text-sm text-muted">상품을 불러오는 중입니다.</p> : null}
      <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-4 md:gap-x-5">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </main>
  );
}
