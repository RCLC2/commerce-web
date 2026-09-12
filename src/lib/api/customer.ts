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
  rawIssuableCouponQuoteSchema,
  rawOwnedCouponSchema,
  rawPaymentRequestSchema,
  rawReviewMutationSchema,
  rawSettlementSummarySchema,
} from "./contracts/raw";
import {
  normalizeAddress,
  normalizeCartItem,
  normalizeCouponDefinition,
  normalizeIssuableCouponQuote,
  normalizeOwnedCoupon,
  normalizePaymentRequest,
  normalizePublicProduct,
  normalizeReviewMutation,
  normalizeSettlementSummary,
} from "./normalizers/contracts";

export type CreateOrderLineReviewPayload = {
  rating_x2: number;
  content: string;
  images?: { s3_key?: string; object_key?: string; sort_order: number; is_representative: boolean }[];
};

export type CustomerOrderListStatus = "PAYMENT_PENDING" | "PAID" | "PLACED" | "CANCELLED";

const rawReviewPageSchema = z.object({
  items: z.array(rawReviewMutationSchema),
  next_cursor: z.string().optional(),
});

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

async function collectCursorPages<T>(loadPage: (cursor?: string) => Promise<{ items: T[]; next_cursor?: string }>) {
  const items: T[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | undefined;
  while (true) {
    const page = await loadPage(cursor);
    items.push(...page.items);
    const nextCursor = page.next_cursor;
    if (!nextCursor || seenCursors.has(nextCursor)) return items;
    seenCursors.add(nextCursor);
    cursor = nextCursor;
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
  updateCartItems: async (token: string, payload: { cart_item_ids: number[]; option_id: number; quantity: number }) =>
    normalizeCartItem(await requestParsed(rawCartSchema, "/api/v1/cart/items", {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
    })),
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
  updateAddress: (token: string, addressID: number, payload: { address_name?: string; receiver: string; phone: string; zip_code: string; line1: string; line2: string; is_default: boolean }) =>
    requestVoid(`/api/v1/me/addresses/${addressID}`, { method: "PATCH", token, body: JSON.stringify(payload) }),
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
  listNotifications: async (token: string) => {
    const items: z.infer<typeof inboxNotificationSchema>[] = [];
    let cursor: string | undefined;
    do {
      const page = await customerApi.getNotificationPage(token, cursor);
      items.push(...page.items);
      cursor = page.next_cursor;
    } while (cursor);
    return items;
  },
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
  markNotificationRead: (token: string, notificationID: number) =>
    requestVoid(`/api/v1/notifications/${notificationID}/read`, { method: "POST", token }),
  getSettlementSummary: (token: string, marketID: number) =>
    requestParsed(rawSettlementSummarySchema, `/api/v1/settlements/${marketID}/summary`, { token })
      .then(normalizeSettlementSummary),
};
