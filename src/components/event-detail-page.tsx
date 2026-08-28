"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Gift, Store, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-client";
import { getEffectiveToken } from "@/lib/auth-token";
import {
  couponRewardIsOwned,
  eventRewardIsConfirmed,
} from "@/lib/event-rewards";
import type { EventProduct, EventReward, EventSort } from "@/lib/event-detail-types";
import { queryKeys } from "@/lib/query-keys";
import { useSessionStore } from "@/lib/session-store";
import { formatFollowerCount } from "@/lib/utils";
import { EventBenefitTicket } from "./event-benefit-ticket";
import { ProductCard } from "./product-card";
import { ApiErrorState } from "./api-error-state";
import { SafeImage } from "./safe-image";
import { Button } from "./ui/button";

const EVENT_PRODUCT_PAGE_SIZE = 12;

export function EventDetailPage({ eventId }: { eventId: number }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useSessionStore((state) => state.accessToken);
  const memberID = useSessionStore((state) => state.memberID);
  const effectiveToken = getEffectiveToken(token);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [sort, setSort] = useState<EventSort | undefined>();
  const [marketID, setMarketID] = useState<number | undefined>();
  const [categoryID, setCategoryID] = useState<number | undefined>();
  const [confirmedPointClaims, setConfirmedPointClaims] = useState<{ scope: string; ids: Set<number> }>({
    scope: "",
    ids: new Set(),
  });

  const eventQuery = useQuery({
    queryKey: ["event-detail", eventId],
    queryFn: () => api.getEvent(eventId),
  });
  const event = eventQuery.data;
  const ownedCouponsQuery = useQuery({
    queryKey: queryKeys.coupons(memberID),
    queryFn: () => api.listCoupons(effectiveToken ?? ""),
    enabled: Boolean(effectiveToken && memberID !== null),
  });

  const activeSort = sort ?? event?.product_display.default_sort ?? "RECOMMENDED";

  const productsQuery = useInfiniteQuery({
    queryKey: ["event-products", eventId, activeSort, marketID ?? 0, categoryID ?? 0],
    initialPageParam: 0,
    enabled: Boolean(event?.product_display.enabled),
    queryFn: ({ pageParam }) => api.listEventProducts({
      eventID: eventId,
      limit: EVENT_PRODUCT_PAGE_SIZE,
      offset: pageParam,
      sort: activeSort,
      marketID,
      categoryID,
    }),
    getNextPageParam: (lastPage) => lastPage.paging.has_next
      ? lastPage.paging.offset + lastPage.items.length
      : undefined,
  });

  const products = useMemo(
    () => productsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [productsQuery.data?.pages],
  );
  const rewardScope = memberID === null ? "" : `${memberID}:${eventId}`;
  const confirmedClaimedRewards = useMemo(() => {
    const ids = new Set<number>();
    const currentPointClaims = confirmedPointClaims.scope === rewardScope
      ? confirmedPointClaims.ids
      : new Set<number>();
    for (const reward of event?.rewards ?? []) {
      if (eventRewardIsConfirmed(reward, ownedCouponsQuery.data, currentPointClaims)) ids.add(reward.id);
    }
    return ids;
  }, [confirmedPointClaims, event?.rewards, ownedCouponsQuery.data, rewardScope]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && productsQuery.hasNextPage && !productsQuery.isFetchingNextPage) {
        void productsQuery.fetchNextPage();
      }
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [productsQuery]);

  const claimReward = useMutation({
    mutationFn: async (reward: EventReward) => {
      if (!effectiveToken) throw new Error("로그인이 필요합니다.");
      try {
        return await api.claimEventReward(effectiveToken, eventId, reward.id);
      } catch (error) {
        if (reward.reward_type === "COUPON") {
          try {
            const coupons = await api.listCoupons(effectiveToken);
            queryClient.setQueryData(queryKeys.coupons(memberID), coupons);
            if (couponRewardIsOwned(reward, coupons)) {
              return {
                status: "ISSUED",
                event_id: eventId,
                reward_row_id: reward.id,
                reward_type: reward.reward_type,
                reward_id: reward.reward_id,
              };
            }
          } catch {
            // Preserve the original claim error if coupon reconciliation fails.
          }
        }
        throw error;
      }
    },
    onSuccess: async (_claim, reward) => {
      if (reward.reward_type === "POINT_EVENT") {
        setConfirmedPointClaims((current) => {
          const base = current.scope === rewardScope ? current.ids : new Set<number>();
          return { scope: rewardScope, ids: new Set(base).add(reward.id) };
        });
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.me(memberID) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.coupons(memberID) }),
      ]);
    },
  });

  if (eventQuery.isError) {
    return <main className="mx-auto max-w-6xl px-4 py-8 text-sm"><ApiErrorState error={eventQuery.error} onRetry={() => void eventQuery.refetch()} /></main>;
  }
  if (eventQuery.isLoading || !event) {
    return <main className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted">이벤트를 불러오는 중입니다.</main>;
  }

  const schedule = event.starts_at && event.ends_at
    ? `${new Date(event.starts_at).toLocaleDateString("ko-KR")} - ${new Date(event.ends_at).toLocaleDateString("ko-KR")}`
    : event.starts_at
      ? `${new Date(event.starts_at).toLocaleDateString("ko-KR")}부터`
      : event.ends_at
        ? `${new Date(event.ends_at).toLocaleDateString("ko-KR")}까지`
        : "상시 진행";
  const heroTone = event.design_variant === "BENEFIT_FOCUS"
    ? "from-violet-950/80 via-fuchsia-900/30"
    : event.design_variant === "MARKET_STORY"
      ? "from-stone-950/85 via-amber-950/30"
      : "from-black/75 via-black/20";

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24">
      <section className="pt-5">
        <div className="relative h-[320px] overflow-hidden rounded-md bg-zinc-100 md:h-[420px]">
          <SafeImage src={event.image_url} alt={event.title} fill sizes="100vw" className="object-cover" priority />
          <div className={`absolute inset-0 bg-gradient-to-t ${heroTone} to-transparent`} />
          <div className="absolute inset-x-0 bottom-0 max-w-3xl p-6 text-white md:p-10">
            <p className="text-sm font-black">진행중 이벤트</p>
            <h1 className="mt-3 text-4xl font-black md:text-6xl">{event.title}</h1>
            <p className="mt-3 text-base text-white/90 md:text-lg">{event.subtitle}</p>
            <p className="mt-5 text-sm font-bold text-white/80">{schedule}</p>
          </div>
        </div>
      </section>

      {event.rewards.length ? (
        <section className="py-8" aria-labelledby="event-benefits-title">
          <div className="rounded-3xl bg-zinc-50 p-4 md:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#ff3f55] shadow-sm"><Gift size={19} /></span>
              <div>
                <h2 id="event-benefits-title" className="text-xl font-black tracking-[-0.03em]">이벤트 혜택</h2>
                <p className="mt-0.5 text-xs text-zinc-500">받기 버튼을 눌러 내 쿠폰함에 저장하세요.</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {[...event.rewards].sort((a, b) => a.sequence - b.sequence || a.id - b.id).map((reward) => {
                const claimed = confirmedClaimedRewards.has(reward.id);
                const isPending = claimReward.isPending && claimReward.variables?.id === reward.id;
                const couponClaimAwaitingOwnership = reward.reward_type === "COUPON"
                  && claimReward.isSuccess
                  && claimReward.variables?.id === reward.id
                  && !claimed;
                const ready = !effectiveToken
                  || reward.reward_type !== "COUPON"
                  || (ownedCouponsQuery.isSuccess && !ownedCouponsQuery.isFetching && !couponClaimAwaitingOwnership);
                return <EventBenefitTicket key={reward.id} reward={reward} claimed={claimed} pending={isPending} ready={ready} authenticated={Boolean(effectiveToken)} onClaim={() => effectiveToken ? claimReward.mutate(reward) : router.push(`/login?next=/events/${eventId}`)} />;
              })}
            </div>
            {claimReward.isError ? <p className="mt-3 text-sm font-bold text-brand">{apiErrorMessage(claimReward.error)}</p> : null}
            {ownedCouponsQuery.isError ? <div className="mt-3 text-sm"><p className="font-bold text-brand">보유 쿠폰을 불러오지 못해 기존 수령 여부를 확인할 수 없습니다.</p><Button className="mt-2" size="sm" variant="secondary" onClick={() => void ownedCouponsQuery.refetch()}>쿠폰 상태 다시 확인</Button></div> : null}
            {claimReward.isSuccess && claimReward.variables?.reward_type === "COUPON" && !confirmedClaimedRewards.has(claimReward.variables.id) ? <div className="mt-3 text-sm"><p className="font-bold text-amber-900">발급 응답을 받았지만 보유 쿠폰 목록에서 아직 확인되지 않았습니다.</p><Button className="mt-2" size="sm" variant="secondary" onClick={() => void ownedCouponsQuery.refetch()}>쿠폰 상태 다시 확인</Button></div> : null}
          </div>
        </section>
      ) : null}

      {event.product_display.enabled ? (
        <section className="py-8">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <h2 className="text-xl font-black">{event.product_display.section_title}</h2>
            <div className="flex flex-wrap gap-2">
              {event.product_display.markets.length > 1 ? (
                <FilterSelect label="전체 마켓" value={marketID} options={event.product_display.markets} onChange={setMarketID} />
              ) : null}
              {event.product_display.categories.length > 1 ? (
                <FilterSelect label="전체 카테고리" value={categoryID} options={event.product_display.categories} onChange={setCategoryID} />
              ) : null}
              <select aria-label="이벤트 상품 정렬" className="h-10 rounded-md border border-line bg-white px-3 text-sm font-bold" value={activeSort} onChange={(e) => setSort(e.target.value as EventSort)}>
                {event.product_display.sort_options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
          </div>

          {productsQuery.isError ? <ApiErrorState error={productsQuery.error} onRetry={() => void productsQuery.refetch()} retryLabel="이벤트 상품 다시 시도" /> : productsQuery.isLoading ? <ProductSkeleton /> : products.length === 0 ? (
            <p className="rounded-md border border-line bg-white p-8 text-center text-sm text-muted">표시할 이벤트 상품이 없습니다.</p>
          ) : event.product_display.mode === "MARKET_CAROUSELS" ? (
            <MarketCarousels products={products} />
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-4 md:gap-x-5">
              {products.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          )}
          <div ref={loadMoreRef} className="h-10" />
          {productsQuery.isFetchingNextPage ? <p className="text-center text-xs font-bold text-muted">이벤트 상품을 더 불러오는 중입니다.</p> : null}
        </section>
      ) : null}
    </main>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value?: number; options: Array<{ id: number; name: string }>; onChange: (value?: number) => void }) {
  return (
    <select className="h-10 rounded-md border border-line bg-white px-3 text-sm font-bold" value={value ?? ""} onChange={(event) => onChange(event.target.value ? Number(event.target.value) : undefined)}>
      <option value="">{label}</option>
      {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
    </select>
  );
}

function ProductSkeleton() {
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="aspect-square animate-pulse rounded-md bg-zinc-200" />)}</div>;
}

