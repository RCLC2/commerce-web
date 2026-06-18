"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Star, Upload, X } from "lucide-react";
import Link from "next/link";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useSessionStore } from "@/lib/session-store";
import { formatPrice } from "@/lib/utils";
import { Button } from "./ui/button";
import { SafeImage } from "./safe-image";

const MAX_REVIEW_IMAGES = 5;
const MAX_REVIEW_IMAGE_BYTES = 10 * 1024 * 1024;
const REVIEW_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    PLACED: "주문 접수",
    PAYMENT_COMPLETED: "결제 완료",
    READY_TO_SHIP: "배송 준비중",
    SHIPPING: "배송중",
    DELIVERED: "배송 완료",
    ORDERED: "주문 완료",
  };
  return labels[status] ?? status;
}

export function OrderDetailPage({ orderCode }: { orderCode: string }) {
  const token = useSessionStore((state) => state.accessToken);
  const effectiveToken = token ?? (process.env.NEXT_PUBLIC_API_MOCKING === "enabled" ? "mock-access-token" : "");
  const { data: order, isLoading, error } = useQuery({
    queryKey: ["order", orderCode],
    queryFn: () => api.getOrder(effectiveToken, orderCode),
    enabled: Boolean(effectiveToken),
  });

  if (!token && process.env.NEXT_PUBLIC_API_MOCKING !== "enabled") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-black">로그인이 필요합니다</h1>
        <Link href="/login">
          <Button className="mt-5">로그인하기</Button>
        </Link>
      </main>
    );
  }

  if (isLoading) {
    return <main className="mx-auto max-w-4xl px-4 py-8 text-sm text-muted">주문을 불러오는 중입니다.</main>;
  }

  if (error || !order) {
    return <main className="mx-auto max-w-4xl px-4 py-8 text-sm text-brand">주문 정보를 불러오지 못했습니다.</main>;
  }

  const amount = order.total_order_price - order.total_discount_price - order.used_point;

  return (
    <main className="mx-auto max-w-4xl px-4 pb-24 pt-8">
      <div className="rounded-md border border-line bg-white p-5">
        <p className="text-sm font-bold text-muted">주문번호</p>
        <h1 className="mt-1 text-2xl font-black">{order.order_code}</h1>
        <p className="mt-1 text-sm text-muted">{order.ordered_at ? new Date(order.ordered_at).toLocaleString("ko-KR") : "-"}</p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <InfoBox label="주문 상태" value={statusLabel(order.status)} />
          <InfoBox label="결제 수단" value={order.payment_method ?? "CARD"} />
          <InfoBox label="결제 금액" value={formatPrice(amount)} />
        </div>
      </div>

      <section className="mt-6 rounded-md border border-line bg-white p-5">
        <h2 className="text-lg font-black">배송지</h2>
        {order.shipping_address ? (
          <div className="mt-3 text-sm leading-7">
            <p className="font-bold">{order.shipping_address.receiver} · {order.shipping_address.phone}</p>
            <p className="text-muted">({order.shipping_address.zip_code}) {order.shipping_address.line1} {order.shipping_address.line2}</p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">배송지 정보가 없습니다.</p>
        )}
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="text-lg font-black">주문 상품</h2>
        {order.market_orders?.map((marketOrder) => (
          <div key={marketOrder.id} className="rounded-md border border-line bg-white p-4">
            <div className="flex justify-between text-sm">
              <span className="font-bold">마켓 #{marketOrder.market_id}</span>
              <span className="text-muted">{statusLabel(marketOrder.status)}</span>
            </div>
            <div className="mt-4 space-y-3">
              {marketOrder.line_items.map((item) => (
                <div key={item.id} className="text-sm">
                  <div className="flex gap-3">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-zinc-100">
                      <SafeImage src={item.product?.image_url} alt="" fill sizes="80px" className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-3">
                        <p className="font-bold">{item.product?.name ?? `상품 ${item.product_id}`}</p>
                        <p className="font-black">{formatPrice(item.price * item.quantity)}</p>
                      </div>
                      <p className="mt-1 text-muted">옵션 #{item.option_id} · {item.quantity}개 · {statusLabel(item.status)}</p>
                      <p className="mt-1 text-xs text-muted">상품 ID {item.product_id} · 라인 ID {item.id}</p>
                    </div>
                  </div>
                  <ReviewComposer
                    token={effectiveToken}
                    orderCode={order.order_code}
                    lineItemID={item.id}
                    productID={item.product_id}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="mt-6 rounded-md border border-line bg-white p-5">
        <h2 className="text-lg font-black">결제 정보</h2>
        <div className="mt-4 space-y-2 text-sm">
          <PriceRow label="상품 금액" value={order.total_order_price} />
          <PriceRow label="쿠폰 할인" value={-order.total_discount_price} />
          <PriceRow label="포인트 사용" value={-order.used_point} />
          <div className="border-t border-line pt-3">
            <PriceRow label="최종 결제 금액" value={amount} strong />
          </div>
        </div>
      </section>
    </main>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-zinc-50 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-black">{value}</p>
    </div>
  );
}

function PriceRow({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "text-base font-black" : ""}`}>
      <span>{label}</span>
      <strong>{formatPrice(value)}</strong>
    </div>
  );
}

function ReviewComposer({
  token,
  orderCode,
  lineItemID,
  productID,
}: {
  token: string;
  orderCode: string;
  lineItemID: number;
  productID: number;
}) {
  const queryClient = useQueryClient();
  const [ratingX2, setRatingX2] = useState(10);
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [clientError, setClientError] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const trimmedContent = content.trim();
      if (!trimmedContent) {
        throw new Error("리뷰 내용을 입력해주세요.");
      }

      const images = [];
      for (const [index, file] of files.entries()) {
        const upload = await api.createReviewImageUpload(token, {
          filename: file.name,
          content_type: file.type,
          size_bytes: file.size,
        });
        await api.uploadReviewImageObject(upload, file);
        const asset = await api.completeReviewImageUpload(token, upload.s3_key);
        images.push({
          media_asset_id: asset.id,
          sort_order: index + 1,
          is_representative: index === 0,
        });
      }

      return api.createOrderLineReview(token, orderCode, lineItemID, {
        rating_x2: ratingX2,
        content: trimmedContent,
        images,
      });
    },
    onSuccess: () => {
      setContent("");
      setFiles([]);
      setClientError("");
      void queryClient.invalidateQueries({ queryKey: queryKeys.productReviews(productID) });
      void queryClient.invalidateQueries({ queryKey: ["order", orderCode] });
    },
  });

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    mutation.reset();

    if (!selected.length) {
      return;
    }
    if (files.length + selected.length > MAX_REVIEW_IMAGES) {
      setClientError(`리뷰 이미지는 최대 ${MAX_REVIEW_IMAGES}장까지 등록할 수 있습니다.`);
      return;
    }
    const invalid = selected.find((file) => !REVIEW_IMAGE_TYPES.has(file.type) || file.size > MAX_REVIEW_IMAGE_BYTES);
    if (invalid) {
      setClientError("JPG, PNG, WEBP 이미지만 10MiB 이하로 등록할 수 있습니다.");
      return;
    }

    setClientError("");
    setFiles((current) => [...current, ...selected]);
  }

  function removeFile(index: number) {
    mutation.reset();
    setClientError("");
    setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setClientError("");
    mutation.mutate();
  }

  const errorMessage = clientError || (mutation.error instanceof Error ? mutation.error.message : "");

  return (
    <form className="mt-4 rounded-md border border-line bg-zinc-50 p-3" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-black">리뷰 작성</p>
        <div className="flex items-center gap-1">
          {[2, 4, 6, 8, 10].map((score) => (
            <button
              key={score}
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-brand transition hover:bg-white"
              aria-label={`${score / 2}점`}
              onClick={() => {
                mutation.reset();
                setRatingX2(score);
              }}
            >
              <Star size={17} className={score <= ratingX2 ? "fill-brand" : ""} />
            </button>
          ))}
        </div>
      </div>

      <textarea
        className="mt-3 min-h-24 w-full resize-none rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
        value={content}
        maxLength={5000}
        placeholder="상품 사용 경험을 남겨주세요"
        onChange={(event) => {
          mutation.reset();
          setContent(event.target.value);
        }}
      />

      {files.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${file.lastModified}-${index}`}
              className="flex h-9 max-w-full items-center gap-2 rounded-md border border-line bg-white px-3 text-xs"
            >
              <span className="truncate">{file.name}</span>
              <button
                type="button"
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md hover:bg-zinc-100"
                aria-label={`${file.name} 제거`}
                onClick={() => removeFile(index)}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold transition hover:bg-zinc-50">
          <ImagePlus size={16} />
          이미지 선택
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={handleFileChange} />
        </label>
        <Button type="submit" size="sm" disabled={mutation.isPending || !content.trim()}>
          <Upload size={16} />
          {mutation.isPending ? "등록 중" : "리뷰 등록"}
        </Button>
      </div>

      {errorMessage ? <p className="mt-2 text-xs font-semibold text-brand">{errorMessage}</p> : null}
      {mutation.isSuccess ? <p className="mt-2 text-xs font-semibold text-foreground">리뷰가 등록됐습니다.</p> : null}
    </form>
  );
}
