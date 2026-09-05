"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import type { Product } from "@/lib/types";
import { ProductCard } from "./product-card";
import { Button } from "./ui/button";

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