function MarketCarousels({ products }: { products: EventProduct[] }) {
  const grouped = useMemo(() => {
    const groups = new Map<number, {
      id: number;
      name: string;
      profileImageURL?: string;
      description?: string;
      followerCount?: number;
      products: EventProduct[];
    }>();
    for (const product of products) {
      const group = groups.get(product.market_id) ?? {
        id: product.market_id,
        name: product.market_name ?? `마켓 ${product.market_id}`,
        profileImageURL: product.market_profile_image_url,
        description: product.market_description,
        followerCount: product.market_follower_count,
        products: [],
      };
      group.products.push(product);
      groups.set(product.market_id, group);
    }
    return [...groups.values()];
  }, [products]);

  return <div className="space-y-6">{grouped.map((market) => <MarketCarousel key={market.id} market={market} />)}</div>;
}

function MarketCarousel({ market }: {
  market: {
    id: number;
    name: string;
    profileImageURL?: string;
    description?: string;
    followerCount?: number;
    products: EventProduct[];
  };
}) {
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const slide = (direction: -1 | 1) => carouselRef.current?.scrollBy({ left: direction * 640, behavior: "smooth" });
  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-zinc-50/70 p-4 md:p-5">
        <Link href={`/markets/${market.id}`} className="flex min-w-0 items-center gap-3">
          <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-line bg-zinc-100">
            <SafeImage src={market.profileImageURL} alt={market.name} fill sizes="56px" className="object-cover" />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <Store size={15} className="shrink-0 text-brand" />
              <span className="truncate text-base font-black md:text-lg">{market.name}</span>
            </span>
            {market.description ? <span className="mt-1 block truncate text-xs text-muted md:text-sm">{market.description}</span> : null}
            {market.followerCount != null ? (
              <span className="mt-1 flex items-center gap-1 text-xs font-bold text-muted">
                <Users size={13} /> 팔로워 {formatFollowerCount(market.followerCount)}
              </span>
            ) : null}
          </span>
        </Link>
        <div className="flex shrink-0 gap-2">
          <Button size="icon" variant="secondary" aria-label={`${market.name} 이전`} onClick={() => slide(-1)}><ChevronLeft size={17} /></Button>
          <Button size="icon" variant="secondary" aria-label={`${market.name} 다음`} onClick={() => slide(1)}><ChevronRight size={17} /></Button>
        </div>
      </div>
      <div ref={carouselRef} className="no-scrollbar flex snap-x gap-3 overflow-x-auto p-4 md:gap-5 md:p-5">{market.products.map((product) => <div key={product.id} className="w-[44vw] shrink-0 snap-start sm:w-52 md:w-60"><ProductCard product={product} /></div>)}</div>
    </article>
  );
}
