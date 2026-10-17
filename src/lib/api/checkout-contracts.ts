import { z } from "zod";

export type UpdateCartItemGroupRequest = {
  cart_item_ids: number[];
  option_id: number;
  quantity: number;
};

export type OrderShippingAddressInput = {
  receiver: string;
  phone: string;
  zip_code: string;
  line1: string;
  line2: string;
};

export type CreateShippingAddressRequest = OrderShippingAddressInput & {
  is_default: boolean;
};

export type OrderQuoteRequest = {
  cart_item_ids: number[];
  used_coupon_id?: number;
  used_point: number;
  shipping_address: OrderShippingAddressInput;
};

export const orderQuoteSchema = z.object({
  product_total: z.number().int().nonnegative(),
  discount_total: z.number().int().nonnegative(),
  used_point: z.number().int().nonnegative(),
  shipping_fee: z.number().int().nonnegative(),
  payment_amount: z.number().int().positive(),
  line_items: z.array(z.object({
    cart_item_id: z.number().int().positive(),
    unit_price: z.number().int().nonnegative(),
    line_total: z.number().int().nonnegative(),
  })).min(1),
}).refine((quote) =>
  quote.payment_amount === quote.product_total - quote.discount_total - quote.used_point + quote.shipping_fee
  && quote.product_total === quote.line_items.reduce((sum, item) => sum + item.line_total, 0)
  && new Set(quote.line_items.map((item) => item.cart_item_id)).size === quote.line_items.length,
{ message: "주문 견적의 상품 합계와 결제 금액이 일치하지 않습니다." });

export type OrderQuoteResponse = z.infer<typeof orderQuoteSchema>;
