"use client";

import Link from "next/link";
import type { Product } from "@/lib/types";
import { discountRate, formatPrice } from "@/lib/utils";
import { SafeImage } from "./safe-image";

export function ProductCard({ product, imageAspect = "aspect-square" }: { product: Product; imageAspect?: string }) {
  const saleRate = discountRate(product.base_price, product.discount_price);
  const price = product.discount_price || product.base_price;
  const discountAmount = Math.max(0, product.base_price - price);
  const couponOffer = product.coupon_offer;
  const couponPrice = product.coupon_lowest_price || couponOffer?.discounted_amount;

  return (
    <article className="group">
      <Link href={`/products/${product.id}`} className="block">
        <div className={`relative ${imageAspect} overflow-hidden rounded-md bg-zinc-100`}>
          <SafeImage
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        </div>
      </Link>
      <div className="mt-3 space-y-1.5">
        <Link href={`/markets/${product.market?.id ?? product.market_id}`} className="inline-flex w-fit text-xs font-semibold text-muted underline-offset-2 hover:text-foreground hover:underline">
          {product.market?.name ?? product.market_name ?? `마켓 ${product.market_id}`}
        </Link>
        <Link href={`/products/${product.id}`} className="block">
          <h3 className="line-clamp-2 min-h-10 text-sm font-medium leading-5 group-hover:underline">{product.name}</h3>
        </Link>
        <div className="rounded-md bg-zinc-50 px-2.5 py-2">
          <p className="text-[11px] font-bold text-muted">판매가</p>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            {saleRate > 0 ? <span className="text-base font-black text-brand">{saleRate}%</span> : null}
            <strong className="text-lg font-black tracking-tight">{formatPrice(price)}</strong>
          </div>
          {discountAmount > 0 ? (
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
              <span className="text-muted">원가 <del>{formatPrice(product.base_price)}</del></span>
              <span className="font-black text-brand">-{formatPrice(discountAmount)} 할인</span>
            </div>
          ) : (
            <p className="mt-1 text-[11px] text-muted">원가와 동일</p>
          )}
          {couponOffer && couponPrice ? (
            <div className="mt-2 border-t border-zinc-200 pt-2">
              <p className="text-[11px] font-bold text-violet-700">{couponOffer.requires_claim ? "이벤트 쿠폰 받으면" : "쿠폰 받으면"}</p>
              <p className="mt-0.5 text-base font-black text-violet-700">{formatPrice(couponPrice)}</p>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1">
          {(product.tag_chips ?? []).slice(0, 4).map((chip) => (
            <ProductChip key={chip.code} label={chip.label} tone={chip.tone} />
          ))}
        </div>
      </div>
    </article>
  );
}

function ProductChip({ label, tone }: { label: string; tone: string }) {
  const toneClasses: Record<string, string> = {
    shipping: "bg-emerald-50 text-emerald-700",
    delivery: "bg-sky-50 text-sky-700",
    exclusive: "bg-amber-50 text-amber-800",
    promotion: "bg-amber-50 text-amber-800",
    new: "bg-brand text-white",
    default: "bg-zinc-100 text-zinc-600",
  };
  const toneClass = toneClasses[tone] ?? toneClasses.default;

  return <span className={`rounded-sm px-1.5 py-0.5 text-[11px] font-bold ${toneClass}`}>{label}</span>;
}
