"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Heart, LogIn, Sparkles, Store, TrendingUp } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-client";
import { getEffectiveToken } from "@/lib/auth-token";
import { queryKeys } from "@/lib/query-keys";
import { useSessionStore } from "@/lib/session-store";
import type { Market, MarketFeedItem } from "@/lib/types";
import { formatFollowerCount } from "@/lib/utils";
import { ProductCard } from "./product-card";
import { SafeImage } from "./safe-image";
import { ButtonLink } from "./ui/button-link";
import { Button } from "./ui/button";

const discoveryLimit = 12;
const followingLimit = 8;

export function MarketsPage() {
  const token = useSessionStore((state) => state.accessToken);
  const memberID = useSessionStore((state) => state.memberID);
  const hydrated = useSessionStore((state) => state.hydrated);
  const effectiveToken = getEffectiveToken(token);
  const trendingQuery = useQuery({
    queryKey: queryKeys.marketDiscovery("trending", discoveryLimit),
    queryFn: () => api.listMarkets({ sort: "trending", limit: discoveryLimit }),
  });
  const newProductsQuery = useQuery({
    queryKey: queryKeys.marketDiscovery("new-products", discoveryLimit),
    queryFn: () => api.listMarkets({ sort: "new-products", limit: discoveryLimit }),
  });
  const followingQuery = useQuery({
    queryKey: queryKeys.marketFeed(memberID),
    queryFn: () => api.listMarketFeed(effectiveToken ?? "", { limit: followingLimit }),
    enabled: hydrated && Boolean(effectiveToken),
  });

  return (
    <main className="mx-auto min-h-[70vh] max-w-6xl px-4 pb-28 pt-8">
      <header className="overflow-hidden rounded-feature border border-border-subtle bg-gradient-to-br from-action-secondary via-surface-raised to-surface-raised px-6 py-8 text-content-primary md:px-10 md:py-11">
        <div className="flex items-center gap-3 text-action-primary">
          <Store size={19} aria-hidden="true" />
          <p className="text-xs font-bold tracking-normal">마켓 둘러보기</p>
        </div>
        <h1 className="mt-5 text-3xl font-bold tracking-tight md:text-4xl">마켓</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-content-secondary md:text-base">
          지금 새롭게 주목받는 마켓부터 신상품 소식이 활발한 마켓까지 한곳에서 발견해 보세요.
        </p>
      </header>

      <FollowingSection
        hydrated={hydrated}
        authenticated={Boolean(effectiveToken)}
        items={followingQuery.data?.items ?? []}
        isLoading={followingQuery.isLoading}
        error={followingQuery.error}
        onRetry={() => void followingQuery.refetch()}
      />

      <MarketDiscoverySection
        id="trending"
        icon={<TrendingUp size={18} aria-hidden="true" />}
        eyebrow="이번 주 인기"
        title="지금 뜨는 마켓"
        description="최근 7일 새롭게 팔로우한 사람이 많은 마켓이에요. 누적 팔로워 수는 동률 순위를 정할 때만 반영합니다."
        markets={trendingQuery.data ?? []}
        isLoading={trendingQuery.isLoading}
        error={trendingQuery.error}
        emptyMessage="아직 이번 주 상승세를 보여 줄 마켓이 없습니다."
        metric="followers"
        onRetry={() => void trendingQuery.refetch()}
      />

      <MarketDiscoverySection
        id="new-products"
        icon={<Sparkles size={18} aria-hidden="true" />}
        eyebrow="새 상품 소식"
        title="신상이 활발한 마켓"
        description="최근 7일 동안 판매 가능한 신상품을 가장 많이 선보인 마켓이에요."
        markets={newProductsQuery.data ?? []}
        isLoading={newProductsQuery.isLoading}
        error={newProductsQuery.error}
        emptyMessage="최근 7일 신상품이 등록된 마켓이 없습니다."
        metric="products"
        onRetry={() => void newProductsQuery.refetch()}
      />

    </main>
  );
}

