"use client";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useSessionStore } from "@/lib/session-store";
import { SafeImage } from "./safe-image";
import { Button } from "./ui/button";

export function MyReviewsPage() {
  const token = useSessionStore((state) => state.accessToken) ?? "";
  const queryClient = useQueryClient();
  const [editingID, setEditingID] = useState<number | null>(null);
  const [draft, setDraft] = useState({ rating_x2: 10, content: "" });
  const reviewsKey = queryKeys.myReviews(token);
  const reviews = useQuery({ queryKey: reviewsKey, queryFn: () => api.listMyReviews(token), enabled: Boolean(token) });
  const items = reviews.data ?? [];
  const productIDs = [...new Set(items.map((review) => review.product_id))];
  const products = useQueries({ queries: productIDs.map((id) => ({ queryKey: ["product", id], queryFn: () => api.getProduct(id) })) });
  const byID = new Map(products.flatMap((query, index) => query.data ? [[productIDs[index], query.data] as const] : []));

  const update = useMutation({
    mutationFn: ({ id }: { id: number }) => api.updateReview(token, id, draft),
    onSuccess: async (updated) => {
      queryClient.setQueryData<typeof items>(reviewsKey, (current) => current?.map((review) => review.id === updated.id ? updated : review));
      setEditingID(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: reviewsKey }),
        queryClient.invalidateQueries({ queryKey: queryKeys.productReviews(updated.product_id) }),
      ]);
    },
  });
  const remove = useMutation({
    mutationFn: ({ id }: { id: number; productID: number }) => api.deleteReview(token, id),
    onSuccess: async (_, { id, productID }) => {
      queryClient.setQueryData<typeof items>(reviewsKey, (current) => current?.filter((review) => review.id !== id));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: reviewsKey }),
        queryClient.invalidateQueries({ queryKey: queryKeys.productReviews(productID) }),
      ]);
    },
  });

  if (!token) return <main className="mx-auto max-w-3xl px-4 py-16"><h1 className="text-2xl font-black">내 리뷰</h1><Link href="/login?next=/mypage/reviews"><Button className="mt-5">로그인하기</Button></Link></main>;

  return (
    <main className="mx-auto max-w-4xl px-4 pb-24 pt-8">
      <Link href="/mypage" className="inline-flex items-center gap-1 text-sm font-bold text-muted hover:text-foreground"><ArrowLeft size={17} /> 뒤로가기</Link>
      <h1 className="mt-5 text-2xl font-black">리뷰 관리</h1>
      <p className="mt-1 text-sm text-muted">작성한 리뷰를 확인하고 수정하거나 삭제할 수 있습니다.</p>
      {reviews.error ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-md bg-red-50 p-4 text-sm font-bold text-brand">
          <p>리뷰를 불러오지 못했습니다. {apiErrorMessage(reviews.error)}</p>
          <Button size="sm" variant="secondary" onClick={() => void reviews.refetch()}>다시 불러오기</Button>
        </div>
      ) : null}
      {reviews.isLoading ? <p className="mt-6 text-sm text-muted">리뷰를 불러오는 중입니다.</p> : null}
      {remove.error ? <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-red-50 p-4 text-sm font-bold text-brand"><p>리뷰를 삭제하지 못했습니다. {apiErrorMessage(remove.error)}</p><Button size="sm" variant="secondary" disabled={remove.isPending || remove.variables === undefined} onClick={() => { if (remove.variables !== undefined) remove.mutate(remove.variables); }}>삭제 다시 시도</Button></div> : null}
      {remove.isSuccess ? <p className="mt-4 rounded-md bg-emerald-50 p-4 text-sm font-bold text-emerald-900">리뷰를 삭제했습니다.</p> : null}
      {update.isSuccess ? <p className="mt-4 rounded-md bg-emerald-50 p-4 text-sm font-bold text-emerald-900">리뷰를 수정했습니다.</p> : null}
      <div className="mt-6 space-y-3">
        {items.map((review) => {
          const product = byID.get(review.product_id);
          const editing = editingID === review.id;
          return (
            <article key={review.id} className="rounded-2xl border border-line bg-white p-4">
              <div className="flex gap-3">
                <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md bg-zinc-100"><SafeImage src={product?.image_url} alt="" fill sizes="64px" className="object-cover" /></div>
                <div className="min-w-0 flex-1">
                  <Link href={`/products/${review.product_id}`} className="truncate font-black hover:underline">{product?.name ?? `상품 #${review.product_id}`}</Link>
                  {editing ? (
                    <div className="mt-3 space-y-3">
                      <select className="h-10 rounded-md border border-line bg-white px-3 text-sm" value={draft.rating_x2} onChange={(event) => setDraft((value) => ({ ...value, rating_x2: Number(event.target.value) }))}>
                        {[10, 8, 6, 4, 2].map((value) => <option key={value} value={value}>{value / 2}점</option>)}
                      </select>
                      <textarea className="min-h-24 w-full rounded-md border border-line p-3 text-sm" value={draft.content} onChange={(event) => setDraft((value) => ({ ...value, content: event.target.value }))} />
                      {update.error ? <p className="text-sm font-bold text-brand">리뷰를 수정하지 못했습니다. {apiErrorMessage(update.error)}</p> : null}
                      <div className="flex gap-2"><Button size="sm" disabled={update.isPending} onClick={() => update.mutate({ id: review.id })}>{update.isPending ? "저장 중" : "저장"}</Button><Button size="sm" variant="secondary" disabled={update.isPending} onClick={() => setEditingID(null)}>취소</Button></div>
                    </div>
                  ) : (
                    <>
                      <p className="mt-2 flex items-center gap-1 text-sm font-black"><Star size={15} className="fill-amber-400 text-amber-400" /> {review.rating.toFixed(1)}</p>
                      <p className="mt-2 text-sm leading-6">{review.content}</p>
                      <div className="mt-3 flex gap-3 text-xs font-bold"><button disabled={update.isPending || remove.isPending} onClick={() => { remove.reset(); update.reset(); setEditingID(review.id); setDraft({ rating_x2: review.rating_x2 ?? Math.round(review.rating * 2), content: review.content }); }}>수정</button><button className="text-brand" disabled={update.isPending || remove.isPending} onClick={() => { update.reset(); remove.reset(); remove.mutate({ id: review.id, productID: review.product_id }); }}>{remove.isPending && remove.variables?.id === review.id ? "삭제 중" : "삭제"}</button></div>
                    </>
                  )}
                </div>
              </div>
            </article>
          );
        })}
        {reviews.isSuccess && !items.length ? <p className="rounded-md border border-line bg-white p-8 text-center text-sm text-muted">작성한 리뷰가 없습니다.</p> : null}
      </div>
    </main>
  );
}
