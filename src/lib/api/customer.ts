import { request } from "../api-client";
import type { Address, CartItem, Coupon, CreateReviewResponse, Notification, OrderResponse, Recommendation, Review, SettlementSummary, TrackingInfo } from "../types";

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
  listNotifications: (token: string) => request<Notification[]>("/api/v1/me/notifications", { token }),
  listMyRecommendations: (token: string) => request<Recommendation[]>("/api/v1/me/recommendations", { token }),
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
  createPaymentCheckout: (token: string, orderCode: string) =>
    request<{ checkout_url?: string; url?: string }>(`/api/v1/orders/${orderCode}/payment-checkout`, { method: "POST", token }),
  trackDelivery: (token: string, orderCode: string, deliveryID: number) =>
    request<TrackingInfo>(`/api/v1/orders/${orderCode}/deliveries/${deliveryID}/track`, { method: "POST", token }),
  createOrderLineReview: (token: string, orderCode: string, itemID: number, payload: { rating_x2: number; content: string }) =>
    request<CreateReviewResponse>(`/api/v1/orders/${orderCode}/items/${itemID}/reviews`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  updateReview: (token: string, reviewID: number, payload: { rating_x2?: number; content?: string }) =>
    request<Review>(`/api/v1/reviews/${reviewID}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
    }),
  deleteReview: (token: string, reviewID: number) => request<void>(`/api/v1/reviews/${reviewID}`, { method: "DELETE", token }),
  addWishlist: (token: string, productID: number) => request<{ status: string }>(`/api/v1/products/${productID}/wishlist`, { method: "POST", token }),
  removeWishlist: (token: string, productID: number) => request<void>(`/api/v1/products/${productID}/wishlist`, { method: "DELETE", token }),
  addLike: (token: string, productID: number) => request<{ status: string }>(`/api/v1/products/${productID}/like`, { method: "POST", token }),
  removeLike: (token: string, productID: number) => request<void>(`/api/v1/products/${productID}/like`, { method: "DELETE", token }),
  markNotificationRead: (token: string, notificationID: number) => request<{ status: string }>(`/api/v1/notifications/${notificationID}/read`, { method: "POST", token }),
  getSettlementSummary: (token: string, marketID: number) => request<SettlementSummary>(`/api/v1/settlements/${marketID}/summary`, { token }),
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
