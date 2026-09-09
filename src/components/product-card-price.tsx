import { productCardPricing } from "@/lib/product-card-pricing";
import { cn, formatPrice } from "@/lib/utils";

export function ProductCardPrice({ basePrice, discountPrice, couponPrice, className, variant = "default" }: { basePrice: number; discountPrice?: number; couponPrice?: number; className?: string; variant?: "default" | "compact" | "overlay" }) {
  const pricing = productCardPricing({ basePrice, discountPrice, couponPrice });
  const isCoupon = pricing.state === "coupon" || pricing.state === "stacked";
  const label = isCoupon ? "쿠폰 최적가" : pricing.state === "sale" ? "할인가" : "판매가";
  const saving = pricing.state === "stacked" ? `할인 ${pricing.saleRate}% · 쿠폰 ${pricing.couponRate}%`
    : pricing.state === "sale" ? `${pricing.saleRate}% 할인`
      : pricing.state === "coupon" ? `쿠폰 ${pricing.couponRate}%` : "";

  if (variant === "overlay") {
    return (
      <div className={cn("mt-1 text-content-inverse", className)}>
        {saving ? <p className="text-xs font-medium">{saving}</p> : null}
        <div className="flex flex-wrap items-baseline gap-x-2">
          {pricing.compareAtPrice !== undefined ? <del className="text-xs text-content-inverse/90">{formatPrice(pricing.compareAtPrice)}</del> : null}
          <strong className="text-sm font-bold">{isCoupon ? "쿠폰 최적가 " : ""}{formatPrice(pricing.finalPrice)}</strong>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-w-0 text-left", variant === "compact" && "mt-3", className)}>
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
        {saving ? <p className={cn("text-xs font-bold leading-5", isCoupon ? "text-promotion" : "text-action-primary")} aria-label={saving}>{pricing.state === "sale" ? `${pricing.saleRate}%` : saving}</p> : null}
        <strong className={cn("inline-flex max-w-full flex-wrap items-baseline gap-x-1 font-bold tabular-nums", variant === "compact" ? "text-sm leading-5" : "text-base leading-5", isCoupon ? "text-promotion" : pricing.state === "sale" ? "text-action-primary" : "text-content-primary")} aria-label={`${label} ${formatPrice(pricing.finalPrice)}`}>
          <span className="whitespace-nowrap">{formatPrice(pricing.finalPrice)}</span>
        </strong>
        {pricing.compareAtPrice !== undefined ? <del className="whitespace-nowrap text-xs font-medium leading-5 text-content-secondary">{formatPrice(pricing.compareAtPrice)}</del> : null}
      </div>
    </div>
  );
}
