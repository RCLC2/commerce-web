import { ProductCard } from "@/components/product-card";
import type { OutfitLook } from "@/lib/today-outfit";
import { outfitProductAnchorID } from "@/lib/today-outfit";
import { cn } from "@/lib/utils";

export function OutfitProductList({
  look,
  selectedProductID,
}: {
  look: OutfitLook;
  selectedProductID: number | null;
}) {
  return (
    <section aria-label="현재 코디 상품" className="mt-12 border-t border-line pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">이 코디의 실제 상품</h2>
          <p className="mt-1 text-xs text-muted sm:text-sm">이미지의 부위별 상품을 누르면 연결된 상품을 바로 확인할 수 있어요.</p>
        </div>
        <p className="text-xs font-black text-brand">{look.items.length}개 상품</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-4 lg:grid-cols-7">
        {look.items.map((item) => {
          const selected = selectedProductID === item.product.id;
          return (
            <div
              key={item.slot}
              id={outfitProductAnchorID(look.id, item.product.id)}
              tabIndex={-1}
              aria-label={`${item.slot_label} 상품 ${item.product.name}`}
              data-selected={selected ? "true" : undefined}
              className={cn(
                "scroll-mt-28 rounded-xl p-2 outline-none transition duration-300",
                selected && "bg-brand/5 ring-2 ring-brand ring-offset-4",
              )}
            >
              <span className="mb-2 inline-flex rounded-full bg-zinc-950 px-2 py-1 text-[10px] font-black text-white">{item.slot_label}</span>
              <ProductCard product={item.product} imageAspect="aspect-[3/4]" />
            </div>
          );
        })}
      </div>
    </section>
  );
}
