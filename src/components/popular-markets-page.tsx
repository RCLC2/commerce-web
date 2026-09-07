"use client";

import { PageHeading } from "./ui/page-heading";
import { Store as PageIcon } from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { formatFollowerCount } from "@/lib/utils";
import { SafeImage } from "./safe-image";
import { Button } from "./ui/button";

export function PopularMarketsPage() {
  const marketsQuery = useQuery({
    queryKey: queryKeys.popularMarkets(50),
    queryFn: () => api.listMarkets({ sort: "popular", limit: 50 }),
  });
  const markets = marketsQuery.data ?? [];

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-8">
      <PageHeading icon={<PageIcon />} title="인기 마켓" description="팔로워와 상품 반응이 좋은 마켓을 모았습니다." />
      {marketsQuery.isLoading ? <p className="mt-6 text-sm text-content-secondary">마켓을 불러오는 중입니다.</p> : null}
      {marketsQuery.isError ? <div className="mt-6 rounded-md border border-action-primary/30 bg-status-negative-subtle p-4 text-sm"><p className="font-bold text-status-negative">{apiErrorMessage(marketsQuery.error)}</p><Button className="mt-3" size="sm" variant="secondary" onClick={() => void marketsQuery.refetch()}>다시 시도</Button></div> : null}
      {marketsQuery.isSuccess && markets.length === 0 ? <p className="mt-6 text-sm text-content-secondary">표시할 마켓이 없습니다.</p> : null}
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {markets.map((market) => (
          <Link key={market.id} href={`/markets/${market.id}`} className="overflow-hidden rounded-md border border-border-subtle bg-surface-raised hover:bg-surface-subtle">
            <div className="relative h-32 bg-surface-subtle">
              <SafeImage src={market.cover_image_url} alt={market.name} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
            </div>
            <div className="p-4">
              <h2 className="font-bold">{market.name}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-content-secondary">{market.description}</p>
              <p className="mt-3 text-xs font-bold text-action-primary">{market.follower_count == null ? "-" : formatFollowerCount(market.follower_count)} 팔로워</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
