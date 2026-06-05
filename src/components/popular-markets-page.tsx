"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { SafeImage } from "./safe-image";

export function PopularMarketsPage() {
  const { data: markets = [] } = useQuery({
    queryKey: ["markets"],
    queryFn: api.listMarkets,
  });

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-8">
      <h1 className="text-2xl font-black">인기 마켓</h1>
      <p className="mt-1 text-sm text-muted">팔로워와 상품 반응이 좋은 마켓을 모았습니다.</p>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {markets.map((market) => (
          <Link key={market.id} href={`/markets/${market.id}`} className="overflow-hidden rounded-md border border-line bg-white hover:bg-zinc-50">
            <div className="relative h-32 bg-zinc-100">
              <SafeImage src={market.cover_image_url} alt={market.name} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
            </div>
            <div className="p-4">
              <h2 className="font-black">{market.name}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-muted">{market.description}</p>
              <p className="mt-3 text-xs font-bold text-brand">{market.follower_count.toLocaleString("ko-KR")} followers</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
