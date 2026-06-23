import { request } from "../api-client";
import type { Address, CartItem, Coupon, CreateReviewResponse, OrderResponse, TrackingInfo } from "../types";

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
  listOrders: (token: string, params?: { status?: string; limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.status && params.status !== "ALL") query.set("status", params.status);
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.offset) query.set("offset", String(params.offset));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request<OrderResponse[]>(`/api/v1/orders${suffix}`, { token });
  },
  getOrder: (token: string, orderCode: string) => request<OrderResponse>(`/api/v1/orders/${orderCode}`, { token }),
  confirmPurchase: (token: string, orderCode: string, itemID: number) =>
    request<OrderResponse>(`/api/v1/orders/${orderCode}/items/${itemID}/confirm-purchase`, { method: "POST", token }),
  trackDelivery: (token: string, orderCode: string, deliveryID: number) =>
    request<TrackingInfo>(`/api/v1/orders/${orderCode}/deliveries/${deliveryID}/track`, { method: "POST", token }),
  createOrderLineReview: (token: string, orderCode: string, itemID: number, payload: { rating_x2: number; content: string }) =>
    request<CreateReviewResponse>(`/api/v1/orders/${orderCode}/items/${itemID}/reviews`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
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
