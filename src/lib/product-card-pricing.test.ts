import { describe, expect, it } from "vitest";
import { productCardPricing } from "./product-card-pricing";

describe("productCardPricing", () => {
  it("models a regular price without a comparison price", () => {
    expect(productCardPricing({ basePrice: 50_000, discountPrice: 0 })).toEqual({
      state: "regular",
      basePrice: 50_000,
      sellingPrice: 50_000,
      finalPrice: 50_000,
    });
  });

  it("models a normal sale against the base price", () => {
    expect(productCardPricing({ basePrice: 50_000, discountPrice: 40_000 })).toEqual({
      state: "sale",
      basePrice: 50_000,
      sellingPrice: 40_000,
      finalPrice: 40_000,
      compareAtPrice: 50_000,
      saleRate: 20,
    });
  });

  it("models a coupon-only discount against the selling price", () => {
    expect(productCardPricing({ basePrice: 50_000, discountPrice: 0, couponPrice: 45_000 })).toEqual({
      state: "coupon",
      basePrice: 50_000,
      sellingPrice: 50_000,
      finalPrice: 45_000,
      compareAtPrice: 50_000,
      couponRate: 10,
    });
  });

  it("models stacked discounts with separate sale and coupon rates", () => {
    expect(productCardPricing({ basePrice: 50_000, discountPrice: 40_000, couponPrice: 36_000 })).toEqual({
      state: "stacked",
      basePrice: 50_000,
      sellingPrice: 40_000,
      finalPrice: 36_000,
      compareAtPrice: 40_000,
      saleRate: 20,
      couponRate: 10,
    });
  });

  it.each([
    [{ basePrice: -1, discountPrice: -2, couponPrice: -3 }, 0],
    [{ basePrice: 50_000, discountPrice: 40_000, couponPrice: 60_000 }, 40_000],
    [{ basePrice: 0, discountPrice: 0, couponPrice: 0 }, 0],
    [{ basePrice: Number.NaN, discountPrice: Number.POSITIVE_INFINITY }, 0],
  ])("clamps malformed prices without negative or NaN output", (input, finalPrice) => {
    const pricing = productCardPricing(input);
    expect(pricing.finalPrice).toBe(finalPrice);
    expect(pricing.finalPrice).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(pricing.finalPrice)).toBe(true);
    expect(pricing.saleRate ?? 0).toBeGreaterThanOrEqual(0);
    expect(pricing.couponRate ?? 0).toBeGreaterThanOrEqual(0);
  });
});
