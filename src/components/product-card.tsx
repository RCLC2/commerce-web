import Link from "next/link";
import type { Product } from "@/lib/types";
import { discountRate, formatPrice } from "@/lib/utils";
import { SafeImage } from "./safe-image";

export function ProductCard({ product, imageAspect = "aspect-[3/4]" }: { product: Product; imageAspect?: string }) {
  const price = product.display_price ?? (product.discount_price || product.base_price);
  const saleRate = product.discount_percent ?? discountRate(product.base_price, price);
  const discountAmount = Math.max(0, product.base_price - price);
  const tags = product.tags ?? [];

  return (
    <Link href={`/products/${product.id}`} className="group block">
      <div className={`relative ${imageAspect} overflow-hidden rounded-md bg-zinc-100`}>
        <SafeImage
          src={product.image_url}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover transition duration-300 group-hover:scale-[1.03]"
        />
      </div>
      <div className="mt-3 space-y-1.5">
        <p className="text-xs font-semibold text-muted">{product.market_name ?? `마켓 ${product.market_id}`}</p>
        <h3 className="line-clamp-2 min-h-10 text-sm font-medium leading-5">{product.name}</h3>
        <div className="space-y-1">
          <div className="flex items-baseline gap-1.5">
            {saleRate > 0 ? <span className="text-sm font-black text-brand">{saleRate}%</span> : null}
            <span className="text-base font-black">{formatPrice(price)}</span>
          </div>
          {discountAmount > 0 ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span className="text-muted line-through">원가 {formatPrice(product.base_price)}</span>
              <span className="font-bold text-brand">할인 {formatPrice(discountAmount)}</span>
            </div>
          ) : (
            <p className="text-xs text-muted">원가 {formatPrice(product.base_price)}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {product.shipping_type === "FREE" ? <ProductChip label="무료배송" tone="shipping" /> : null}
          {tags.includes("오늘출발") ? <ProductChip label="오늘출발" tone="delivery" /> : null}
          {tags.includes("신상") ? <ProductChip label="신상" tone="new" /> : null}
          {tags
            .filter((tag) => !["오늘출발", "신상", "무료배송"].includes(tag))
            .slice(0, 2)
            .map((tag) => (
              <ProductChip key={tag} label={tag} tone="default" />
            ))}
        </div>
      </div>
    </Link>
  );
}

function ProductChip({ label, tone }: { label: string; tone: "shipping" | "delivery" | "new" | "default" }) {
  const toneClass = {
    shipping: "bg-emerald-50 text-emerald-700",
    delivery: "bg-sky-50 text-sky-700",
    new: "bg-brand text-white",
    default: "bg-zinc-100 text-zinc-600",
  }[tone];

  return <span className={`rounded-sm px-1.5 py-0.5 text-[11px] font-bold ${toneClass}`}>{label}</span>;
}
