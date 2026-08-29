"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import type { AdDecision } from "@/lib/api/advertising";
import { formatPrice } from "@/lib/utils";
import { SafeImage } from "../safe-image";
import { Button } from "../ui/button";
import { SponsoredDisclosure } from "./sponsored-disclosure";

export function SponsoredMarketShelf({ decision, onNavigate }: { decision: AdDecision; onNavigate: () => void }) {
  const carouselRef = useRef<HTMLDivElement | null>(null);
  if (decision.creative.format !== "MARKET_SHELF" || decision.target.type !== "MARKET") return null;
  const market = decision.target.market;
  const slide = (direction: -1 | 1) => carouselRef.current?.scrollBy({ left: direction * 620, behavior: "smooth" });
  return (
    <section className="relative rounded-2xl border border-brand/25 bg-white p-5 pt-12 shadow-sm">
      <SponsoredDisclosure />
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <Link href={decision.creative.landing_url} onClick={onNavigate} className="text-2xl font-black hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">{market.name}</Link>
          {market.description ? <p className="mt-1 line-clamp-2 text-sm text-muted">{market.description}</p> : null}
        </div>
        <div className="flex shrink-0 gap-2" aria-label={`${market.name} 광고 상품 캐러셀 조작`}>
          <Button variant="secondary" size="icon" aria-label={`${market.name} 이전 상품`} onClick={() => slide(-1)}><ChevronLeft size={18} /></Button>
          <Button variant="secondary" size="icon" aria-label={`${market.name} 다음 상품`} onClick={() => slide(1)}><ChevronRight size={18} /></Button>
        </div>
      </div>
      <div ref={carouselRef} className="no-scrollbar mt-5 flex snap-x gap-3 overflow-x-auto scroll-smooth pb-1">
        {market.products.map((product) => (
          <Link key={product.id} href={`/products/${product.id}`} onClick={onNavigate} className="group w-40 shrink-0 snap-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand md:w-48">
            <div className="relative aspect-square overflow-hidden rounded-lg bg-zinc-100">
              <SafeImage src={product.image_url} alt={product.name} fill sizes="192px" className="object-cover transition group-hover:scale-[1.03]" />
            </div>
            <p className="mt-2 line-clamp-2 min-h-10 text-sm font-bold">{product.name}</p>
            <p className="mt-1 font-black text-brand">{formatPrice(product.discount_price || product.base_price)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