function MarketDiscoverySection({
  id,
  icon,
  eyebrow,
  title,
  description,
  markets,
  isLoading,
  error,
  emptyMessage,
  metric,
  onRetry,
}: {
  id: string;
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  markets: Market[];
  isLoading: boolean;
  error: unknown;
  emptyMessage: string;
  metric: "followers" | "products";
  onRetry: () => void;
}) {
  return (
    <section id={id} className="mt-12 scroll-mt-24" aria-labelledby={`${id}-title`}>
      <div className="flex max-w-3xl items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-action-secondary text-action-primary">{icon}</span>
        <div>
          <p className="text-xs font-bold tracking-normal text-action-primary">{eyebrow}</p>
          <h2 id={`${id}-title`} className="mt-1 text-2xl font-bold tracking-tight">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-content-secondary">{description}</p>
        </div>
      </div>

      {isLoading ? <MarketGridSkeleton /> : null}
      {error ? (
        <div className="mt-6 rounded-surface border border-status-negative-border bg-status-negative-subtle p-5 text-sm" role="alert">
          <p className="font-bold text-status-negative">{title}을 불러오지 못했습니다.</p>
          <p className="mt-2 text-content-secondary">{apiErrorMessage(error)}</p>
          <Button className="mt-4" size="sm" variant="secondary" onClick={onRetry}>다시 불러오기</Button>
        </div>
      ) : null}
      {!isLoading && !error && markets.length === 0 ? (
        <p className="mt-6 rounded-surface border border-dashed border-border-subtle bg-surface-raised px-5 py-8 text-center text-sm text-content-secondary">{emptyMessage}</p>
      ) : null}
      {markets.length ? (
        <div className="no-scrollbar mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 md:gap-5">
          {markets.map((market, index) => <MarketCard key={market.id} market={market} rank={index + 1} metric={metric} />)}
        </div>
      ) : null}
    </section>
  );
}

function MarketCard({ market, rank, metric }: { market: Market; rank: number; metric: "followers" | "products" }) {
  const activityLabel = metric === "followers"
    ? (market.recent_follower_count ? `이번 주 +${market.recent_follower_count.toLocaleString("ko-KR")}명` : "꾸준히 인기")
    : `신상품 ${(market.new_product_count ?? 0).toLocaleString("ko-KR")}개`;

  return (
    <Link
      href={`/markets/${market.id}`}
      className="group w-[72vw] max-w-[280px] shrink-0 snap-start overflow-hidden rounded-surface border border-border-subtle bg-surface-raised transition hover:-translate-y-1 hover:border-border-interactive hover:shadow-float sm:w-64 lg:w-[calc((100%-3.75rem)/4)] lg:max-w-none"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-subtle">
        <SafeImage
          src={market.cover_image_url ?? market.profile_image_url}
          alt={`${market.name} 마켓`}
          fill
          loading={metric === "followers" && rank <= 4 ? "eager" : "lazy"}
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition duration-300 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-xs font-bold text-content-inverse backdrop-blur">{rank}</span>
        <span className="absolute bottom-3 left-3 rounded-full bg-surface-raised/95 px-2.5 py-1 text-xs font-bold text-action-primary shadow-card">{activityLabel}</span>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-bold">{market.name}</h3>
          <ArrowUpRight className="shrink-0 text-content-tertiary transition group-hover:text-action-primary" size={17} aria-hidden="true" />
        </div>
        <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-content-secondary">{market.description || "새로운 스타일을 만나보세요."}</p>
        <p className="mt-3 text-xs font-bold text-content-secondary">팔로워 {formatFollowerCount(market.follower_count ?? 0)}</p>
      </div>
    </Link>
  );
}

