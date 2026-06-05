"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Heart, Minus, Plus, ShoppingBag, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { getEffectiveToken } from "@/lib/auth-token";
import { resolveProductDetailHtml } from "@/lib/product-detail-html";
import { queryKeys } from "@/lib/query-keys";
import { useSessionStore } from "@/lib/session-store";
import { discountRate, formatPrice } from "@/lib/utils";
import { SafeImage } from "./safe-image";
import { Button } from "./ui/button";

export function ProductDetailPage({ productId }: { productId: number }) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [optionID, setOptionID] = useState<number | null>(null);
  const [liked, setLiked] = useState(false);
  const token = useSessionStore((state) => state.accessToken);
  const { data: product, isLoading } = useQuery({
    queryKey: queryKeys.product(productId),
    queryFn: () => api.getProduct(productId),
  });
  const { data: reviews = [] } = useQuery({
    queryKey: queryKeys.productReviews(productId),
    queryFn: () => api.getProductReviews(productId),
  });

  const effectiveToken = getEffectiveToken(token);
  const selectedOption = useMemo(
    () => product?.options?.find((option) => option.id === optionID) ?? product?.options?.[0],
    [optionID, product?.options],
  );

  const addCart = useMutation({
    mutationFn: () =>
      api.addCartItem(effectiveToken ?? "", {
        product_id: productId,
        option_id: selectedOption?.id ?? 0,
        quantity,
      }),
  });

  if (isLoading || !product) {
    return <main className="mx-auto max-w-6xl px-4 py-8">상품을 불러오는 중입니다.</main>;
  }

  const price = product.discount_price || product.base_price;
  const saleRate = discountRate(product.base_price, product.discount_price);
  const detailHtml = resolveProductDetailHtml(product);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 md:pt-8">
      <div className="grid gap-8 md:grid-cols-[1fr_420px]">
        <section className="space-y-3">
          <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-zinc-100 md:aspect-[5/6]">
            <SafeImage src={product.image_url} alt={product.name} fill sizes="(max-width: 768px) 100vw, 55vw" className="object-cover" priority />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="aspect-square rounded-md bg-zinc-100" />
            ))}
          </div>
          <section className="rounded-md border border-line bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-black">리뷰</h2>
              <span className="text-sm font-bold text-muted">{reviews.length}개</span>
            </div>
            <div className="mt-4 space-y-4">
              {reviews.length ? (
                reviews.map((review) => (
                  <article key={review.id} className="border-t border-line pt-4 first:border-t-0 first:pt-0">
                    <div className="flex items-center gap-1 text-sm font-bold text-brand">
                      {Array.from({ length: review.rating }).map((_, index) => (
                        <Star key={index} size={14} className="fill-brand" />
                      ))}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-zinc-700">{review.content}</p>
                  </article>
                ))
              ) : (
                <p className="text-sm text-muted">아직 등록된 리뷰가 없습니다.</p>
              )}
            </div>
          </section>
        </section>

        <aside className="md:sticky md:top-24 md:h-fit">
          <div className="border-b border-line pb-5">
            <p className="text-sm font-bold text-muted">{product.market_name ?? `마켓 ${product.market_id}`}</p>
            <h1 className="mt-2 text-2xl font-black leading-tight">{product.name}</h1>
            <div className="mt-3 flex items-center gap-1 text-sm text-zinc-600">
              <Star size={16} className="fill-brand text-brand" />
              <span className="font-bold">4.8</span>
              <span>리뷰 1,284</span>
            </div>
            <div className="mt-5 flex items-baseline gap-2">
              {saleRate > 0 ? <span className="text-2xl font-black text-brand">{saleRate}%</span> : null}
              <span className="text-3xl font-black">{formatPrice(price)}</span>
            </div>
            {saleRate > 0 ? <p className="mt-1 text-sm text-muted line-through">{formatPrice(product.base_price)}</p> : null}
          </div>

          <div className="space-y-5 py-5">
            <div>
              <label className="mb-2 block text-sm font-bold">옵션</label>
              <select
                className="h-12 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-foreground"
                value={optionID ?? selectedOption?.id ?? ""}
                onChange={(event) => setOptionID(Number(event.target.value))}
              >
                {product.options?.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.option_value}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between rounded-md border border-line bg-white p-3">
              <span className="text-sm font-bold">수량</span>
              <div className="flex items-center gap-3">
                <Button variant="secondary" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="수량 감소">
                  <Minus size={16} />
                </Button>
                <span className="w-6 text-center font-bold">{quantity}</span>
                <Button variant="secondary" size="icon" onClick={() => setQuantity(quantity + 1)} aria-label="수량 증가">
                  <Plus size={16} />
                </Button>
              </div>
            </div>

            <div className="rounded-md bg-white p-4">
              <p className="text-sm leading-6 text-zinc-700">{product.description}</p>
            </div>
          </div>

          <div className="fixed inset-x-0 bottom-16 grid grid-cols-[56px_1fr] gap-2 border-t border-line bg-white p-3 md:static md:grid-cols-[56px_1fr] md:border-0 md:bg-transparent md:p-0">
            <Button
              variant="secondary"
              size="lg"
              aria-label="찜하기"
              onClick={() => setLiked((value) => !value)}
              title={liked ? "찜 해제" : "찜하기"}
            >
              <Heart size={20} className={liked ? "fill-brand text-brand" : ""} />
            </Button>
            <Button
              size="lg"
              onClick={() => {
                if (!effectiveToken) {
                  router.push("/login");
                  return;
                }
                addCart.mutate();
              }}
              disabled={addCart.isPending || !selectedOption}
            >
              <ShoppingBag size={19} />
              {!effectiveToken ? "로그인 후 담기" : addCart.isSuccess ? "담겼어요" : "장바구니 담기"}
            </Button>
          </div>
        </aside>
      </div>

      <section className="mt-10 border-t border-line pt-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-black">상품 상세 정보</h2>
          <div
            className="mt-6 overflow-hidden rounded-md bg-white text-zinc-800 [&_.detail-band]:px-5 [&_.detail-band]:py-12 [&_.detail-center]:mx-auto [&_.detail-center]:max-w-2xl [&_h3]:text-2xl [&_h3]:font-black [&_h4]:text-lg [&_h4]:font-black [&_img]:w-full [&_p]:mt-3 [&_p]:leading-7 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-line [&_td]:p-3 [&_th]:border [&_th]:border-line [&_th]:bg-zinc-50 [&_th]:p-3"
            dangerouslySetInnerHTML={{ __html: detailHtml }}
          />
        </div>
      </section>
    </main>
  );
}
