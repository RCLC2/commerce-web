"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, Gift, Sparkles } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-client";
import type { ResolvedHomeCard } from "@/lib/api/home-placements";
import { queryKeys } from "@/lib/query-keys";
import { SponsoredDecision } from "./advertising/sponsored-placement";
import { SafeImage } from "./safe-image";
import { Button } from "./ui/button";

export function HomeContextTextCard({
  card,
  token,
  memberID,
}: {
  card?: ResolvedHomeCard;
  token?: string | null;
  memberID?: number | null;
}) {
  const queryClient = useQueryClient();
  const couponID = card?.source === "PLATFORM" ? card.coupon_id : undefined;
  const issue = useMutation({
    mutationFn: () => {
      if (!token || !couponID) throw new Error("로그인 후 쿠폰을 받을 수 있습니다.");
      return api.issueCoupon(token, couponID);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.homePlacements(memberID) }),
        queryClient.invalidateQueries({ queryKey: ["pdp-review-banner"] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.coupons(memberID) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.issuableCoupons(memberID) }),
      ]);
    },
  });

  if (!card || card.source !== "PLATFORM") return null;
  const isCoupon = card.card_type === "SIGNUP_COUPON" || card.card_type === "FIRST_PURCHASE_COUPON";
  const content = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-action-primary/10 text-action-primary">
        {isCoupon ? <Gift size={18} /> : <Sparkles size={18} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">{card.headline}</span>
        {card.body ? <span className="mt-0.5 block truncate text-xs text-content-secondary">{card.body}</span> : null}
      </span>
    </>
  );

  return (
    <section className="py-3" aria-label="회원 맞춤 혜택">
      <div className="flex min-h-16 items-center gap-3 rounded-xl border border-action-primary/15 bg-gradient-to-r from-action-secondary to-surface-raised px-4 py-3">
        {card.landing_url && !isCoupon ? (
          <Link href={card.landing_url} className="flex min-w-0 flex-1 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand">
            {content}
          </Link>
        ) : <div className="flex min-w-0 flex-1 items-center gap-3">{content}</div>}
        {isCoupon ? (
          <Button size="sm" onClick={() => issue.mutate()} disabled={issue.isPending || issue.isSuccess}>
            {issue.isSuccess ? <><Check size={15} /> 발급됨</> : issue.isPending ? "발급 중" : card.cta_label ?? "쿠폰 받기"}
          </Button>
        ) : card.landing_url ? (
          <Link href={card.landing_url} aria-label={`${card.headline} 보기`} className="shrink-0 rounded-full p-2 text-action-primary hover:bg-action-primary/10">
            <ArrowRight size={18} />
          </Link>
        ) : null}
      </div>
      {issue.isError ? <p className="mt-1 px-1 text-xs font-bold text-action-primary">{apiErrorMessage(issue.error)}</p> : null}
    </section>
  );
}

export function HomeFeatureCard({
  card,
  token,
  memberID,
  compact = false,
}: {
  card?: ResolvedHomeCard;
  token?: string | null;
  memberID?: number | null;
  compact?: boolean;
}) {
  if (!card) return null;
  if (card.source === "AD") {
    return <SponsoredDecision decision={card.decision} token={token} />;
  }
  if (!card.image_url) return <HomeContextTextCard card={card} token={token} memberID={memberID} />;

  const visual = (
    <article className={`relative overflow-hidden rounded-surface bg-content-primary text-content-inverse shadow-card ${compact ? "h-36 md:h-44" : "h-44 md:h-56"}`}>
      <SafeImage src={card.image_url} alt={card.headline ?? "홈 이벤트"} fill sizes="(max-width: 768px) 100vw, 1152px" className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/35 to-transparent" />
      <div className="absolute inset-0 flex items-end p-5 md:items-center md:p-7">
        <div className="max-w-xl pr-10">
          <p className="text-xs font-bold tracking-normal text-content-inverse/75">회원 이벤트</p>
          <h2 className="mt-1 line-clamp-2 text-xl font-bold md:text-3xl">{card.headline}</h2>
          {card.body ? <p className="mt-1 line-clamp-2 text-sm text-content-inverse/85">{card.body}</p> : null}
          {card.cta_label ? <span className="mt-3 inline-flex rounded-full bg-surface-raised px-3 py-1.5 text-xs font-bold text-content-primary">{card.cta_label}</span> : null}
        </div>
      </div>
    </article>
  );

  return card.landing_url ? <Link href={card.landing_url}>{visual}</Link> : visual;
}

export function PDPReviewBanner({
  card,
  token,
  memberID,
}: {
  card?: ResolvedHomeCard;
  token?: string | null;
  memberID?: number | null;
}) {
  if (!card) return null;
  return (
    <section className="py-6" aria-label="리뷰 아래 추천 배너">
      <HomeFeatureCard card={card} token={token} memberID={memberID} compact />
    </section>
  );
}
