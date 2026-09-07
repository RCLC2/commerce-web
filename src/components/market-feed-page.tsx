"use client";

import { PageHeading } from "./ui/page-heading";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ChevronRight, LogIn, Store } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-client";
import { getEffectiveToken } from "@/lib/auth-token";
import { queryKeys } from "@/lib/query-keys";
import { useSessionStore } from "@/lib/session-store";
import type { Market } from "@/lib/types";
import { formatFollowerCount } from "@/lib/utils";
import { ProductCard } from "./product-card";
import { SafeImage } from "./safe-image";
import { Button } from "./ui/button";

const feedPageSize = 12;

export function MarketFeedPage() {
  const token = useSessionStore((state) => state.accessToken);
  const memberID = useSessionStore((state) => state.memberID);
  const hydrated = useSessionStore((state) => state.hydrated);
  const effectiveToken = getEffectiveToken(token);
  const feedQuery = useInfiniteQuery({
    queryKey: queryKeys.marketFeed(memberID),
    initialPageParam: "",
    queryFn: ({ pageParam }) => api.listMarketFeed(effectiveToken ?? "", {
      limit: feedPageSize,
      cursor: pageParam || undefined,
    }),
    getNextPageParam: (lastPage) => lastPage.next_cursor,
    enabled: hydrated && Boolean(effectiveToken),
  });
  const feedItems = feedQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const showPopularMarkets = hydrated && (!effectiveToken || (feedQuery.isSuccess && feedItems.length === 0));
  const popularMarketsQuery = useQuery({
    queryKey: queryKeys.popularMarkets(6),
    queryFn: () => api.listMarkets({ sort: "popular", limit: 6 }),
    enabled: showPopularMarkets,
  });

  return (
    <main className="mx-auto min-h-[70vh] max-w-6xl px-4 pb-28 pt-8">
      <header className="border-b border-border-subtle pb-6">
        <PageHeading icon={<Store />} title="마켓 피드" description="내가 팔로우한 마켓의 새 상품을 등록 순서대로 모아봅니다." />
      </header>

      {!hydrated || (effectiveToken && feedQuery.isLoading) ? <FeedSkeleton /> : null}

      {hydrated && effectiveToken && feedQuery.isError ? (
        <div className="mt-6 rounded-xl border border-action-primary/30 bg-status-negative-subtle p-6 text-sm" role="status">
          <p className="font-bold text-action-primary">마켓 피드를 불러오지 못했습니다.</p>
          <p className="mt-2 text-content-secondary">{apiErrorMessage(feedQuery.error)}</p>
          <Button className="mt-4" size="sm" variant="secondary" onClick={() => void feedQuery.refetch()}>다시 불러오기</Button>
        </div>
      ) : null}

      {feedItems.length ? (
        <section className="mt-6" aria-label="팔로우 마켓 새 상품">
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-5 lg:grid-cols-4">
            {feedItems.map((item) => (
              <div key={`${item.product.id}-${item.published_at}`} className="min-w-0">
                <Link href={`/markets/${item.market.id}`} className="mb-3 flex min-w-0 items-center gap-2 rounded-lg bg-surface-raised p-2 hover:bg-surface-subtle">
                  <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-surface-subtle">
                    <SafeImage src={item.market.profile_image_url} alt="" fill sizes="36px" className="object-cover" />
                  </span>
                  <span className="min-w-0">
                    <strong className="block truncate text-xs">{item.market.name}</strong>
                    <span className="block truncate text-xs text-content-secondary">팔로워 {formatFollowerCount(item.market.follower_count)} · {formatPublishedAt(item.published_at)}</span>
                  </span>
                </Link>
                <ProductCard product={item.product} />
              </div>
            ))}
          </div>
          {feedQuery.hasNextPage ? (
            <div className="mt-8 text-center">
              <Button variant="secondary" disabled={feedQuery.isFetchingNextPage} onClick={() => void feedQuery.fetchNextPage()}>
                {feedQuery.isFetchingNextPage ? "새 상품 불러오는 중" : "새 상품 더 보기"}
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      {showPopularMarkets ? (
        <PopularMarketDiscovery
          authenticated={Boolean(effectiveToken)}
          markets={popularMarketsQuery.data ?? []}
          isLoading={popularMarketsQuery.isLoading}
          error={popularMarketsQuery.error}
          onRetry={() => void popularMarketsQuery.refetch()}
        />
      ) : null}
    </main>
  );
}

function PopularMarketDiscovery({
  authenticated,
  markets,
  isLoading,
  error,
  onRetry,
}: {
  authenticated: boolean;
  markets: Market[];
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <section className="mt-6 rounded-2xl border border-border-subtle bg-surface-raised p-5 md:p-7" aria-label="인기 마켓 둘러보기">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">{authenticated ? "아직 피드가 비어 있어요" : "팔로우할 마켓을 찾아보세요"}</h2>
          <p className="mt-2 text-sm leading-6 text-content-secondary">
            {authenticated
              ? "마켓을 팔로우하면 새로 등록된 상품이 이곳에 쌓입니다."
              : "로그인하고 좋아하는 마켓을 팔로우하면 나만의 새 상품 피드가 만들어집니다."}
          </p>
        </div>
        {!authenticated ? (
          <Link href="/login?next=%2Fmarket-feed" className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-action-primary px-4 text-sm font-bold text-content-inverse hover:bg-brand-strong">
            <LogIn size={16} /> 로그인
          </Link>
        ) : null}
      </div>

      <div className="mt-7 flex items-center justify-between">
        <h3 className="font-bold">인기 마켓</h3>
        <Link href="/popular-markets" className="inline-flex items-center text-sm font-bold text-action-primary">전체 보기 <ChevronRight size={16} /></Link>
      </div>
      {isLoading ? <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="h-24 animate-pulse rounded-xl bg-surface-subtle" />)}</div> : null}
      {error ? <div className="mt-4 rounded-xl bg-status-negative-subtle p-4 text-sm"><p className="font-bold text-status-negative">{apiErrorMessage(error)}</p><Button className="mt-3" size="sm" variant="secondary" onClick={onRetry}>다시 시도</Button></div> : null}
      {!isLoading && !error && markets.length === 0 ? <p className="mt-4 text-sm text-content-secondary">지금 소개할 마켓이 없습니다.</p> : null}
      {markets.length ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {markets.map((market) => (
            <Link key={market.id} href={`/markets/${market.id}`} className="flex min-w-0 items-center gap-3 rounded-xl border border-border-subtle p-3 transition hover:-translate-y-0.5 hover:shadow-md">
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-surface-subtle"><SafeImage src={market.profile_image_url} alt="" fill sizes="56px" className="object-cover" /></span>
              <span className="min-w-0"><strong className="block truncate">{market.name}</strong><span className="mt-1 block text-xs font-bold text-content-secondary">팔로워 {formatFollowerCount(market.follower_count ?? 0)}</span></span>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function FeedSkeleton() {
  return <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="마켓 피드 불러오는 중">{Array.from({ length: 4 }, (_, index) => <div key={index} className="aspect-[3/4] animate-pulse rounded-xl bg-surface-subtle" />)}</div>;
}

function formatPublishedAt(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(new Date(value));
}
