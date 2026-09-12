"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleHelp, Heart, Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useSessionStore } from "@/lib/session-store";
import { formatFollowerCount } from "@/lib/utils";
import { PageLayout } from "./page-layout";
import { ProductCard } from "./product-card";
import { SafeImage } from "./safe-image";
import { Button } from "./ui/button";
import { LoadingState } from "./ui/feedback";

export function MarketPage({ marketId }: { marketId: number }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useSessionStore((state) => state.accessToken) ?? "";
  const memberID = useSessionStore((state) => state.memberID);
  const [toggleResolution, setToggleResolution] = useState<string>();
  const marketQuery = useQuery({ queryKey: ["market", marketId], queryFn: () => api.getMarket(marketId) });
  const productsQuery = useQuery({ queryKey: ["market-products", marketId], queryFn: () => api.listPLPProducts({ marketId }) });
  const followKey = queryKeys.marketFollow(marketId, memberID);
  const followQuery = useQuery({ queryKey: followKey, queryFn: () => api.getMarketFollowStatus(token, marketId), enabled: Boolean(token) });
  const following = !token ? false : followQuery.isSuccess ? followQuery.data.following : undefined;
  const toggle = useMutation({
    mutationFn: (currentFollowing: boolean) => currentFollowing ? api.unfollowMarket(token, marketId) : api.followMarket(token, marketId),
    onMutate: () => queryClient.cancelQueries({ queryKey: followKey }),
    onSuccess: async (_data, currentFollowing) => {
      queryClient.setQueryData(followKey, { following: !currentFollowing });
      queryClient.setQueryData(["market", marketId], (current: typeof marketQuery.data) => current ? { ...current, follower_count: Math.max(0, (current.follower_count ?? 0) + (currentFollowing ? -1 : 1)) } : current);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: followKey }),
        queryClient.invalidateQueries({ queryKey: ["market", marketId] }),
      ]);
    },
  });

  async function reconcileToggle() {
    const attemptedCurrent = toggle.variables;
    if (attemptedCurrent === undefined) return;
    const target = !attemptedCurrent;
    const refreshed = await followQuery.refetch();
    if (!refreshed.isSuccess) return;
    if (refreshed.data.following === target) {
      toggle.reset();
      setToggleResolution("서버에서 마켓 팔로우 상태를 확인했습니다.");
      await queryClient.invalidateQueries({ queryKey: ["market", marketId] });
      return;
    }
    toggle.mutate(refreshed.data.following);
  }

  const market = marketQuery.data;
  const products = productsQuery.data?.items ?? [];
  if (marketQuery.isLoading) return <PageLayout><LoadingState label="마켓을 불러오는 중입니다." /></PageLayout>;
  if (marketQuery.error || !market) return <PageLayout><div className="rounded-surface border border-status-negative-border bg-status-negative-subtle p-8 text-center shadow-card" role="alert"><h1 className="text-xl font-bold text-status-negative">마켓을 불러오지 못했습니다.</h1><Button className="mt-4" size="sm" variant="secondary" onClick={() => void marketQuery.refetch()}>마켓 다시 불러오기</Button></div></PageLayout>;

  return (
    <PageLayout className="pt-0">
      <section className="overflow-hidden rounded-feature border border-border-subtle bg-surface-raised shadow-card">
        <div className="relative h-56 bg-surface-subtle md:h-72"><SafeImage src={market.cover_image_url} alt={market.name} fill sizes="100vw" className="object-cover" /></div>
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-end md:justify-between">
          <div className="flex gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-control border border-border-subtle bg-surface-subtle"><SafeImage src={market.profile_image_url} alt="" fill sizes="80px" className="object-cover" /></div>
            <div><div className="flex items-center gap-2"><Store size={18} className="text-action-primary" /><h1 className="text-2xl font-bold">{market.name}</h1></div><p className="mt-2 max-w-2xl text-sm leading-6 text-content-secondary">{market.description}</p></div>
          </div>
          <Button
            variant={following === true ? "primary" : following === false ? "secondary" : "ghost"}
            className={following === undefined ? "border border-dashed border-border-interactive bg-surface-raised text-content-secondary" : undefined}
            disabled={Boolean(token) && (following === undefined || toggle.isPending)}
            onClick={() => {
              if (!token) {
                router.push(`/login?next=/markets/${marketId}`);
                return;
              }
              if (following === undefined) return;
              setToggleResolution(undefined);
              toggle.reset();
              toggle.mutate(following);
            }}
          >
            {following === undefined ? <CircleHelp size={18} /> : <Heart size={18} className={following ? "fill-current" : ""} />}
            {followQuery.isLoading ? "확인 중" : followQuery.isError ? "상태 확인 필요" : following ? "팔로잉" : "팔로우"} · {formatFollowerCount(market.follower_count ?? 0)}
          </Button>
        </div>
        {followQuery.error ? (
          <div className="mx-5 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-control border border-status-negative-border bg-status-negative-subtle p-3 text-sm font-bold text-status-negative" role="alert">
            <p>팔로우 상태를 확인하지 못했습니다. {apiErrorMessage(followQuery.error)}</p>
            <Button size="sm" variant="secondary" onClick={() => void followQuery.refetch()}>팔로우 상태 다시 확인</Button>
          </div>
        ) : null}
        {toggle.error ? (
          <div className="mx-5 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-control border border-status-negative-border bg-status-negative-subtle p-3 text-sm font-bold text-status-negative" role="alert">
            <p>마켓 팔로우 상태를 저장하지 못했습니다. {apiErrorMessage(toggle.error)}</p>
            <Button size="sm" variant="secondary" disabled={toggle.isPending} onClick={() => void reconcileToggle()}>상태 확인 후 다시 시도</Button>
          </div>
        ) : null}
        {toggle.isSuccess ? <p className="mx-5 mb-5 rounded-control border border-status-positive-border bg-status-positive-subtle p-3 text-sm font-bold text-status-positive" role="status">마켓 팔로우 상태를 저장했습니다.</p> : null}
        {toggleResolution ? <p className="mx-5 mb-5 rounded-control border border-status-positive-border bg-status-positive-subtle p-3 text-sm font-bold text-status-positive" role="status">{toggleResolution}</p> : null}
      </section>
      <section className="py-8">
        <h2 className="text-xl font-bold">마켓 상품</h2>
        {productsQuery.isLoading ? <p className="mt-5 text-sm text-content-secondary">상품을 불러오는 중입니다.</p> : null}
        {productsQuery.error ? <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-control border border-status-negative-border bg-status-negative-subtle p-4 text-sm font-bold text-status-negative" role="alert"><p>마켓 상품을 불러오지 못했습니다. {apiErrorMessage(productsQuery.error)}</p><Button size="sm" variant="secondary" onClick={() => void productsQuery.refetch()}>상품 다시 불러오기</Button></div> : null}
        {productsQuery.isSuccess && products.length ? <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-4 md:gap-x-5">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : null}
        {productsQuery.isSuccess && !products.length ? <p className="mt-5 rounded-surface border border-border-subtle bg-surface-raised p-8 text-center text-sm text-content-secondary">등록된 상품이 없습니다.</p> : null}
      </section>
    </PageLayout>
  );
}