function FollowingSection({
  hydrated,
  authenticated,
  items,
  isLoading,
  error,
  onRetry,
}: {
  hydrated: boolean;
  authenticated: boolean;
  items: MarketFeedItem[];
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  if (!hydrated) return null;
  if (!authenticated) {
    return (
      <section className="mt-12 flex flex-col gap-4 rounded-surface border border-border-subtle bg-surface-raised p-5 sm:flex-row sm:items-center sm:justify-between" aria-label="팔로우 중 안내">
        <div>
          <h2 className="font-bold">좋아하는 마켓의 새 소식을 놓치지 마세요</h2>
          <p className="mt-1 text-sm leading-6 text-content-secondary">로그인하고 마켓을 팔로우하면 신상품을 이곳에서 따로 모아볼 수 있어요.</p>
        </div>
        <ButtonLink href="/login?next=%2Fmarkets">
          <LogIn size={16} aria-hidden="true" /> 로그인
        </ButtonLink>
      </section>
    );
  }

  return (
    <section className="mt-12" aria-labelledby="following-title">
      <div className="flex max-w-3xl items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-action-secondary text-action-primary">
          <Heart size={18} aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-bold tracking-normal text-action-primary">팔로우 소식</p>
          <h2 id="following-title" className="mt-1 text-2xl font-bold tracking-tight">내가 팔로우중인 마켓의 신상품</h2>
          <p className="mt-2 text-sm leading-6 text-content-secondary">내가 팔로우한 마켓이 최근 등록한 상품만 모았습니다.</p>
        </div>
      </div>
      {isLoading ? <FollowingSkeleton /> : null}
      {error ? (
        <div className="mt-5 rounded-control border border-status-negative-border bg-status-negative-subtle p-4 text-sm" role="alert">
          <p className="font-bold text-status-negative">팔로우 중 새 소식을 불러오지 못했습니다.</p>
          <p className="mt-1 text-content-secondary">{apiErrorMessage(error)}</p>
          <Button className="mt-3" size="sm" variant="secondary" onClick={onRetry}>다시 시도</Button>
        </div>
      ) : null}
      {!isLoading && !error && items.length === 0 ? (
        <p className="mt-5 rounded-surface border border-dashed border-border-subtle bg-surface-raised px-5 py-6 text-sm text-content-secondary">아직 도착한 새 상품이 없습니다. 위에서 관심 있는 마켓을 발견해 보세요.</p>
      ) : null}
      {items.length ? (
        <div className="no-scrollbar mt-5 flex snap-x gap-4 overflow-x-auto pb-3">
          {items.map((item) => <FollowingProduct key={`${item.product.id}-${item.published_at}`} item={item} />)}
        </div>
      ) : null}
    </section>
  );
}

function FollowingProduct({ item }: { item: MarketFeedItem }) {
  return (
    <article className="w-48 shrink-0 snap-start sm:w-56">
      <Link href={`/markets/${item.market.id}`} className="mb-2 flex min-w-0 items-center gap-2 rounded-lg p-1 hover:bg-surface-subtle">
        <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-surface-subtle">
          <SafeImage src={item.market.profile_image_url} alt="" fill sizes="32px" className="object-cover" />
        </span>
        <span className="min-w-0">
          <strong className="block truncate text-xs">{item.market.name}</strong>
          <span className="block text-xs text-content-secondary">{formatPublishedAt(item.published_at)}</span>
        </span>
      </Link>
      <ProductCard product={item.product} imageAspect="aspect-[4/3]" compact />
    </article>
  );
}

function MarketGridSkeleton() {
  return <div className="mt-6 flex gap-3 overflow-hidden md:gap-5" aria-label="마켓 목록 불러오는 중">{Array.from({ length: 4 }, (_, index) => <div key={index} className="aspect-[4/3] w-[72vw] max-w-[280px] shrink-0 animate-pulse rounded-surface bg-surface-subtle sm:w-64 lg:w-[calc((100%-3.75rem)/4)] lg:max-w-none" />)}</div>;
}

function FollowingSkeleton() {
  return <div className="mt-5 flex gap-4 overflow-hidden" aria-label="팔로우 중 새 상품 불러오는 중">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-64 w-48 shrink-0 animate-pulse rounded-surface bg-surface-subtle" />)}</div>;
}

function formatPublishedAt(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(new Date(value));
}
