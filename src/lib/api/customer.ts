import { z } from "zod";
import { requestParsed, requestVoid } from "../api-client";
import {
  orderSchema,
  productSchema,
  recommendationSchema,
  statusResponseSchema,
  trackingInfoSchema,
} from "./contracts/schemas";
import {
  rawAddressSchema,
  rawCartSchema,
  rawCouponDefinitionSchema,
  rawIssuableCouponQuoteSchema,
  rawNotificationSchema,
  rawOwnedCouponSchema,
  rawPaymentCheckoutSchema,
  rawReviewMutationSchema,
  rawSettlementSummarySchema,
} from "./contracts/raw";
import {
  normalizeAddress,
  normalizeCartItem,
  normalizeCouponDefinition,
  normalizeIssuableCouponQuote,
  normalizeNotification,
  normalizeOwnedCoupon,
  normalizePaymentCheckout,
  normalizeReviewMutation,
  normalizeSettlementSummary,
} from "./normalizers/contracts";

export type CreateOrderLineReviewPayload = {
  rating_x2: number;
  content: string;
  images?: { s3_key?: string; object_key?: string; sort_order: number; is_representative: boolean }[];
};

export type CustomerOrderListStatus = "PAYMENT_PENDING" | "PAID" | "PLACED" | "CANCELLED";

async function listAllOrders(token: string) {
  const pageSize = 100;
  const orders: z.infer<typeof orderSchema>[] = [];
  const seen = new Set<number>();

  for (let offset = 0; ; offset += pageSize) {
    const page = await requestParsed(
      z.array(orderSchema),
      `/api/v1/orders?limit=${pageSize}&offset=${offset}`,
      { token },
    );
    const unseen = page.filter((order) => !seen.has(order.id));
    unseen.forEach((order) => seen.add(order.id));
    orders.push(...unseen);
    if (page.length < pageSize || unseen.length === 0) {
      return orders;
    }
  }
}

export function normalizeCouponQuoteOrderAmount(orderAmount: number): number {
  const normalized = Math.floor(orderAmount);
  if (!Number.isFinite(orderAmount) || !Number.isSafeInteger(normalized) || normalized < 0) {
    throw new RangeError("쿠폰 견적 주문 금액은 0 이상의 안전한 유한 정수여야 합니다.");
  }
  return normalized;
}

export const customerApi = {
  addCartItem: (token: string, payload: { product_id: number; option_id: number; quantity: number }) =>
    requestParsed(statusResponseSchema, "/api/v1/cart/items", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  listCart: async (token: string) =>
    (await requestParsed(z.array(rawCartSchema), "/api/v1/cart", { token })).map(normalizeCartItem),
  listCoupons: async (token: string) =>
    (await requestParsed(z.array(rawOwnedCouponSchema), "/api/v1/coupons", { token }))
      .map((coupon) => normalizeOwnedCoupon(coupon)),
  listIssuableCoupons: async (token: string) =>
    (await requestParsed(z.array(rawCouponDefinitionSchema), "/api/v1/coupons/issuable", { token }))
      .map(normalizeCouponDefinition),
  listIssuableCouponQuotes: async (token: string, orderAmount: number) => {
    const normalizedOrderAmount = normalizeCouponQuoteOrderAmount(orderAmount);
    return (await requestParsed(
      z.array(rawIssuableCouponQuoteSchema),
      `/api/v1/coupons/issuable?order_amount=${normalizedOrderAmount}`,
      { token },
    )).map(normalizeIssuableCouponQuote);
  },
  issueCoupon: (token: string, couponID: number) =>
    requestVoid(`/api/v1/coupons/${couponID}/issue`, { method: "POST", token }),
  listAddresses: async (token: string) =>
    (await requestParsed(z.array(rawAddressSchema), "/api/v1/me/addresses", { token })).map(normalizeAddress),
  listNotifications: async (token: string) =>
    (await requestParsed(z.array(rawNotificationSchema), "/api/v1/me/notifications", { token }))
      .map(normalizeNotification),
  listMyRecommendations: (token: string) => requestParsed(z.array(recommendationSchema), "/api/v1/me/recommendations", { token }),
  listWishlistedProducts: (token: string) => requestParsed(z.array(productSchema), "/api/v1/me/wishlist", { token }),
  listLikedProducts: (token: string) => requestParsed(z.array(productSchema), "/api/v1/me/liked-products", { token }),
  placeOrder: (token: string, payload: { cart_item_ids: number[]; used_coupon_id?: number; used_point: number }) =>
    requestParsed(z.object({ orderCode: z.string().min(1) }), "/api/v1/orders", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  listOrders: (token: string, params?: { status?: CustomerOrderListStatus; limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.offset) query.set("offset", String(params.offset));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return requestParsed(z.array(orderSchema), `/api/v1/orders${suffix}`, { token });
  },
  listAllOrders,
  getOrder: (token: string, orderCode: string) =>
    requestParsed(orderSchema, `/api/v1/orders/${orderCode}`, { token }),
  confirmPurchase: (token: string, orderCode: string, itemID: number) =>
    requestParsed(orderSchema, `/api/v1/orders/${orderCode}/items/${itemID}/confirm-purchase`, { method: "POST", token }),
  createPaymentCheckout: async (token: string, orderCode: string) =>
    normalizePaymentCheckout(await requestParsed(
      rawPaymentCheckoutSchema,
      `/api/v1/orders/${orderCode}/payment-checkout`,
      {
        method: "POST",
        token,
      },
    )),
  trackDelivery: (token: string, orderCode: string, deliveryID: number) =>
    requestParsed(trackingInfoSchema, `/api/v1/orders/${orderCode}/deliveries/${deliveryID}/track`, { method: "POST", token }),
  createOrderLineReview: async (token: string, orderCode: string, itemID: number, payload: CreateOrderLineReviewPayload) =>
    normalizeReviewMutation(await requestParsed(
      rawReviewMutationSchema,
      `/api/v1/orders/${orderCode}/items/${itemID}/reviews`,
      {
        method: "POST",
        token,
        body: JSON.stringify(payload),
      },
    )),
  updateReview: async (token: string, reviewID: number, payload: { rating_x2?: number; content?: string }) =>
    normalizeReviewMutation(await requestParsed(
      rawReviewMutationSchema,
      `/api/v1/reviews/${reviewID}`,
      {
        method: "PATCH",
        token,
        body: JSON.stringify(payload),
      },
    )),
  deleteReview: (token: string, reviewID: number) =>
    requestVoid(`/api/v1/reviews/${reviewID}`, { method: "DELETE", token }),
  addWishlist: (token: string, productID: number) =>
    requestVoid(`/api/v1/products/${productID}/wishlist`, { method: "POST", token }),
  removeWishlist: (token: string, productID: number) =>
    requestVoid(`/api/v1/products/${productID}/wishlist`, { method: "DELETE", token }),
  addLike: (token: string, productID: number) =>
    requestVoid(`/api/v1/products/${productID}/like`, { method: "POST", token }),
  removeLike: (token: string, productID: number) =>
    requestVoid(`/api/v1/products/${productID}/like`, { method: "DELETE", token }),
  markNotificationRead: (token: string, notificationID: number) =>
    requestVoid(`/api/v1/notifications/${notificationID}/read`, { method: "POST", token }),
  getSettlementSummary: (token: string, marketID: number) =>
    requestParsed(rawSettlementSummarySchema, `/api/v1/settlements/${marketID}/summary`, { token })
      .then(normalizeSettlementSummary),
};
