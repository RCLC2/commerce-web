import { formatPrice } from "@/lib/utils";
import { productCardPricing } from "@/lib/product-card-pricing";

export function ProductCardPrice({
  basePrice,
  discountPrice,
  couponPrice,
  className = "",
  variant = "default",
}: {
  basePrice: number;
  discountPrice?: number;
  couponPrice?: number;
  className?: string;
  variant?: "default" | "compact" | "overlay";
}) {
  const pricing = productCardPricing({ basePrice, discountPrice, couponPrice });
  const isCouponPrice = pricing.state === "coupon" || pricing.state === "stacked";

  if (variant === "overlay") {
    return (
      <div className={`mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-white ${className}`}>
        {pricing.state === "stacked" ? <span className="text-[10px] font-black text-white/90">할인 {pricing.saleRate}% · 쿠폰 {pricing.couponRate}%</span> : null}
        {pricing.state === "sale" ? <span className="text-xs font-black">{pricing.saleRate}%</span> : null}
        {pricing.state === "coupon" ? <span className="text-xs font-black">{pricing.couponRate}%</span> : null}
        {pricing.compareAtPrice !== undefined ? <del className="text-[10px] font-bold text-white/70">{formatPrice(pricing.compareAtPrice)}</del> : null}
        <strong className="text-xs font-black">{isCouponPrice ? `쿠폰 최적가 ${formatPrice(pricing.finalPrice)}` : formatPrice(pricing.finalPrice)}</strong>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={`mt-3 min-w-0 ${className}`}>
        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          {pricing.state === "regular" ? <span className="text-[11px] font-bold text-muted">{formatPrice(pricing.basePrice)}</span> : null}
          {pricing.state === "stacked" ? <span className="text-[10px] font-black text-brand">할인 {pricing.saleRate}% · 쿠폰 {pricing.couponRate}%</span> : null}
          {pricing.state === "sale" ? <span className="text-xs font-black text-brand">{pricing.saleRate}%</span> : null}
          {pricing.state === "coupon" ? <span className="text-xs font-black text-promotion">{pricing.couponRate}%</span> : null}
          {pricing.compareAtPrice !== undefined ? <del className="text-[11px] text-muted">{formatPrice(pricing.compareAtPrice)}</del> : null}
        </div>
        <strong className={`mt-0.5 block text-xs font-black ${isCouponPrice ? "text-promotion" : "text-brand"}`}>
          {isCouponPrice
            ? `쿠폰 최적가 ${formatPrice(pricing.finalPrice)}`
            : pricing.state === "sale"
              ? `할인가 ${formatPrice(pricing.finalPrice)}`
              : formatPrice(pricing.finalPrice)}
        </strong>
      </div>
    );
  }

  return (
    <div className={`min-h-14 rounded-control bg-surface-subtle px-2.5 py-2 ${className}`}>
      <p className="text-[11px] font-bold text-muted">판매가</p>
      <div className="mt-1 flex min-w-0 flex-wrap items-baseline justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-baseline gap-1.5">
          {pricing.state === "regular" ? (
            <span className="truncate text-xs font-bold text-muted">{formatPrice(pricing.basePrice)}</span>
          ) : pricing.state === "stacked" ? (
            <>
              <span className="shrink-0 text-xs font-black text-brand">할인 {pricing.saleRate}% · 쿠폰 {pricing.couponRate}%</span>
              <del className="truncate text-xs font-bold text-muted">{formatPrice(pricing.compareAtPrice ?? 0)}</del>
            </>
          ) : (
            <>
             <span className={`shrink-0 text-sm font-black ${isCouponPrice ? "text-promotion" : "text-brand"}`}>
                {isCouponPrice ? pricing.couponRate : pricing.saleRate}%
              </span>
              <del className="truncate text-xs font-bold text-muted">{formatPrice(pricing.compareAtPrice ?? 0)}</del>
            </>
          )}
        </div>
       <strong className={isCouponPrice ? "ml-auto shrink-0 text-sm font-black text-promotion" : "ml-auto shrink-0 text-base font-black tracking-tight text-brand"}>
          {isCouponPrice
            ? `쿠폰 최적가 ${formatPrice(pricing.finalPrice)}`
            : pricing.state === "sale"
              ? `할인가 ${formatPrice(pricing.finalPrice)}`
              : formatPrice(pricing.finalPrice)}
        </strong>
      </div>
    </div>
  );
}
