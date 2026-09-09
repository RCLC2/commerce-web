import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { AdDecision } from "@/lib/api/advertising";
import { ProductCardPrice } from "../product-card-price";
import { SafeImage } from "../safe-image";
import { SponsoredDisclosure } from "./sponsored-disclosure";

export function SponsoredProductCard({ decision, onNavigate }: { decision: AdDecision; onNavigate: () => void }) {
  if (decision.creative.format !== "PRODUCT_CARD" || decision.target.type !== "PRODUCT") return null;
  const product = decision.target.product;
  const compact = decision.placement_key === "home_feed.sponsored_card" || decision.placement_key === "home.feature_card";
  return (
    <article className="relative overflow-hidden rounded-surface border border-action-primary/25 bg-gradient-to-br from-action-secondary/60 via-surface-raised to-surface-raised shadow-card">
      <SponsoredDisclosure />
      <Link href={decision.creative.landing_url} onClick={onNavigate} className={`group grid gap-4 p-4 pr-16 transition hover:bg-action-secondary/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${compact ? "min-h-32 grid-cols-[104px_1fr] md:grid-cols-[120px_1fr]" : "grid-cols-[128px_1fr] md:grid-cols-[148px_1fr]"}`}>
        <div className="relative aspect-square overflow-hidden rounded-control bg-surface-raised shadow-card ring-1 ring-black/5">
          <SafeImage src={product.image_url} alt={product.name} fill sizes="160px" className="object-cover transition group-hover:scale-[1.03]" />
        </div>
        <div className="min-w-0 self-center py-1">
          <p className="truncate text-xs font-bold text-action-primary">{product.market_name} · 추천 상품</p>
          <h2 className="mt-1 line-clamp-2 text-base font-bold leading-6 md:text-lg">{product.name}</h2>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
            <ProductCardPrice basePrice={product.base_price} discountPrice={product.discount_price} variant="compact" className="!mt-0" />
            <span className="inline-flex items-center gap-1 text-xs font-bold text-action-primary transition group-hover:underline">
              상품 보기 <ArrowUpRight size={14} aria-hidden="true" />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
