import { request } from "../api-client";
import type { Address, CartItem, Coupon, OrderResponse } from "../types";

export const customerApi = {
  addCartItem: (token: string, payload: { product_id: number; option_id: number; quantity: number }) =>
    request<{ status: string }>("/api/v1/cart/items", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  listCart: (token: string) => request<CartItem[]>("/api/v1/cart", { token }),
  listCoupons: (token: string) => request<Coupon[]>("/api/v1/coupons", { token }),
  listIssuableCoupons: (token: string) => request<Coupon[]>("/api/v1/coupons/issuable", { token }),
  issueCoupon: (token: string, couponID: number) =>
    request<Coupon>(`/api/v1/coupons/${couponID}/issue`, {
      method: "POST",
      token,
    }),
  listAddresses: (token: string) => request<Address[]>("/api/v1/me/addresses", { token }),
  placeOrder: (token: string, payload: { cart_item_ids: number[]; used_coupon_id?: number; used_point: number }) =>
    request<{ orderCode: string }>("/api/v1/orders", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  listOrders: (token: string) => request<OrderResponse[]>("/api/v1/orders", { token }),
  getOrder: (token: string, orderCode: string) => request<OrderResponse>(`/api/v1/orders/${orderCode}`, { token }),
  completePayment: (
    token: string,
    orderCode: string,
    payload: { payment_method: string; payment_key: string; amount: number },
  ) =>
    request<{ orderCode: string; status: string }>(`/api/v1/orders/${orderCode}/complete-payment`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
};
