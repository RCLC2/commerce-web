import type { Product, ProductOption } from "./types";

export type SellerProductEdit = {
  price: number;
  status: string;
  shippingType: string;
  options: ProductOption[];
};

export function applySellerProductEdits(
  product: Product,
  edit: SellerProductEdit,
): Product {
  const hasDiscountPrice = product.discount_price > 0;
  return {
    ...product,
    base_price: hasDiscountPrice ? product.base_price : edit.price,
    discount_price: hasDiscountPrice ? edit.price : 0,
    shipping_type: edit.shippingType,
    status: edit.status,
    options: edit.options.map((option) => ({
      ...option,
      quantity: Math.max(0, option.quantity),
      additional_price: Math.max(0, option.additional_price),
    })),
  };
}
