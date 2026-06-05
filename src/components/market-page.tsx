"use client";

import { useQuery } from "@tanstack/react-query";
import { Heart, Store } from "lucide-react";
import { api } from "@/lib/api";
import { ProductCard } from "./product-card";
import { SafeImage } from "./safe-image";
import { Button } from "./ui/button";

export function MarketPage({ marketId }: { marketId: number }) {
  const { data: market, isLoading } = useQuery({
    queryKey: ["market", marketId],
    queryFn: () => api.getMarket(marketId),
  });
  const { data: products = [] } = useQuery({
    queryKey: ["market-products", marketId],
    queryFn: () => api.listProducts(),
  });

  if (isLoading || !market) {
    return <main className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted">마켓을 불러오는 중입니다.</main>;
  }

  const marketProducts = products.filter((product) => product.market_id === market.id);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24">
      <section className="overflow-hidden rounded-md border border-line bg-white">
        <div className="relative h-56 bg-zinc-100 md:h-72">
          <SafeImage src={market.cover_image_url} alt={market.name} fill sizes="100vw" className="object-cover" priority />
        </div>
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-end md:justify-between">
          <div className="flex gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-line bg-zinc-100">
              <SafeImage src={market.profile_image_url} alt="" fill sizes="80px" className="object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Store size={18} className="text-brand" />
                <h1 className="text-2xl font-black">{market.name}</h1>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{market.description}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {market.tags.map((tag) => (
                  <span key={tag} className="rounded-sm bg-zinc-100 px-2 py-1 text-xs font-bold text-zinc-600">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <Button variant="secondary">
            <Heart size={18} />
            {market.follower_count.toLocaleString("ko-KR")} 팔로워
          </Button>
        </div>
      </section>

      <section className="py-8">
        <h2 className="text-xl font-black">마켓 상품</h2>
        <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-4 md:gap-x-5">
          {marketProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </main>
  );
}
