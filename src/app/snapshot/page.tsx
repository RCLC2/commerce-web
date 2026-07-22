"use client";

import { useEffect, useMemo, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Camera, ExternalLink, Hash } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { InstagramTrendItem } from "@/lib/types";
import { SafeImage } from "@/components/safe-image";

const HASHTAG = "COMMERCE";
const PAGE_SIZE = 12;

export default function Snapshot() {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["instagram-trends", HASHTAG],
    initialPageParam: "",
    queryFn: ({ pageParam }) => api.listTrendPosts({ hashtag: HASHTAG, limit: PAGE_SIZE, after: pageParam || undefined }),
    getNextPageParam: (lastPage) => (lastPage.paging.has_next ? lastPage.paging.next_cursor ?? "" : undefined),
  });
  const items = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }, { rootMargin: "500px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-black">트렌드관</h1>
          <p className="mt-1 text-sm text-muted">인스타그램에서 #{HASHTAG} 해시태그가 달린 피드와 스토리를 모아 보여드립니다.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-black text-foreground md:self-start">
          <Hash size={16} />
          {HASHTAG}
        </div>
      </div>

      {error ? <p className="mt-6 rounded-md border border-line bg-white p-4 text-sm text-brand">{error.message}</p> : null}
      {isLoading ? <p className="mt-6 text-sm text-muted">인스타그램 트렌드를 불러오는 중입니다.</p> : null}
      {!isLoading && !items.length ? <div className="mt-6 rounded-md border border-line bg-white p-8 text-center text-sm font-bold text-muted">아직 노출할 인스타그램 콘텐츠가 없습니다.</div> : null}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => <TrendCard key={item.id} item={item} />)}
      </section>
      <div ref={sentinelRef} className="h-12" />
      {isFetchingNextPage ? <p className="text-center text-sm font-bold text-muted">다음 트렌드를 불러오는 중입니다.</p> : null}
    </main>
  );
}

function TrendCard({ item }: { item: InstagramTrendItem }) {
  const tags = item.tags ?? [];

  return (
    <article className="overflow-hidden rounded-md border border-line bg-white">
      <Link href={item.sns_url} target="_blank" className="group block">
        <div className="relative aspect-[4/5] bg-zinc-100">
          <SafeImage src={item.media_url} alt={item.caption ?? "instagram trend"} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover transition duration-300 group-hover:scale-[1.03]" />
          <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-3 py-1 text-xs font-black text-white">
            <Camera size={14} />
            {item.content_type}
          </div>
        </div>
      </Link>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-muted">@{item.username || "instagram"}</p>
            <h2 className="mt-1 line-clamp-2 min-h-10 font-black leading-5">{item.caption || "Instagram trend post"}</h2>
          </div>
          <span className="inline-flex shrink-0 rounded-md bg-zinc-100 px-2 py-1 text-xs font-black text-zinc-700">{item.platform}</span>
        </div>
        {tags.length ? <div className="mt-3 flex flex-wrap gap-1">{tags.slice(0, 4).map((tag) => <span key={tag} className="rounded-sm bg-zinc-100 px-2 py-1 text-xs font-bold text-zinc-600">#{tag}</span>)}</div> : null}
        <Link href={item.sns_url} target="_blank" className="mt-4 inline-flex items-center gap-1 text-sm font-black text-brand">
          인스타그램에서 보기
          <ExternalLink size={14} />
        </Link>
      </div>
    </article>
  );
}