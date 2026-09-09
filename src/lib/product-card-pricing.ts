import type { Product } from "./types";

export type ProductCardPriceState = "regular" | "sale" | "coupon" | "stacked";

export type ProductCardPricing = {
  state: ProductCardPriceState;
  basePrice: number;
  sellingPrice: number;
  finalPrice: number;
  compareAtPrice?: number;
  saleRate?: number;
  couponRate?: number;
};

export function productCardPricing({
  basePrice,
  discountPrice,
  couponPrice,
}: {
  basePrice: number;
  discountPrice?: number;
  couponPrice?: number;
}): ProductCardPricing {
  const base = safePrice(basePrice);
  const requestedSellingPrice = safeOptionalPrice(discountPrice);
  const selling = requestedSellingPrice !== undefined
    && requestedSellingPrice > 0
    && requestedSellingPrice < base
    ? requestedSellingPrice
    : base;
  const requestedCouponPrice = safeOptionalPrice(couponPrice);
  const coupon = requestedCouponPrice !== undefined && requestedCouponPrice < selling
    ? requestedCouponPrice
    : undefined;
  const hasSale = selling < base;
  const hasCoupon = coupon !== undefined;

  if (hasSale && hasCoupon) {
    return {
      state: "stacked",
      basePrice: base,
      sellingPrice: selling,
      finalPrice: coupon,
      compareAtPrice: selling,
      saleRate: rate(base, selling),
      couponRate: rate(selling, coupon),
    };
  }
  if (hasCoupon) {
    return {
      state: "coupon",
      basePrice: base,
      sellingPrice: selling,
      finalPrice: coupon,
      compareAtPrice: selling,
      couponRate: rate(selling, coupon),
    };
  }
  if (hasSale) {
    return {
      state: "sale",
      basePrice: base,
      sellingPrice: selling,
      finalPrice: selling,
      compareAtPrice: base,
      saleRate: rate(base, selling),
    };
  }
  return { state: "regular", basePrice: base, sellingPrice: base, finalPrice: base };
}

export function couponPriceForProduct(product: Product): number | undefined {
  if (typeof product.coupon_lowest_price === "number" && product.coupon_lowest_price > 0) {
    return product.coupon_lowest_price;
  }
  if (product.coupon_offer && product.coupon_offer.discounted_amount >= 0) {
    return product.coupon_offer.discounted_amount;
  }
  return undefined;
}

function safePrice(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function safeOptionalPrice(value?: number): number | undefined {
  return value !== undefined && Number.isFinite(value) && value >= 0
    ? Math.trunc(value)
    : undefined;
}

function rate(from: number, to: number): number {
  if (from <= 0 || to >= from) return 0;
  return Math.max(0, Math.min(100, Math.round(((from - to) / from) * 100)));
}
