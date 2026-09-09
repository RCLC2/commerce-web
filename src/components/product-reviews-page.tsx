"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, BadgeCheck, Camera, ChevronLeft, ChevronRight, Star } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ApiErrorState } from "@/components/api-error-state";
import { queryKeys } from "@/lib/query-keys";
import type { Product, Review, ReviewImage, ReviewSummary } from "@/lib/types";
import { PageHeading } from "./ui/page-heading";
import { SafeImage } from "./safe-image";
import { Button } from "./ui/button";
import { Dialog } from "./ui/overlay";

export function ProductReviewsPage({ productId, initialProduct }: { productId: number; initialProduct?: Product }) {
  const productQuery = useQuery({
    queryKey: queryKeys.product(productId),
    queryFn: () => api.getProduct(productId),
    initialData: initialProduct,
  });
  const reviewsQuery = useQuery({
    queryKey: queryKeys.productReviews(productId),
    queryFn: () => api.getProductReviews(productId),
  });
  const summaryQuery = useQuery({
    queryKey: [...queryKeys.productReviews(productId), "summary"],
    queryFn: () => api.getProductReviewSummary(productId),
  });

  const product = productQuery.data;
  const reviews = reviewsQuery.data ?? [];
  const summary = summaryQuery.data;

  if (!Number.isInteger(productId) || productId <= 0) {
    return <main className="mx-auto max-w-5xl px-4 pb-24 pt-8"><ApiErrorState error={new Error("상품 정보를 찾을 수 없습니다.")} /></main>;
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-8">
      <Link href={`/products/${productId}`} className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-content-secondary hover:text-content-primary">
        <ArrowLeft size={17} aria-hidden="true" /> 상품으로 돌아가기
      </Link>

      <PageHeading
        className="mt-5"
        icon={<Star />}
        eyebrow="구매 후기"
        title="상품 리뷰"
        description={product ? `${product.name}을(를) 구매한 고객들의 후기입니다.` : "구매 고객들의 후기를 모아봤어요."}
      />

      {productQuery.error ? <ApiErrorState className="mt-6" error={productQuery.error} onRetry={() => void productQuery.refetch()} /> : null}

      {summaryQuery.error ? <ApiErrorState className="mt-6" error={summaryQuery.error} onRetry={() => void summaryQuery.refetch()} /> : null}
      {summary ? <ReviewSummaryCard summary={summary} /> : summaryQuery.isLoading ? <div className="mt-7 rounded-feature border border-border-subtle bg-surface-raised p-6 text-sm text-content-secondary">별점 요약을 불러오는 중입니다.</div> : null}

      <section className="mt-8" aria-labelledby="all-reviews-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-action-primary">CUSTOMER VOICE</p>
            <h2 id="all-reviews-title" className="mt-1 text-2xl font-bold">전체 리뷰</h2>
          </div>
          {summary ? <p className="text-sm font-bold text-content-secondary">총 {summary.review_count.toLocaleString("ko-KR")}개</p> : null}
        </div>

        {reviewsQuery.isLoading ? <p className="mt-6 text-sm text-content-secondary">리뷰를 불러오는 중입니다.</p> : null}
        {reviewsQuery.error ? <ApiErrorState className="mt-6" error={reviewsQuery.error} onRetry={() => void reviewsQuery.refetch()} /> : null}
        {!reviewsQuery.isLoading && !reviewsQuery.error ? (
          <div className="mt-5 space-y-4">
            {reviews.length ? reviews.map((review) => <ReviewCard key={review.id} review={review} />) : (
              <div className="rounded-surface border border-border-subtle bg-surface-raised p-10 text-center text-sm text-content-secondary">아직 등록된 리뷰가 없습니다.</div>
            )}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function ReviewSummaryCard({ summary }: { summary: ReviewSummary }) {
  const distribution = [5, 4, 3, 2, 1].map((rating) => ({ rating, count: reviewCount(summary, rating) }));
  const maxCount = Math.max(...distribution.map(({ count }) => count), 1);

  return (
    <section className="mt-7 grid gap-7 rounded-feature border border-border-subtle bg-surface-raised p-5 shadow-card md:grid-cols-[minmax(190px,0.8fr)_1fr] md:p-7" aria-label="별점 요약">
      <div className="flex flex-col justify-center border-b border-border-subtle pb-6 md:border-b-0 md:border-r md:pb-0 md:pr-7">
        <p className="text-sm font-bold text-content-secondary">전체 평점</p>
        <p className="mt-2 text-5xl font-bold tracking-tight text-content-primary">{summary.average_rating.toFixed(1)}</p>
        <div className="mt-3 flex items-center gap-1 text-action-primary" aria-label={`평점 ${summary.average_rating.toFixed(1)}점`}>
          {Array.from({ length: 5 }, (_, index) => <Star key={index} size={18} className={index < Math.round(summary.average_rating) ? "fill-brand" : "text-border-strong"} aria-hidden="true" />)}
        </div>
        <p className="mt-3 text-sm text-content-secondary">리뷰 {summary.review_count.toLocaleString("ko-KR")}개</p>
        <p className="mt-1 flex items-center gap-1 text-xs font-bold text-content-secondary"><Camera size={14} aria-hidden="true" /> 포토 리뷰 {(summary.photo_review_count ?? 0).toLocaleString("ko-KR")}개</p>
      </div>

      <div className="space-y-3" aria-label="별점 분포">
        {distribution.map(({ rating, count }) => (
          <div key={rating} className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center gap-3 text-sm">
            <span className="font-bold text-content-secondary">{rating}점</span>
            <div className="h-2 overflow-hidden rounded-full bg-surface-subtle" role="progressbar" aria-label={`${rating}점 리뷰 비율`} aria-valuemin={0} aria-valuemax={maxCount} aria-valuenow={count}>
              <div className="h-full rounded-full bg-action-primary transition-all" style={{ width: `${(count / maxCount) * 100}%` }} />
            </div>
            <span className="text-right text-xs text-content-secondary">{count.toLocaleString("ko-KR")}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const reviewImages = review.images ?? [];
  const hasReviewImages = reviewImages.some((image) => reviewImageURL(image));

  return (
    <article className="rounded-surface border border-border-subtle bg-surface-raised p-5 shadow-card md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-action-secondary text-xs font-bold text-action-primary">
            {(review.reviewer_name ?? "구매자").slice(-4, -2)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{review.reviewer_name ?? "구매자"}</p>
            <p className="mt-0.5 text-xs text-content-secondary">{review.created_at ? new Date(review.created_at).toLocaleDateString("ko-KR") : "작성일 미제공"}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-action-primary" aria-label={`평점 ${review.rating.toFixed(1)}점`}>
          <Star size={15} className="fill-brand" aria-hidden="true" />
          <span className="text-sm font-bold">{review.rating.toFixed(1)}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
        {review.verified_purchase ? <span className="inline-flex items-center gap-1 rounded-full bg-status-positive-subtle px-2 py-1 font-bold text-status-positive"><BadgeCheck size={13} aria-hidden="true" /> 구매 인증</span> : null}
        {review.option?.value ? <span className="rounded-full bg-surface-subtle px-2 py-1 font-bold text-content-secondary">{review.option.name}: {review.option.value}</span> : null}
        {review.height_at_time ? <span className="rounded-full bg-surface-subtle px-2 py-1 text-content-secondary">{review.height_at_time}cm</span> : null}
        {review.weight_at_time ? <span className="rounded-full bg-surface-subtle px-2 py-1 text-content-secondary">{review.weight_at_time}kg</span> : null}
      </div>

      <div className={`mt-4 ${hasReviewImages ? "grid gap-4 md:grid-cols-[1fr_220px]" : ""}`}>
        <p className="whitespace-pre-wrap text-sm leading-7 text-content-secondary">{review.content}</p>
        {hasReviewImages ? <ReviewImageGallery images={reviewImages} /> : null}
      </div>
    </article>
  );
}

function reviewImageURL(image: ReviewImage) {
  return image.detail_url || image.url || image.thumbnail_url;
}

function ReviewImageGallery({ images }: { images: ReviewImage[] }) {
  const availableImages = images.filter((image) => reviewImageURL(image));
  const [activeIndex, setActiveIndex] = useState(0);
  const [open, setOpen] = useState(false);
  if (!availableImages.length) return null;

  const safeIndex = Math.min(activeIndex, availableImages.length - 1);
  const activeImage = availableImages[safeIndex];
  const activeURL = reviewImageURL(activeImage);
  function moveImage(delta: number) {
    setActiveIndex((current) => (current + delta + availableImages.length) % availableImages.length);
  }

  return (
    <>
      <div className="grid gap-2">
        <button
          type="button"
          className="relative aspect-[4/3] min-h-32 overflow-hidden rounded-control bg-surface-subtle text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-primary"
          onClick={() => setOpen(true)}
          aria-label={`리뷰 사진 ${safeIndex + 1} 크게 보기`}
        >
          <SafeImage src={activeURL} alt="리뷰 첨부 이미지" fill sizes="(max-width: 768px) 100vw, 220px" className="object-cover" />
          {availableImages.length > 1 ? <span className="absolute bottom-2 right-2 rounded-full bg-black/65 px-2.5 py-1 text-xs font-bold text-content-inverse">{safeIndex + 1} / {availableImages.length}</span> : null}
        </button>
        {availableImages.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="리뷰 첨부 사진 목록">
            {availableImages.map((image, index) => (
              <button
                key={image.id}
                type="button"
                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-control border-2 ${index === safeIndex ? "border-action-primary" : "border-transparent"}`}
                onClick={() => setActiveIndex(index)}
                aria-label={`${index + 1}번 리뷰 사진 보기`}
                aria-pressed={index === safeIndex}
              >
                <SafeImage src={reviewImageURL(image)} alt="" fill sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <Dialog open={open} onClose={() => setOpen(false)} title="리뷰 첨부 사진" description={`${safeIndex + 1} / ${availableImages.length}`} className="max-w-3xl">
        <div className="relative aspect-square overflow-hidden rounded-control bg-surface-subtle sm:aspect-[4/3]">
          <SafeImage src={activeURL} alt="리뷰 첨부 이미지 크게 보기" fill sizes="(max-width: 640px) 100vw, 768px" className="object-contain" />
          {availableImages.length > 1 ? (
            <>
              <Button variant="secondary" size="icon" className="absolute left-3 top-1/2 -translate-y-1/2" onClick={() => moveImage(-1)} aria-label="이전 리뷰 사진"><ChevronLeft size={20} /></Button>
              <Button variant="secondary" size="icon" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => moveImage(1)} aria-label="다음 리뷰 사진"><ChevronRight size={20} /></Button>
            </>
          ) : null}
        </div>
        {availableImages.length > 1 ? (
          <div className="mt-4 flex items-center justify-between gap-3">
            <Button variant="secondary" size="sm" onClick={() => moveImage(-1)}><ChevronLeft size={16} /> 이전</Button>
            <span className="text-sm font-bold text-content-secondary">{safeIndex + 1} / {availableImages.length}</span>
            <Button variant="secondary" size="sm" onClick={() => moveImage(1)}>다음 <ChevronRight size={16} /></Button>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}

function reviewCount(summary: ReviewSummary, rating: number) {
  const distribution = summary.rating_distribution;
  if (!distribution) return 0;
  return distribution[String(rating)] ?? distribution[`${rating}.0`] ?? distribution[rating.toFixed(1)] ?? 0;
}
