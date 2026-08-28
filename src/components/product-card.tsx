"use client";

import Link from "next/link";
import type { Product, ProductBadgeTone } from "@/lib/types";
import { couponPriceForProduct } from "@/lib/product-card-pricing";
import { ProductCardPrice } from "./product-card-price";
import { SafeImage } from "./safe-image";

export function ProductCard({ product, imageAspect = "aspect-square" }: { product: Product; imageAspect?: string }) {
  const couponPrice = couponPriceForProduct(product);

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
        <ProductCardPrice basePrice={product.base_price} discountPrice={product.discount_price} couponPrice={couponPrice} />
        <div className="flex flex-wrap gap-1">
          {(product.tag_chips ?? []).slice(0, 4).map((chip) => (
            <ProductChip key={chip.code} label={chip.label} tone={chip.tone} />
          ))}
        </div>
      </div>
    </article>
  );
}

function ProductChip({ label, tone }: { label: string; tone: ProductBadgeTone }) {
  const toneClasses: Record<ProductBadgeTone, string> = {
    shipping: "bg-emerald-50 text-emerald-700",
    delivery: "bg-sky-50 text-sky-700",
    exclusive: "bg-amber-50 text-amber-800",
    new: "bg-brand text-white",
    default: "bg-zinc-100 text-zinc-600",
  };
  return <span className={`rounded-sm px-1.5 py-0.5 text-[11px] font-bold ${toneClasses[tone]}`}>{label}</span>;
}
