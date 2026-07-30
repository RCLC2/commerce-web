import { describe, expect, it } from "vitest";
import type { Product } from "./types";
import { applySellerProductEdits } from "./seller-product-edits";

const product: Product = {
  id: 1,
  market_id: 2,
  category_id: 3,
  name: "할인 상품",
  description: "화면 설명",
  description_source: "{\"html\":\"<p>원본 설명</p>\",\"version\":2}",
  base_price: 20000,
  discount_price: 18000,
  shipping_type: "NORMAL",
  popularity_score: 10,
  status: "SELLING",
  options: [],
};

describe("applySellerProductEdits", () => {
  it("preserves base-price and opaque description while editing a discounted product", () => {
    expect(applySellerProductEdits(product, {
      price: 17500,
      status: "SOLD_OUT",
      shippingType: "FREE",
      options: [],
    })).toMatchObject({
      base_price: 20000,
      discount_price: 17500,
      description_source: product.description_source,
      status: "SOLD_OUT",
      shipping_type: "FREE",
    });
  });
});
