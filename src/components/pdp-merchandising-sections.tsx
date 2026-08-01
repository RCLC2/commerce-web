"use client";

import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import type { PdpCardAd, Product, SponsoredMarketShelf } from "@/lib/types";
import { ProductCard } from "./product-card";
import { SafeImage } from "./safe-image";
import { Button } from "./ui/button";

export function PdpCardAdSection({ ad }: { ad: PdpCardAd }) {
  return (
    <section className="mt-10" aria-label="광고">
      <Link
        href={ad.link_url}
        className="group grid min-h-40 overflow-hidden rounded-2xl bg-zinc-950 text-white md:grid-cols-[1fr_42%]"
      >
        <div className="flex flex-col justify-center p-6 md:p-8">
          <span className="w-fit rounded-full border border-white/35 px-2 py-1 text-[10px] font-black tracking-wider text-white/80">
            {ad.disclosure}
          </span>
          <h2 className="mt-3 text-2xl font-black md:text-3xl">{ad.title}</h2>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-white/75 group-hover:text-white">
            혜택 보러가기 <ExternalLink size={14} />
          </span>
        </div>
        {ad.image_url ? (
          <div className="relative min-h-40 bg-zinc-800">
            <SafeImage src={ad.image_url} alt="" fill sizes="(max-width: 768px) 100vw, 42vw" className="object-cover transition duration-300 group-hover:scale-[1.03]" />
          </div>
        ) : null}
      </Link>
    </section>
  );
}

export function SponsoredMarketSection({ shelf }: { shelf: SponsoredMarketShelf }) {
  return (
    <ProductShelf
      eyebrow={shelf.disclosure}
      title={`${shelf.market.name} 인기 상품`}
      description={shelf.market.description}
      products={shelf.products.map((product) => ({ ...product, market_name: shelf.market.name }))}
      headerHref={`/markets/${shelf.market.id}`}
    />
  );
}

export function AlsoViewedSection({ products }: { products: Product[] }) {
  return (
    <ProductShelf
      eyebrow="DISCOVERY"
      title="같이 본 상품들"
      description="이 상품과 함께 둘러본 고객들이 관심을 보인 상품입니다."
      products={products}
    />
  );
}

function ProductShelf({
  eyebrow,
  title,
  description,
  products,
  headerHref,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  products: Product[];
  headerHref?: string;
}) {
  const carouselRef = useRef<HTMLDivElement | null>(null);
  if (!products.length) return null;

  function slide(direction: -1 | 1) {
    carouselRef.current?.scrollBy({ left: direction * 640, behavior: "smooth" });
  }

  const heading = <h2 className="mt-1 text-2xl font-black">{title}</h2>;
  return (
    <section className="mt-10 border-t border-line pt-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-black tracking-[0.18em] text-brand">{eyebrow}</p>
          {headerHref ? <Link href={headerHref} className="hover:text-brand">{heading}</Link> : heading}
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" size="icon" aria-label={`${title} 이전`} onClick={() => slide(-1)}><ChevronLeft size={18} /></Button>
          <Button variant="secondary" size="icon" aria-label={`${title} 다음`} onClick={() => slide(1)}><ChevronRight size={18} /></Button>
        </div>
      </div>
      <div ref={carouselRef} className="no-scrollbar flex snap-x gap-3 overflow-x-auto scroll-smooth pb-2 md:gap-4">
        {products.map((product) => (
          <div key={`${title}-${product.id}`} className="w-[44vw] shrink-0 snap-start sm:w-48 md:w-52">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
