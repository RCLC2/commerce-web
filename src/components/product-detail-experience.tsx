"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Bookmark, Camera, CheckCircle2, ChevronLeft, ChevronRight, Heart, Minus, Plus, ShoppingBag, SlidersHorizontal, Star, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-client";
import { getEffectiveToken } from "@/lib/auth-token";
import {
  availableOptionQuantity,
  clampOptionQuantity,
  findNewMatchingCartItem,
  firstSellableOption,
  includesProduct,
} from "@/lib/product-engagement";
import { resolveProductDetailHtml } from "@/lib/product-detail-html";
import { queryKeys } from "@/lib/query-keys";
import { useSessionStore } from "@/lib/session-store";
import type { PdpMerchandising, Product, ProductOption } from "@/lib/types";
import { discountRate, formatPrice } from "@/lib/utils";
import { AlsoViewedSection, PdpCardAdSection, SponsoredMarketSection } from "./pdp-merchandising-sections";
import { SafeImage } from "./safe-image";
import { Button } from "./ui/button";

class CartPreflightError extends Error {
  constructor(cause: unknown) {
    super(`담기 전 장바구니를 확인하지 못했습니다. ${apiErrorMessage(cause)}`);
    this.name = "CartPreflightError";
  }
}

export function ProductDetailExperience({ productId, initialProduct, initialMerchandising }: { productId: number; initialProduct?: Product; initialMerchandising: PdpMerchandising }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useSessionStore((state) => state.accessToken);
  const memberID = useSessionStore((state) => state.memberID);
  const effectiveToken = getEffectiveToken(token);
  const [quantity, setQuantity] = useState(1);
  const [optionID, setOptionID] = useState<number | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [showFloatingPurchase, setShowFloatingPurchase] = useState(false);
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const dragStartX = useRef<number | null>(null);
  const purchasePanelRef = useRef<HTMLElement | null>(null);

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
  const likedProductsQuery = useQuery({
    queryKey: queryKeys.likedProducts(memberID),
    queryFn: () => api.listLikedProducts(effectiveToken ?? ""),
    enabled: Boolean(effectiveToken),
    refetchOnMount: "always",
  });
  const wishlistQuery = useQuery({
    queryKey: queryKeys.wishlist(memberID),
    queryFn: () => api.listWishlistedProducts(effectiveToken ?? ""),
    enabled: Boolean(effectiveToken),
    refetchOnMount: "always",
  });

  const product = productQuery.data;
  const reviews = reviewsQuery.data ?? [];
  const summary = summaryQuery.data;
  const liked = includesProduct(likedProductsQuery.data, productId);
  const wishlisted = includesProduct(wishlistQuery.data, productId);
  const productSellable = product?.status === "SELLING" && product.in_stock !== false;
  const selectedOption = useMemo(
    () => {
      if (!productSellable) return undefined;
      const options = product?.options;
      return options?.find((option) =>
        option.id === optionID && availableOptionQuantity(option) > 0)
        ?? firstSellableOption(options);
    },
    [optionID, product?.options, productSellable],
  );
  const availableQuantity = availableOptionQuantity(selectedOption);
  const purchaseQuantity = clampOptionQuantity(quantity, selectedOption);

  const addCart = useMutation({
    mutationFn: async () => {
      if (!effectiveToken || !selectedOption || availableQuantity === 0) {
        throw new Error("현재 담을 수 있는 상품 옵션이 없습니다.");
      }
      const input = {
        product_id: productId,
        option_id: selectedOption.id,
        quantity: purchaseQuantity,
      };
      let before: Awaited<ReturnType<typeof api.listCart>>;
      try {
        before = await api.listCart(effectiveToken);
      } catch (error) {
        throw new CartPreflightError(error);
      }
      try {
        await api.addCartItem(effectiveToken, input);
        return { reconciled: false };
      } catch (error) {
        try {
          const after = await api.listCart(effectiveToken);
          if (findNewMatchingCartItem(before, after, input)) {
            return { reconciled: true };
          }
        } catch {
          // Preserve the original add failure when reconciliation also fails.
        }
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart(memberID) });
    },
  });

  function handleCartAction() {
    if (!effectiveToken) {
      router.push("/login");
      return;
    }
    if (addCart.isSuccess) {
      router.push("/cart");
      return;
    }
    if (addCart.error instanceof CartPreflightError) {
      addCart.reset();
      addCart.mutate();
      return;
    }
    if (addCart.isError) {
      router.push("/cart");
      return;
    }
    addCart.mutate();
  }
  function handleOption(option: number) {
    addCart.reset();
    setOptionID(option);
    setQuantity(1);
  }
  function handleQuantity(next: number) {
    addCart.reset();
    setQuantity(clampOptionQuantity(next, selectedOption));
  }
  const likeMutation = useMutation({
    mutationFn: async (target: boolean) => {
      if (!effectiveToken) throw new Error("로그인이 필요합니다.");
      if (target) await api.addLike(effectiveToken, productId);
      else await api.removeLike(effectiveToken, productId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.likedProducts(memberID) }),
  });
  const wishlistMutation = useMutation({
    mutationFn: async (target: boolean) => {
      if (!effectiveToken) throw new Error("로그인이 필요합니다.");
      if (target) await api.addWishlist(effectiveToken, productId);
      else await api.removeWishlist(effectiveToken, productId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.wishlist(memberID) }),
  });

  function handleProtectedEngagement(action: "like" | "wishlist") {
    if (!effectiveToken) {
      router.push(`/login?next=/products/${productId}`);
      return;
    }
    if (likeMutation.isPending || wishlistMutation.isPending) return;
    if (action === "like") {
      likeMutation.reset();
      likeMutation.mutate(!liked);
      return;
    }
    wishlistMutation.reset();
    wishlistMutation.mutate(!wishlisted);
  }

  async function retryLike() {
    if (likedProductsQuery.isError) {
      await likedProductsQuery.refetch();
      return;
    }
    if (!likeMutation.isError || likeMutation.variables === undefined) return;
    const target = likeMutation.variables;
    const result = await likedProductsQuery.refetch();
    if (!result.isSuccess) return;
    if (includesProduct(result.data, productId) === target) {
      likeMutation.reset();
      return;
    }
    likeMutation.mutate(target);
  }

  async function retryWishlist() {
    if (wishlistQuery.isError) {
      await wishlistQuery.refetch();
      return;
    }
    if (!wishlistMutation.isError || wishlistMutation.variables === undefined) return;
    const target = wishlistMutation.variables;
    const result = await wishlistQuery.refetch();
    if (!result.isSuccess) return;
    if (includesProduct(result.data, productId) === target) {
      wishlistMutation.reset();
      return;
    }
    wishlistMutation.mutate(target);
  }

  const likeError = likedProductsQuery.error ?? likeMutation.error;
  const wishlistError = wishlistQuery.error ?? wishlistMutation.error;
  const engagementLoading = Boolean(effectiveToken) && (likedProductsQuery.isFetching || wishlistQuery.isFetching);

  useEffect(() => {
    function updateFloatingPurchase() {
      const panel = purchasePanelRef.current;
      if (!panel) return;
      setShowFloatingPurchase(panel.getBoundingClientRect().bottom < 80);
    }
    updateFloatingPurchase();
    window.addEventListener("scroll", updateFloatingPurchase, { passive: true });
    return () => window.removeEventListener("scroll", updateFloatingPurchase);
  }, [product]);

  if (productQuery.isLoading) {
    return <main className="mx-auto max-w-6xl px-4 py-10">상품을 불러오는 중입니다.</main>;
  }
  if (productQuery.isError || !product) {
    return <main className="mx-auto max-w-6xl px-4 py-10">상품을 불러오지 못했습니다.</main>;
  }

  const images = product.images?.length
    ? [...product.images].sort((a, b) => a.sort_order - b.sort_order)
    : [{ url: product.image_url ?? "/images/fashion-placeholder.svg", alt_text: product.name, sort_order: 0 }];
  const safeImageIndex = Math.min(activeImage, images.length - 1);
  const detailHtml = resolveProductDetailHtml(product);
  const price = product.discount_price || product.base_price;
  const saleRate = discountRate(product.base_price, product.discount_price);
  const couponOffer = product.coupon_offer;
  const couponPrice = product.coupon_lowest_price || couponOffer?.discounted_amount;

  function moveImage(delta: number) {
    setActiveImage((current) => (current + delta + images.length) % images.length);
  }

  function startImageDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (images.length <= 1) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartX.current = event.clientX;
    setIsDraggingImage(true);
    setDragOffsetX(0);
  }

  function updateImageDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (dragStartX.current === null) return;
    const delta = event.clientX - dragStartX.current;
    setDragOffsetX(Math.max(-180, Math.min(180, delta)));
  }

  function finishImageDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (dragStartX.current === null) return;
    const delta = event.clientX - dragStartX.current;
    dragStartX.current = null;
    setIsDraggingImage(false);
    setDragOffsetX(0);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (Math.abs(delta) >= 48) moveImage(delta > 0 ? -1 : 1);
  }

  function cancelImageDrag() {
    dragStartX.current = null;
    setIsDraggingImage(false);
    setDragOffsetX(0);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 md:pb-20 md:pt-8">
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_360px] lg:grid-cols-[minmax(0,620px)_420px] lg:justify-between">
        <section>
          <div
            className="group relative aspect-square touch-pan-y select-none overflow-hidden rounded-xl bg-zinc-100 cursor-grab active:cursor-grabbing"
            aria-roledescription="carousel"
            onPointerDown={startImageDrag}
            onPointerMove={updateImageDrag}
            onPointerUp={finishImageDrag}
            onPointerCancel={cancelImageDrag}
          >
            <div
              className={`absolute inset-0 ${isDraggingImage ? "" : "transition-transform duration-200 ease-out"}`}
              style={{
                transform: `translate3d(${dragOffsetX}px, 0, 0)`,
                opacity: 1 - Math.min(Math.abs(dragOffsetX) / 720, 0.2),
              }}
            >
              <SafeImage
                src={images[safeImageIndex]?.url}
                alt={images[safeImageIndex]?.alt_text || product.name}
                fill
                priority={safeImageIndex === 0}
                sizes="(max-width: 768px) 100vw, 55vw"
                className="pointer-events-none select-none object-cover"
              />
            </div>
            {images.length > 1 ? (
              <>
                <GalleryButton label="이전 이미지" side="left" onClick={() => moveImage(-1)}><ChevronLeft size={22} /></GalleryButton>
                <GalleryButton label="다음 이미지" side="right" onClick={() => moveImage(1)}><ChevronRight size={22} /></GalleryButton>
                <span className="absolute bottom-3 right-3 rounded-full bg-black/65 px-3 py-1 text-xs font-black text-white">
                  {safeImageIndex + 1} / {images.length}
                </span>
              </>
            ) : null}
          </div>
          {images.length > 1 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="상품 이미지 썸네일">
              {images.map((image, index) => (
                <button
                  key={`${image.url}-${index}`}
                  type="button"
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${index === safeImageIndex ? "border-brand" : "border-transparent"}`}
                  onClick={() => setActiveImage(index)}
                  aria-label={`${index + 1}번 이미지 보기`}
                >
                  <SafeImage src={image.url} alt="" fill sizes="64px" className="object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <aside ref={purchasePanelRef} className="md:sticky md:top-24 md:flex md:self-stretch md:flex-col">
          <div className="border-b border-line pb-5">
            <Link href={`/markets/${product.market_id}`} className="inline-flex items-center gap-1 text-sm font-black text-muted hover:text-brand">
              {product.market_name ?? `마켓 ${product.market_id}`}
              <ChevronRight size={14} />
            </Link>
            <h1 className="mt-2 text-2xl font-black leading-tight">{product.name}</h1>
            <div className="mt-3 flex items-center gap-2 text-sm text-zinc-600">
              <Star size={16} className="fill-brand text-brand" />
              {summaryQuery.isLoading ? (
                <span>별점을 불러오는 중입니다.</span>
              ) : summaryQuery.isError || !summary ? (
                <span>별점 정보를 불러오지 못했습니다.</span>
              ) : (
                <>
                  <span className="font-black">{summary.average_rating.toFixed(1)}</span>
                  <span>{summary.review_count.toLocaleString("ko-KR")}개 리뷰</span>
                </>
              )}
            </div>
            <div className="mt-5 flex items-baseline gap-2">
              {saleRate > 0 ? <span className="text-2xl font-black text-brand">{saleRate}%</span> : null}
              <span className="text-3xl font-black">{formatPrice(price)}</span>
            </div>
            {saleRate > 0 ? <p className="mt-1 text-sm text-muted line-through">{formatPrice(product.base_price)}</p> : null}
            {couponOffer && couponPrice ? (
              <div className="mt-3 rounded-lg bg-violet-50 px-3 py-2.5 text-violet-800">
                <p className="text-xs font-bold">{couponOffer.requires_claim ? "이벤트에서 쿠폰을 받으면" : "쿠폰을 받으면"}</p>
                <p className="mt-0.5 text-xl font-black">{formatPrice(couponPrice)}</p>
              </div>
            ) : null}
          </div>

          <div className="py-5">
            <p className="rounded-lg bg-zinc-50 p-4 text-sm leading-6 text-zinc-700">
              {product.summary_description || "구매 영역에 표시할 상품 요약이 아직 등록되지 않았습니다."}
            </p>
          </div>
          <div className="md:mt-auto">
            <PurchaseControls
              product={product}
              selectedOption={selectedOption}
              quantity={purchaseQuantity}
              availableQuantity={availableQuantity}
              liked={liked}
              wishlisted={wishlisted}
              cartPending={addCart.isPending}
              likePending={likeMutation.isPending}
              wishlistPending={wishlistMutation.isPending}
              likeSucceeded={likeMutation.isSuccess}
              wishlistSucceeded={wishlistMutation.isSuccess}
              likeReady={!effectiveToken || (likedProductsQuery.isSuccess && !likedProductsQuery.isFetching)}
              wishlistReady={!effectiveToken || (wishlistQuery.isSuccess && !wishlistQuery.isFetching)}
              engagementLoading={engagementLoading}
              likeError={likeError ? `좋아요 상태를 처리하지 못했습니다. ${apiErrorMessage(likeError)}` : undefined}
              wishlistError={wishlistError ? `찜 상태를 처리하지 못했습니다. ${apiErrorMessage(wishlistError)}` : undefined}
              added={addCart.isSuccess}
              cartError={addCart.isError ? addCart.error instanceof CartPreflightError ? addCart.error.message : `장바구니 반영 여부를 확인하지 못했습니다. ${apiErrorMessage(addCart.error)}` : undefined}
              cartRetrySafe={addCart.error instanceof CartPreflightError}
              authenticated={Boolean(effectiveToken)}
              onOption={handleOption}
              onQuantity={handleQuantity}
              onLike={() => handleProtectedEngagement("like")}
              onWishlist={() => handleProtectedEngagement("wishlist")}
              onRetryLike={retryLike}
              onRetryWishlist={retryWishlist}
              onCart={handleCartAction}
            />
          </div>
        </aside>
      </div>

      <section className="mt-10 border-y border-line py-7" aria-labelledby="review-carousel-title">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-brand">Customer Review</p>
            <h2 id="review-carousel-title" className="mt-1 text-2xl font-black">상품 리뷰</h2>
          </div>
          {summary ? (
            <div className="text-right text-sm font-bold text-muted">
              <p>리뷰 {summary.review_count.toLocaleString("ko-KR")}개</p>
              <p className="mt-1 flex items-center justify-end gap-1 text-xs">
                <Camera size={13} />
                포토 리뷰 {(summary.photo_review_count ?? 0).toLocaleString("ko-KR")}개
              </p>
            </div>
          ) : null}
        </div>
        {reviewsQuery.isLoading ? <p className="mt-5 text-sm text-muted">리뷰를 불러오는 중입니다.</p> : null}
        {reviewsQuery.isError ? <p className="mt-5 text-sm text-brand">리뷰를 불러오지 못했습니다.</p> : null}
        {!reviewsQuery.isLoading && !reviewsQuery.isError ? (
          <div className="no-scrollbar mt-5 flex snap-x gap-4 overflow-x-auto pb-3">
            {reviews.length ? reviews.map((review) => {
              const reviewImage = review.images?.[0];
              const reviewImageURL = reviewImage?.thumbnail_url || reviewImage?.detail_url || reviewImage?.url;
              return (
                <article key={review.id} className="w-[88vw] max-w-md shrink-0 snap-start rounded-xl border border-line bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-black text-zinc-600">
                        {(review.reviewer_name ?? "구매자").slice(-4, -2)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">{review.reviewer_name ?? "구매자"}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {review.created_at ? new Date(review.created_at).toLocaleDateString("ko-KR") : "작성일 미제공"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-brand">
                      <Star size={15} className="fill-brand" />
                      <span className="text-sm font-black">{review.rating.toFixed(1)}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                    {review.verified_purchase ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 font-bold text-emerald-700">
                        <BadgeCheck size={13} />
                        구매 인증
                      </span>
                    ) : null}
                    {review.option?.value ? (
                      <span className="rounded-full bg-zinc-100 px-2 py-1 font-bold text-zinc-600">
                        {review.option.name}: {review.option.value}
                      </span>
                    ) : null}
                    {review.height_at_time ? <span className="rounded-full bg-zinc-100 px-2 py-1 text-zinc-600">{review.height_at_time}cm</span> : null}
                    {review.weight_at_time ? <span className="rounded-full bg-zinc-100 px-2 py-1 text-zinc-600">{review.weight_at_time}kg</span> : null}
                  </div>

                  <div className={`mt-3 ${reviewImageURL ? "grid grid-cols-[1fr_88px] gap-3" : ""}`}>
                    <p className="line-clamp-4 text-sm leading-6 text-zinc-700">{review.content}</p>
                    {reviewImageURL ? (
                      <div className="relative h-[88px] overflow-hidden rounded-lg bg-zinc-100">
                        <SafeImage src={reviewImageURL} alt="리뷰 첨부 이미지" fill sizes="88px" className="object-cover" />
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            }) : <p className="text-sm text-muted">아직 등록된 리뷰가 없습니다.</p>}
          </div>
        ) : null}
      </section>

      {initialMerchandising.card_ad ? <PdpCardAdSection ad={initialMerchandising.card_ad} /> : null}

      {initialMerchandising.sponsored_market ? (
        <SponsoredMarketSection shelf={initialMerchandising.sponsored_market} />
      ) : null}

      <section className="pt-10">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-black">상품 상세 정보</h2>
          <div
            className="mt-6 overflow-hidden rounded-xl bg-white text-zinc-800 [&_.detail-band]:px-5 [&_.detail-band]:py-12 [&_.detail-center]:mx-auto [&_.detail-center]:max-w-2xl [&_h3]:text-2xl [&_h3]:font-black [&_h4]:text-lg [&_h4]:font-black [&_img]:w-full [&_p]:mt-3 [&_p]:leading-7 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-line [&_td]:p-3 [&_th]:border [&_th]:border-line [&_th]:bg-zinc-50 [&_th]:p-3"
            dangerouslySetInnerHTML={{ __html: detailHtml }}
          />
        </div>
      </section>

      <AlsoViewedSection products={initialMerchandising.also_viewed} />

      <div
        className={`fixed inset-x-0 bottom-16 z-40 border-t border-line bg-white/95 px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur transition md:bottom-0 ${showFloatingPurchase ? "opacity-100" : "pointer-events-none translate-y-full opacity-0"}`}
        aria-hidden={!showFloatingPurchase}
      >
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
          <div className="hidden min-w-0 flex-1 sm:block"><p className="truncate text-xs font-bold text-muted">{product.name}</p><p className="font-black">{formatPrice(price + (selectedOption?.additional_price ?? 0))} · {purchaseQuantity}개</p></div>
          <Button className="shrink-0" variant="secondary" onClick={() => setPurchaseOpen(true)} tabIndex={showFloatingPurchase ? 0 : -1}><SlidersHorizontal size={18} /> 옵션·수량</Button>
          <Button className="min-w-0 flex-1 sm:max-w-64" onClick={handleCartAction} disabled={addCart.isPending || !selectedOption} tabIndex={showFloatingPurchase ? 0 : -1}>
            {addCart.isSuccess ? <CheckCircle2 size={19} /> : <ShoppingBag size={19} />}
            {addCart.isPending ? "담는 중" : addCart.isSuccess || (addCart.isError && !(addCart.error instanceof CartPreflightError)) ? "장바구니 확인" : addCart.isError ? "다시 담기" : !effectiveToken ? "로그인 후 담기" : "장바구니 담기"}
          </Button>
          {addCart.isError ? <p className="basis-full text-right text-xs font-bold text-brand">{addCart.error instanceof CartPreflightError ? addCart.error.message : "담기 결과가 불명확합니다. 장바구니에서 확인해주세요."}</p> : null}
        </div>
      </div>

      {purchaseOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 md:items-center md:p-6" role="dialog" aria-modal="true" aria-label="구매 옵션">
          <div className="w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-2xl md:rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted">{product.market_name}</p>
                <h2 className="font-black">{product.name}</h2>
              </div>
              <Button variant="secondary" size="icon" aria-label="구매 옵션 닫기" onClick={() => setPurchaseOpen(false)}><X size={18} /></Button>
            </div>
            <div className="mt-5">
              <PurchaseControls
                product={product}
                selectedOption={selectedOption}
                quantity={purchaseQuantity}
                availableQuantity={availableQuantity}
                liked={liked}
                wishlisted={wishlisted}
                cartPending={addCart.isPending}
                likePending={likeMutation.isPending}
                wishlistPending={wishlistMutation.isPending}
                likeSucceeded={likeMutation.isSuccess}
                wishlistSucceeded={wishlistMutation.isSuccess}
                likeReady={!effectiveToken || (likedProductsQuery.isSuccess && !likedProductsQuery.isFetching)}
                wishlistReady={!effectiveToken || (wishlistQuery.isSuccess && !wishlistQuery.isFetching)}
                engagementLoading={engagementLoading}
                likeError={likeError ? `좋아요 상태를 처리하지 못했습니다. ${apiErrorMessage(likeError)}` : undefined}
                wishlistError={wishlistError ? `찜 상태를 처리하지 못했습니다. ${apiErrorMessage(wishlistError)}` : undefined}
                added={addCart.isSuccess}
                cartError={addCart.isError ? addCart.error instanceof CartPreflightError ? addCart.error.message : `장바구니 반영 여부를 확인하지 못했습니다. ${apiErrorMessage(addCart.error)}` : undefined}
                cartRetrySafe={addCart.error instanceof CartPreflightError}
                authenticated={Boolean(effectiveToken)}
                onOption={handleOption}
                onQuantity={handleQuantity}
                onLike={() => handleProtectedEngagement("like")}
                onWishlist={() => handleProtectedEngagement("wishlist")}
                onRetryLike={retryLike}
                onRetryWishlist={retryWishlist}
                onCart={handleCartAction}
              />
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function GalleryButton({ label, side, onClick, children }: { label: string; side: "left" | "right"; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={`absolute top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow transition hover:bg-white ${side === "left" ? "left-3" : "right-3"}`}
      aria-label={label}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

type PurchaseControlsProps = {
  product: Product;
  selectedOption?: ProductOption;
  quantity: number;
  availableQuantity: number;
  liked: boolean;
  wishlisted: boolean;
  cartPending: boolean;
  likePending: boolean;
  wishlistPending: boolean;
  likeSucceeded: boolean;
  wishlistSucceeded: boolean;
  likeReady: boolean;
  wishlistReady: boolean;
  engagementLoading: boolean;
  likeError?: string;
  wishlistError?: string;
  added: boolean;
  cartError?: string;
  cartRetrySafe: boolean;
  authenticated: boolean;
  onOption: (id: number) => void;
  onQuantity: (quantity: number) => void;
  onLike: () => void;
  onWishlist: () => void;
  onRetryLike: () => void;
  onRetryWishlist: () => void;
  onCart: () => void;
};

function PurchaseControls(props: PurchaseControlsProps) {
  return (
    <div className="space-y-4">
      <label className="block text-sm font-black">
        옵션
        <select
          className="mt-2 h-12 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-foreground"
          value={props.selectedOption?.id ?? ""}
          onChange={(event) => props.onOption(Number(event.target.value))}
        >
          {!props.selectedOption ? <option value="">판매 가능한 옵션 없음</option> : null}
          {props.product.options?.map((option) => (
            <option key={option.id} value={option.id} disabled={availableOptionQuantity(option) <= 0}>
              {option.option_value}{availableOptionQuantity(option) <= 0 ? " (품절)" : ""}
            </option>
          ))}
        </select>
      </label>
      {!props.selectedOption ? <p className="rounded-lg bg-zinc-100 px-3 py-2 text-sm font-bold text-muted">현재 구매 가능한 옵션이 없습니다.</p> : null}
      <div className="flex items-center justify-between rounded-lg border border-line p-3">
        <span className="text-sm font-black">수량</span>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="icon" onClick={() => props.onQuantity(Math.max(1, props.quantity - 1))} aria-label="수량 줄이기"><Minus size={16} /></Button>
          <span className="w-6 text-center font-black">{props.quantity}</span>
          <Button variant="secondary" size="icon" disabled={props.quantity >= props.availableQuantity} onClick={() => props.onQuantity(Math.min(props.availableQuantity, props.quantity + 1))} aria-label="수량 늘리기"><Plus size={16} /></Button>
        </div>
      </div>
      <div className="grid grid-cols-[56px_56px_1fr] gap-2">
        <Button variant="secondary" size="lg" aria-label={props.liked ? "좋아요 취소" : "좋아요"} title={props.liked ? "좋아요 취소" : "좋아요"} onClick={props.onLike} disabled={props.likePending || props.wishlistPending || (props.authenticated && !props.likeReady)}>
          <Heart size={20} className={props.liked ? "fill-brand text-brand" : ""} />
        </Button>
        <Button variant="secondary" size="lg" aria-label={props.wishlisted ? "찜 해제" : "찜하기"} title={props.wishlisted ? "찜 해제" : "찜하기"} onClick={props.onWishlist} disabled={props.likePending || props.wishlistPending || (props.authenticated && !props.wishlistReady)}>
          <Bookmark size={20} className={props.wishlisted ? "fill-brand text-brand" : ""} />
        </Button>
        <Button size="lg" onClick={props.onCart} disabled={props.cartPending || !props.selectedOption}>
          {props.added ? <CheckCircle2 size={19} /> : <ShoppingBag size={19} />}
          {props.cartPending ? "담는 중" : !props.authenticated ? "로그인 후 담기" : props.added || (props.cartError && !props.cartRetrySafe) ? "장바구니 확인" : props.cartRetrySafe ? "다시 담기" : "장바구니 담기"}
        </Button>
      </div>
      {props.engagementLoading ? <p className="text-xs font-bold text-muted">좋아요와 찜 상태를 확인하는 중입니다.</p> : null}
      {props.likeError ? <div className="rounded-lg bg-red-50 px-3 py-2 text-sm"><p className="font-bold text-brand">{props.likeError}</p><Button className="mt-2" size="sm" variant="secondary" onClick={props.onRetryLike}>좋아요 다시 시도</Button></div> : null}
      {props.wishlistError ? <div className="rounded-lg bg-red-50 px-3 py-2 text-sm"><p className="font-bold text-brand">{props.wishlistError}</p><Button className="mt-2" size="sm" variant="secondary" onClick={props.onRetryWishlist}>찜 다시 시도</Button></div> : null}
      {props.cartError ? <div className="rounded-lg bg-red-50 px-3 py-2 text-sm"><p className="font-bold text-brand">{props.cartError}</p><Button className="mt-2" size="sm" variant="secondary" onClick={props.onCart}>{props.cartRetrySafe ? "다시 담기" : "장바구니 확인"}</Button></div> : null}
      {props.likePending || props.wishlistPending ? <p className="text-xs font-bold text-muted" role="status">상품 상태를 저장하는 중입니다.</p> : null}
      {props.likeSucceeded && !props.likeError ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-900" role="status">{props.liked ? "좋아요에 추가했습니다." : "좋아요를 취소했습니다."}</p> : null}
      {props.wishlistSucceeded && !props.wishlistError ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-900" role="status">{props.wishlisted ? "찜한 상품에 추가했습니다." : "찜을 해제했습니다."}</p> : null}
      {props.added ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-center text-sm font-bold text-emerald-700" role="status">상품을 담았습니다. 버튼을 다시 누르면 장바구니로 이동합니다.</p> : null}
    </div>
  );
}
