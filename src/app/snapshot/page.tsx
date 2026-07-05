"use client";

import { useQuery } from "@tanstack/react-query";
import { Camera, ExternalLink, Gift } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { TrendPost } from "@/lib/types";
import { SafeImage } from "@/components/safe-image";

export default function Snapshot() {
  const { data: posts = [], isLoading, error } = useQuery({
    queryKey: ["trend-posts"],
    queryFn: api.listTrendPosts,
  });
  const totalRewards = posts.reduce((sum, post) => sum + post.reward_points, 0);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-black">트렌드관</h1>
          <p className="mt-1 text-sm text-muted">주문 후 SNS에 남긴 스타일 콘텐츠를 모아 보여드립니다.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm md:w-72">
          <div className="rounded-md border border-line bg-white p-3">
            <p className="text-xs font-bold text-muted">게시물</p>
            <p className="mt-1 text-xl font-black">{posts.length}개</p>
          </div>
          <div className="rounded-md border border-line bg-white p-3">
            <p className="text-xs font-bold text-muted">지급 포인트</p>
            <p className="mt-1 text-xl font-black">{totalRewards.toLocaleString("ko-KR")}P</p>
          </div>
        </div>
      </div>

      <section className="mt-6 rounded-md border border-line bg-white p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <RewardRule title="태그" points="100P" description="#태그로 구매 스타일을 공유" />
          <RewardRule title="언급" points="150P" description="계정 언급으로 더 명확한 인증" />
          <RewardRule title="주문 연동" points="검수" description="플랫폼 주문 기반 콘텐츠만 노출" />
        </div>
      </section>

      {error ? <p className="mt-6 rounded-md border border-line bg-white p-4 text-sm text-brand">{error.message}</p> : null}
      {isLoading ? <p className="mt-6 text-sm text-muted">트렌드 게시물을 불러오는 중입니다.</p> : null}
      {!isLoading && !posts.length ? <div className="mt-6 rounded-md border border-line bg-white p-8 text-center text-sm font-bold text-muted">아직 노출할 트렌드 게시물이 없습니다.</div> : null}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => <TrendCard key={post.id} post={post} />)}
      </section>
    </main>
  );
}

function RewardRule({ title, points, description }: { title: string; points: string; description: string }) {
  return (
    <div className="rounded-md bg-zinc-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-black">{title}</p>
        <span className="rounded-sm bg-brand px-2 py-1 text-xs font-black text-white">{points}</span>
      </div>
      <p className="mt-2 text-sm text-muted">{description}</p>
    </div>
  );
}

function TrendCard({ post }: { post: TrendPost }) {
  const tags = (post.tags ?? "").split(",").map((tag) => tag.trim()).filter(Boolean);

  return (
    <article className="overflow-hidden rounded-md border border-line bg-white">
      <Link href={post.sns_url} target="_blank" className="group block">
        <div className="relative aspect-[4/5] bg-zinc-100">
          <SafeImage src={post.media_url} alt={post.caption ?? "trend post"} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover transition duration-300 group-hover:scale-[1.03]" />
          <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-3 py-1 text-xs font-black text-white">
            <Camera size={14} />
            {post.platform}
          </div>
        </div>
      </Link>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-muted">{post.order_code}</p>
            <h2 className="mt-1 line-clamp-2 min-h-10 font-black leading-5">{post.caption || "SNS 스타일 포스트"}</h2>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-zinc-100 px-2 py-1 text-xs font-black text-zinc-700">
            <Gift size={14} />
            {post.reward_points}P
          </span>
        </div>
        {tags.length ? <div className="mt-3 flex flex-wrap gap-1">{tags.slice(0, 4).map((tag) => <span key={tag} className="rounded-sm bg-zinc-100 px-2 py-1 text-xs font-bold text-zinc-600">#{tag}</span>)}</div> : null}
        <Link href={post.sns_url} target="_blank" className="mt-4 inline-flex items-center gap-1 text-sm font-black text-brand">
          SNS에서 보기
          <ExternalLink size={14} />
        </Link>
      </div>
    </article>
  );
}