"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useSessionStore } from "@/lib/session-store";
import { ProductCard } from "./product-card";
import { SafeImage } from "./safe-image";
import { Button } from "./ui/button";

export function MarketPage({ marketId }: { marketId: number }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useSessionStore((state) => state.accessToken) ?? "";
  const marketQuery = useQuery({ queryKey: ["market", marketId], queryFn: () => api.getMarket(marketId) });
  const productsQuery = useQuery({ queryKey: ["market-products", marketId], queryFn: () => api.listPLPProducts({ marketId }) });
  const followQuery = useQuery({ queryKey: ["market-follow", marketId, token], queryFn: () => api.getMarketFollowStatus(token, marketId), enabled: Boolean(token) });
  const following = followQuery.data?.following ?? false;
  const toggle = useMutation({
    mutationFn: () => following ? api.unfollowMarket(token, marketId) : api.followMarket(token, marketId),
    onSuccess: () => {
      queryClient.setQueryData(["market-follow", marketId, token], { following: !following });
      queryClient.setQueryData(["market", marketId], (current: typeof marketQuery.data) => current ? { ...current, follower_count: Math.max(0, (current.follower_count ?? 0) + (following ? -1 : 1)) } : current);
    },
  });

  const market = marketQuery.data;
  const products = productsQuery.data?.items ?? [];
  if (marketQuery.isLoading || productsQuery.isLoading) return <main className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted">마켓을 불러오는 중입니다.</main>;
  if (marketQuery.error || productsQuery.error || !market) return <main className="mx-auto max-w-6xl px-4 py-16"><div className="rounded-md border border-red-200 bg-red-50 p-8 text-center"><h1 className="text-xl font-black text-red-900">마켓을 불러오지 못했습니다.</h1></div></main>;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24">
      <section className="overflow-hidden rounded-md border border-line bg-white">
        <div className="relative h-56 bg-zinc-100 md:h-72"><SafeImage src={market.cover_image_url} alt={market.name} fill sizes="100vw" className="object-cover" /></div>
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-end md:justify-between">
          <div className="flex gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-line bg-zinc-100"><SafeImage src={market.profile_image_url} alt="" fill sizes="80px" className="object-cover" /></div>
            <div><div className="flex items-center gap-2"><Store size={18} className="text-brand" /><h1 className="text-2xl font-black">{market.name}</h1></div><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{market.description}</p></div>
          </div>
          <Button variant={following ? "primary" : "secondary"} disabled={toggle.isPending} onClick={() => { if (!token) { router.push(`/login?next=/markets/${marketId}`); return; } toggle.mutate(); }}>
            <Heart size={18} className={following ? "fill-current" : ""} /> {following ? "팔로잉" : "팔로우"} · {market.follower_count?.toLocaleString("ko-KR") ?? 0}
          </Button>
        </div>
      </section>
      <section className="py-8"><h2 className="text-xl font-black">마켓 상품</h2><div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-4 md:gap-x-5">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div></section>
    </main>
  );
}
