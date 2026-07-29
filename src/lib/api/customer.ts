import { z } from "zod";
import { requestParsed, requestVoid } from "../api-client";
import {
  couponDefinitionSchema,
  issuableCouponQuoteSchema,
  notificationSchema,
  orderSchema,
  ownedCouponSchema,
  productSchema,
  recommendationSchema,
  reviewImageSchema,
  reviewSchema,
  statusResponseSchema,
  trackingInfoSchema,
} from "./contracts/schemas";
import { rawAddressSchema, rawCartSchema } from "./contracts/raw";
import { normalizeAddress, normalizeCartItem, normalizeCouponDefinition } from "./normalizers/contracts";

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

const createReviewResponseSchema = z.object({
  id: z.number().int().positive(),
  product_id: z.number().int().positive(),
  option_id: z.number().int().positive(),
  member_id: z.number().int().positive(),
  order_id: z.number().int().positive(),
  order_line_item_id: z.number().int().positive(),
  rating_x2: z.number().int(),
  rating: z.number(),
  content: z.string(),
  height_at_time: z.number().nullable().optional(),
  weight_at_time: z.number().nullable().optional(),
  is_photo_review: z.boolean(),
  status: z.string(),
  images: z.array(reviewImageSchema),
  created_at: z.string(),
});

const settlementSummarySchema = z.looseObject({
  market_id: z.number().int().positive(),
  total_sales_amount: z.number().optional(),
  commission_amount: z.number().optional(),
  final_settlement_amount: z.number().optional(),
  pending_amount: z.number().optional(),
  paid_amount: z.number().optional(),
});

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
    (await requestParsed(z.array(ownedCouponSchema), "/api/v1/coupons", { token })).map((owned) => ({
      ...owned,
      coupon: normalizeCouponDefinition(owned.coupon),
    })),
  listIssuableCoupons: async (token: string) =>
    (await requestParsed(z.array(couponDefinitionSchema), "/api/v1/coupons/issuable", { token }))
      .map(normalizeCouponDefinition),
  listIssuableCouponQuotes: async (token: string, orderAmount: number) =>
    (await requestParsed(
      z.array(issuableCouponQuoteSchema),
      `/api/v1/coupons/issuable?order_amount=${Math.max(0, Math.floor(orderAmount))}`,
      { token },
    )).map((quote) => ({ ...quote, coupon: normalizeCouponDefinition(quote.coupon) })),
  issueCoupon: (token: string, couponID: number) =>
    requestVoid(`/api/v1/coupons/${couponID}/issue`, { method: "POST", token }),
  listAddresses: async (token: string) =>
    (await requestParsed(z.array(rawAddressSchema), "/api/v1/me/addresses", { token })).map(normalizeAddress),
  listNotifications: (token: string) => requestParsed(z.array(notificationSchema), "/api/v1/me/notifications", { token }),
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
  listMyReviews: (token: string) => requestParsed(z.array(reviewSchema), "/api/v1/me/reviews", { token }),
  confirmPurchase: (token: string, orderCode: string, itemID: number) =>
    requestParsed(orderSchema, `/api/v1/orders/${orderCode}/items/${itemID}/confirm-purchase`, { method: "POST", token }),
  createPaymentCheckout: (token: string, orderCode: string) =>
    requestParsed(
      z.object({ checkout_url: z.string().optional(), url: z.string().optional() }),
      `/api/v1/orders/${orderCode}/payment-checkout`,
      { method: "POST", token },
    ),
  trackDelivery: (token: string, orderCode: string, deliveryID: number) =>
    requestParsed(trackingInfoSchema, `/api/v1/orders/${orderCode}/deliveries/${deliveryID}/track`, { method: "POST", token }),
  createOrderLineReview: (token: string, orderCode: string, itemID: number, payload: CreateOrderLineReviewPayload) =>
    requestParsed(createReviewResponseSchema, `/api/v1/orders/${orderCode}/items/${itemID}/reviews`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  updateReview: (token: string, reviewID: number, payload: { rating_x2?: number; content?: string }) =>
    requestParsed(reviewSchema, `/api/v1/reviews/${reviewID}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
    }),
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
    requestParsed(settlementSummarySchema, `/api/v1/settlements/${marketID}/summary`, { token }),
  completePayment: (
    token: string,
    orderCode: string,
    payload: { payment_method: string; payment_key: string; amount: number },
  ) =>
    requestParsed(
      z.object({ orderCode: z.string(), status: z.string() }),
      `/api/v1/orders/${orderCode}/complete-payment`,
      { method: "POST", token, body: JSON.stringify(payload) },
    ),
};
