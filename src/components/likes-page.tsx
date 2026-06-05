"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Package, Smile, Sparkles, Users, type LucideIcon } from "lucide-react";
import { api } from "@/lib/api";
import { ProductCard } from "./product-card";
import { SafeImage } from "./safe-image";
import { Button } from "./ui/button";

const PAGE_SIZE = 20;

export function LikesPage() {
  const [page, setPage] = useState(1);
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: () => api.listProducts({ sort: "popular" }) });
  const { data: markets = [] } = useQuery({ queryKey: ["markets"], queryFn: api.listMarkets });
  const likedProducts = useMemo(() => {
    if (!products.length) {
      return [];
    }
    return Array.from({ length: 40 }, (_, index) => products[index % products.length]);
  }, [products]);
  const totalPages = Math.max(1, Math.ceil(likedProducts.length / PAGE_SIZE));
  const visibleProducts = likedProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-8">
      <h1 className="text-2xl font-black">좋아요</h1>
      <p className="mt-1 text-sm text-muted">즐겨찾기한 마켓과 찜한 상품을 모아봅니다.</p>

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black">즐겨찾기한 마켓</h2>
          <span className="text-sm font-bold text-muted">{markets.length}개</span>
        </div>
        <div className="mt-3 flex snap-x gap-3 overflow-x-auto pb-2">
          {markets.map((market) => {
            const marketProducts = products.filter((product) => product.market_id === market.id);
            const newCount = marketProducts.filter((product) => product.tags?.includes("신상")).length;
            const satisfaction = Math.min(99, 88 + (market.id * 2));
            return (
              <Link key={market.id} href={`/markets/${market.id}`} className="w-[82vw] shrink-0 snap-start rounded-md border border-line bg-white p-4 hover:bg-zinc-50 sm:w-80">
                <div className="flex gap-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-zinc-100">
                    <SafeImage src={market.profile_image_url} alt="" fill sizes="64px" className="object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-black">{market.name}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{market.description}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <Metric icon={Sparkles} label="신상품" value={`${newCount}개`} />
                  <Metric icon={Smile} label="만족도" value={`${satisfaction}%`} />
                  <Metric icon={Users} label="즐겨찾기" value={market.follower_count.toLocaleString("ko-KR")} />
                  <Metric icon={Package} label="전체 상품" value={`${marketProducts.length}개`} />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black">찜한 상품</h2>
          <span className="text-sm font-bold text-muted">
            {likedProducts.length}개 · {page}/{totalPages}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-4 md:gap-x-5">
          {visibleProducts.map((product, index) => (
            <ProductCard key={`${product.id}-liked-${page}-${index}`} product={product} />
          ))}
        </div>
        <div className="mt-8 flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
            <ChevronLeft size={16} />
            이전
          </Button>
          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              className={`h-9 w-9 rounded-md text-sm font-black ${page === index + 1 ? "bg-foreground text-white" : "bg-white"}`}
              onClick={() => setPage(index + 1)}
            >
              {index + 1}
            </button>
          ))}
          <Button variant="secondary" size="sm" disabled={page === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
            다음
            <ChevronRight size={16} />
          </Button>
        </div>
      </section>
    </main>
  );
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-md bg-zinc-50 p-2">
      <div className="flex items-center gap-1 text-muted">
        <Icon size={13} />
        <span>{label}</span>
      </div>
      <p className="mt-1 font-black text-foreground">{value}</p>
    </div>
  );
}
