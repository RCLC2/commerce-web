"use client";

import Link from "next/link";
import { Store } from "lucide-react";
import type { Product, ProductBadgeTone } from "@/lib/types";
import { couponPriceForProduct } from "@/lib/product-card-pricing";
import { ProductCardPrice } from "./product-card-price";
import { SafeImage } from "./safe-image";

export function ProductCard({
  product,
  imageAspect = "aspect-square",
  compact = false,
}: {
  product: Product;
  imageAspect?: string;
  compact?: boolean;
}) {
  const couponPrice = couponPriceForProduct(product);

  return (
    <article className="group min-w-0">
      <Link href={`/products/${product.id}`} className="block">
        <div className={`relative ${imageAspect} overflow-hidden rounded-control bg-surface-subtle`}>
          <SafeImage
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        </div>
      </Link>
      <div className={compact ? "mt-2 space-y-1" : "mt-2.5 space-y-1.5"}>
        <Link href={`/markets/${product.market?.id ?? product.market_id}`} className="inline-flex max-w-full items-center gap-1 text-xs font-medium text-content-secondary underline-offset-2 hover:text-content-primary hover:underline">
          <Store size={13} className="shrink-0" aria-hidden="true" /><span className="truncate">{product.market?.name ?? product.market_name ?? `마켓 ${product.market_id}`}</span>
        </Link>
        <Link href={`/products/${product.id}`} className="block">
          <h3 className={`${compact ? "line-clamp-1" : "line-clamp-2"} text-sm font-bold leading-5 text-content-primary hover:underline`}>{product.name}</h3>
        </Link>
        <ProductCardPrice
          basePrice={product.base_price}
          discountPrice={product.discount_price}
          couponPrice={couponPrice}
          variant={compact ? "compact" : "default"}
          className={compact ? "!mt-1" : ""}
        />
        <div className="flex flex-wrap items-center gap-x-1 text-xs">
          {(product.tag_chips ?? []).slice(0, compact ? 2 : 4).map((chip, index) => (
            <span key={chip.code} className="inline-flex items-center gap-1">
              {index ? <span className="text-content-tertiary" aria-hidden="true">·</span> : null}
              <ProductChip label={chip.label} tone={chip.tone} />
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

function ProductChip({ label, tone }: { label: string; tone: ProductBadgeTone }) {
  const tones: Record<ProductBadgeTone, string> = {
    shipping: "text-status-positive",
    delivery: "text-content-secondary",
    exclusive: "text-status-warning",
    new: "text-content-primary",
    default: "text-content-secondary",
  };
  return <span className={`font-bold ${tones[tone]}`}>{label}</span>;
}
