"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { getEffectiveToken } from "@/lib/auth-token";
import { queryKeys } from "@/lib/query-keys";
import { useSessionStore } from "@/lib/session-store";
import { cn } from "@/lib/utils";
import type { Review } from "@/lib/types";
import { Button } from "./ui/button";

export function MyReviewsPage() {
  const queryClient = useQueryClient();
  const token = useSessionStore((state) => state.accessToken);
  const effectiveToken = getEffectiveToken(token) ?? "";
  const [editingID, setEditingID] = useState<number | null>(null);
  const [editRatingX2, setEditRatingX2] = useState(10);
  const [editContent, setEditContent] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Review | null>(null);

  const { data: reviews = [], isLoading, isError, error } = useQuery({
    queryKey: queryKeys.myReviews(effectiveToken),
    queryFn: () => api.listMyReviews(effectiveToken),
    enabled: Boolean(effectiveToken),
  });

  const updateReview = useMutation({
    mutationFn: (reviewID: number) =>
      api.updateReview(effectiveToken, reviewID, {
        rating_x2: editRatingX2,
        content: editContent,
      }),
    onSuccess: async (review) => {
      setEditingID(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.myReviews(effectiveToken) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.productReviews(review.product_id) }),
      ]);
    },
  });

  const deleteReview = useMutation({
    mutationFn: (review: Review) => api.deleteReview(effectiveToken, review.id).then(() => review),
    onSuccess: async (review) => {
      setPendingDelete(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.myReviews(effectiveToken) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.productReviews(review.product_id) }),
      ]);
    },
  });

  if (!token) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-black">내 리뷰</h1>
        <p className="mt-2 text-sm text-muted">작성한 리뷰를 관리하려면 로그인해주세요.</p>
        <Link href="/login">
          <Button className="mt-5">로그인하기</Button>
        </Link>
      </main>
    );
  }

  const startEdit = (review: Review) => {
    setEditingID(review.id);
    setEditRatingX2(review.rating_x2 ?? Math.round(review.rating * 2));
    setEditContent(review.content);
  };

  return (
    <main className="mx-auto max-w-4xl px-4 pb-24 pt-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">내 리뷰</h1>
          <p className="mt-1 text-sm text-muted">{reviews.length}개의 리뷰를 관리하고 있습니다.</p>
        </div>
        <Link href="/mypage">
          <Button variant="secondary">마이페이지</Button>
        </Link>
      </div>

      {isLoading ? <p className="mt-8 text-sm text-muted">리뷰를 불러오는 중입니다.</p> : null}
      {isError ? <p className="mt-8 rounded-md border border-line bg-white p-4 text-sm font-bold text-brand">{error.message}</p> : null}
      {updateReview.isError ? <p className="mt-4 text-sm font-bold text-brand">{updateReview.error.message}</p> : null}
      {deleteReview.isError ? <p className="mt-4 text-sm font-bold text-brand">{deleteReview.error.message}</p> : null}

      {!isLoading && !isError && reviews.length === 0 ? (
        <section className="mt-8 rounded-md border border-line bg-white p-6 text-sm text-muted">
          <p>아직 작성한 리뷰가 없습니다.</p>
          <Link href="/mypage" className="mt-3 inline-flex text-sm font-bold text-foreground underline">
            마이페이지로 이동
          </Link>
        </section>
      ) : null}

      <section className="mt-6 space-y-3">
        {reviews.map((review) => {
          const isEditing = editingID === review.id;
          const images = review.images?.filter((image) => getReviewImageURL(image)) ?? [];

          return (
            <article key={review.id} className="rounded-md border border-line bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/products/${review.product_id}`} className="text-sm font-black hover:underline">
                    상품 #{review.product_id}
                  </Link>
                  <p className="mt-1 text-xs text-muted">
                    {review.created_at ? new Date(review.created_at).toLocaleDateString("ko-KR") : "-"}
                    {review.order_line_item_id ? ` · 주문 상품 #${review.order_line_item_id}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => (isEditing ? setEditingID(null) : startEdit(review))}>
                    {isEditing ? "취소" : "수정"}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`리뷰 ${review.id} 삭제`}
                    disabled={deleteReview.isPending}
                    onClick={() => setPendingDelete(review)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>

              {isEditing ? (
                <form
                  className="mt-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (editContent.trim()) {
                      updateReview.mutate(review.id);
                    }
                  }}
                >
                  <div className="flex items-center gap-1" aria-label="수정 평점">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button
                        key={score}
                        type="button"
                        className="rounded-md p-1 text-brand transition hover:bg-zinc-50"
                        aria-label={`수정 ${score}점`}
                        onClick={() => setEditRatingX2(score * 2)}
                      >
                        <Star size={19} className={cn(score * 2 <= editRatingX2 && "fill-brand")} />
                      </button>
                    ))}
                  </div>
                  <label htmlFor={`review-${review.id}-content`} className="sr-only">
                    리뷰 수정 내용
                  </label>
                  <textarea
                    id={`review-${review.id}-content`}
                    className="mt-3 min-h-28 w-full resize-none rounded-md border border-line px-3 py-3 text-sm leading-6 outline-none focus:border-foreground"
                    value={editContent}
                    onChange={(event) => setEditContent(event.target.value)}
                  />
                  <div className="mt-3 flex justify-end">
                    <Button size="sm" type="submit" disabled={!editContent.trim() || updateReview.isPending}>
                      {updateReview.isPending ? "저장 중" : "저장"}
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="mt-3 flex items-center gap-1 text-brand" aria-label={`평점 ${review.rating}점`}>
                    {Array.from({ length: Math.round(review.rating) }).map((_, index) => (
                      <Star key={index} size={15} className="fill-brand" />
                    ))}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-zinc-700">{review.content}</p>
                </>
              )}

              {images.length ? (
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {images.map((image, index) => (
                    <div key={image.id} className="aspect-square overflow-hidden rounded-md border border-line bg-zinc-100">
                      <div
                        className="h-full w-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${getReviewImageURL(image)})` }}
                        role="img"
                        aria-label={`내 리뷰 이미지 ${index + 1}`}
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </section>

      {pendingDelete ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 px-4 py-6 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="delete-review-title">
          <div className="w-full max-w-sm rounded-md bg-white p-5 shadow-lg">
            <h2 id="delete-review-title" className="text-lg font-black">리뷰를 삭제할까요?</h2>
            <p className="mt-2 text-sm leading-6 text-muted">삭제한 리뷰는 목록과 상품 상세에서 사라집니다.</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setPendingDelete(null)} disabled={deleteReview.isPending}>
                취소
              </Button>
              <Button type="button" onClick={() => deleteReview.mutate(pendingDelete)} disabled={deleteReview.isPending}>
                {deleteReview.isPending ? "삭제 중" : "삭제"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function getReviewImageURL(image: { thumbnail_url?: string; detail_url?: string; url?: string }) {
  return image.thumbnail_url ?? image.detail_url ?? image.url ?? null;
}
