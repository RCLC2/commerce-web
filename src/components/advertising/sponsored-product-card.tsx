import Link from "next/link";
import type { AdDecision } from "@/lib/api/advertising";
import { ProductCardPrice } from "../product-card-price";
import { SafeImage } from "../safe-image";
import { SponsoredDisclosure } from "./sponsored-disclosure";

export function SponsoredProductCard({ decision, onNavigate }: { decision: AdDecision; onNavigate: () => void }) {
  if (decision.creative.format !== "PRODUCT_CARD" || decision.target.type !== "PRODUCT") return null;
  const product = decision.target.product;
  const compact = decision.placement_key === "home_feed.sponsored_card";
  return (
    <article className="relative overflow-hidden rounded-xl border border-brand/25 bg-white shadow-sm">
      <SponsoredDisclosure />
      <Link href={decision.creative.landing_url} onClick={onNavigate} className={`group grid gap-3 p-3 pr-16 transition hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${compact ? "min-h-32 grid-cols-[104px_1fr] md:grid-cols-[120px_1fr]" : "min-h-40 grid-cols-[128px_1fr] md:grid-cols-[160px_1fr]"}`}>
        <div className="relative aspect-square overflow-hidden rounded-lg bg-zinc-100">
          <SafeImage src={product.image_url} alt={product.name} fill sizes="160px" className="object-cover transition group-hover:scale-[1.03]" />
        </div>
        <div className="min-w-0 self-center py-2">
          <p className="truncate text-xs font-bold text-muted">{product.market_name}</p>
          <h2 className="mt-2 line-clamp-2 text-base font-black leading-6 md:text-lg">{product.name}</h2>
          <div className="mt-3"><ProductCardPrice basePrice={product.base_price} discountPrice={product.discount_price} /></div>
          <p className="mt-2 text-xs font-bold text-brand">상품 상세로 이동</p>
        </div>
      </Link>
    </article>
  );
}
