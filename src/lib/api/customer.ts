import { orderQuoteSchema, type UpdateCartItemGroupRequest, type CreateShippingAddressRequest, type OrderQuoteRequest } from "./checkout-contracts";
import { z } from "zod";
import { requestParsed, requestVoid } from "../api-client";
import {
  orderSchema,
  marketFeedResponseSchema,
  productSchema,
  recommendationSchema,
  statusResponseSchema,
  trackingInfoSchema,
} from "./contracts/schemas";
import {
  rawAddressSchema,
  rawCartSchema,
  rawCouponDefinitionSchema,
  rawOwnedCouponSchema,
  rawPaymentRequestSchema,
  rawReviewMutationSchema,
} from "./contracts/raw";
import {
  normalizeAddress,
  normalizeCartItem,
  normalizeCouponDefinition,
  normalizeOwnedCoupon,
  normalizePaymentRequest,
  normalizePublicProduct,
  normalizeReviewMutation,
} from "./normalizers/contracts";

export type CreateOrderLineReviewPayload = {
  rating_x2: number;
  content: string;
  images?: { s3_key?: string; object_key?: string; sort_order: number; is_representative: boolean }[];
};

const inboxNotificationSchema = z.object({
  id: z.number().int().positive(),
  member_id: z.number().int().positive(),
  message_id: z.number().int().positive(),
  created_at: z.string(),
  read_at: z.string().nullable().optional(),
  toast_shown_at: z.string().nullable().optional(),
  message: z.object({
    id: z.number().int().positive(),
    kind: z.enum(["INFORMATION", "MARKETING"]),
    title: z.string(),
    body: z.string(),
    destination_path: z.string(),
    toast_enabled: z.boolean(),
    toast_expires_at: z.string().nullable().optional(),
  }),
});

const inboxNotificationPageSchema = z.object({
  items: z.array(inboxNotificationSchema),
  next_cursor: z.string().optional(),
  read_through: z.string(),
});

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

export const customerApi = {
  addCartItem: (token: string, payload: { product_id: number; option_id: number; quantity: number }) =>
    requestParsed(statusResponseSchema, "/api/v1/cart/items", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  listCart: async (token: string) =>
    (await requestParsed(z.array(rawCartSchema), "/api/v1/cart", { token })).map(normalizeCartItem),
  updateCartItems: async (token: string, payload: UpdateCartItemGroupRequest) =>
    normalizeCartItem(await requestParsed(rawCartSchema, "/api/v1/cart/items", {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
    })),
  removeCartItems: (token: string, cartItemIDs: number[]) =>
    requestVoid("/api/v1/cart/items", { method: "DELETE", token, body: JSON.stringify({ cart_item_ids: cartItemIDs }) }),
  listCoupons: async (token: string) =>
    (await requestParsed(z.array(rawOwnedCouponSchema), "/api/v1/coupons", { token }))
      .map((coupon) => normalizeOwnedCoupon(coupon)),
  listIssuableCoupons: async (token: string) =>
    (await requestParsed(z.array(rawCouponDefinitionSchema), "/api/v1/coupons/issuable", { token }))
      .map(normalizeCouponDefinition),
  issueCoupon: (token: string, couponID: number) =>
    requestVoid(`/api/v1/coupons/${couponID}/issue`, { method: "POST", token }),
  listAddresses: async (token: string) =>
    (await requestParsed(z.array(rawAddressSchema), "/api/v1/me/addresses", { token })).map(normalizeAddress),
  createAddress: async (token: string, payload: CreateShippingAddressRequest) =>
    normalizeAddress(await requestParsed(rawAddressSchema, "/api/v1/me/addresses", { method: "POST", token, body: JSON.stringify(payload) })),
  listMyReviews: async (token: string) =>
    (await requestParsed(z.array(rawReviewMutationSchema), "/api/v1/me/reviews", { token })).map(normalizeReviewMutation),
  getNotificationPage: (token: string, cursor?: string) => requestParsed(
    inboxNotificationPageSchema,
    `/api/v1/me/notifications?limit=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    { token },
  ),
  unreadNotificationCount: (token: string) => requestParsed(z.object({ unread_count: z.number().int().nonnegative() }), "/api/v1/me/notifications/unread-count", { token }),
  markAllNotificationsRead: (token: string, readThrough: string) => requestVoid("/api/v1/notifications/read-all", { method: "POST", token, body: JSON.stringify({ read_through: readThrough }) }),
  acknowledgeNotificationToasts: (token: string, notificationIDs: number[]) => requestVoid("/api/v1/notifications/toast-ack", { method: "POST", token, body: JSON.stringify({ notification_ids: notificationIDs }) }),
  listMyRecommendations: async (token: string, params: { limit?: number; offset?: number } = {}) => {
    const search = new URLSearchParams();
    if (params.limit) search.set("limit", String(params.limit));
    if (params.offset !== undefined) search.set("offset", String(params.offset));
    const query = search.toString();
    const recommendations = await requestParsed(
      z.array(recommendationSchema),
      `/api/v1/me/recommendations${query ? `?${query}` : ""}`,
      { token },
    );
    return recommendations.map((recommendation) => ({
      ...recommendation,
      product: normalizePublicProduct(recommendation.product),
    }));
  },
  listMarketFeed: async (token: string, params: { limit?: number; cursor?: string } = {}) => {
    const search = new URLSearchParams();
    if (params.limit) search.set("limit", String(params.limit));
    if (params.cursor) search.set("cursor", params.cursor);
    const query = search.toString();
    const feed = await requestParsed(
      marketFeedResponseSchema,
      `/api/v1/me/market-feed${query ? `?${query}` : ""}`,
      { token },
    );
    return {
      ...feed,
      items: feed.items.map((item) => ({ ...item, product: normalizePublicProduct(item.product) })),
    };
  },
  listWishlistedProducts: (token: string) => requestParsed(z.array(productSchema), "/api/v1/me/wishlist", { token }),
  listLikedProducts: (token: string) => requestParsed(z.array(productSchema), "/api/v1/me/liked-products", { token }),
  placeOrder: (token: string, payload: { cart_item_ids: number[]; used_coupon_id?: number; used_point: number; shipping_address?: { receiver: string; phone: string; zip_code: string; line1: string; line2: string } }) =>
    requestParsed(z.object({ orderCode: z.string().min(1) }), "/api/v1/orders", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  quoteOrder: (token: string, payload: OrderQuoteRequest) =>
    requestParsed(orderQuoteSchema, "/api/v1/orders/quote", { method: "POST", token, body: JSON.stringify(payload) }),
  listAllOrders,
  getOrder: (token: string, orderCode: string) =>
    requestParsed(orderSchema, `/api/v1/orders/${orderCode}`, { token }),
  confirmPurchase: (token: string, orderCode: string, itemID: number) =>
    requestParsed(orderSchema, `/api/v1/orders/${orderCode}/items/${itemID}/confirm-purchase`, { method: "POST", token }),
  createPaymentRequest: async (token: string, orderCode: string) =>
    normalizePaymentRequest(await requestParsed(
      rawPaymentRequestSchema,
      `/api/v1/orders/${orderCode}/payment-request`,
      {
        method: "POST",
        token,
      },
    )),
  completePayment: (token: string, orderCode: string, payload: { payment_key: string; order_id: string; amount: number }) =>
    requestVoid(`/api/v1/orders/${orderCode}/complete-payment`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
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
};
