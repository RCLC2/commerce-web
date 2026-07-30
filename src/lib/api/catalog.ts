import { z } from "zod";
import { requestParsed } from "../api-client";
import {
  carouselSchema,
  categorySchema,
  eventSchema,
  homeSectionSchema,
  instagramTrendPageSchema,
  marketSchema,
  productSchema,
  reviewSchema,
  statusResponseSchema,
} from "./contracts/schemas";
import { normalizePublicProduct } from "./normalizers/contracts";

const productDetailSchema = z.object({
  product: productSchema,
  lowest_price: z.number().int().nonnegative().optional(),
  delivery_type: z.string().optional(),
  delivery_label: z.string().optional(),
  today_shipping_available: z.boolean().optional(),
});

const parseProducts = async (path: string) =>
  (await requestParsed(z.array(productSchema), path)).map(normalizePublicProduct);

export const catalogApi = {
  listMarkets: () => requestParsed(z.array(marketSchema), "/api/v1/markets"),
  listCategories: () => requestParsed(z.array(categorySchema), "/api/v1/categories"),
  listCategoryTree: () => requestParsed(z.array(categorySchema), "/api/v1/categories/tree"),
  getMarket: (id: number) => requestParsed(marketSchema, `/api/v1/markets/${id}`),
  listEvents: () => requestParsed(z.array(eventSchema), "/api/v1/events"),
  listHomeSections: () =>
    requestParsed(z.array(homeSectionSchema), "/api/v1/home/sections"),
  listTrendPosts: (params?: { limit?: number; after?: string; hashtag?: string }) => {
    const search = new URLSearchParams();
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.after) search.set("after", params.after);
    if (params?.hashtag) search.set("hashtag", params.hashtag);
    const query = search.toString();
    return requestParsed(
      instagramTrendPageSchema,
      `/api/v1/trends/posts${query ? `?${query}` : ""}`,
    );
  },
  getEvent: (id: number) => requestParsed(eventSchema, `/api/v1/events/${id}`),
  listProducts: (params?: { categoryID?: number; sort?: string; q?: string }) => {
    const search = new URLSearchParams();
    if (params?.categoryID) search.set("categoryID", String(params.categoryID));
    if (params?.sort) search.set("sort", params.sort);
    if (params?.q) search.set("q", params.q);
    const query = search.toString();
    return parseProducts(`/api/v1/products${query ? `?${query}` : ""}`);
  },
  listPopularProducts: () => parseProducts("/api/v1/products/popular"),
  listPromotionProducts: () => parseProducts("/api/v1/products/promotions"),
  listRecommendedProducts: () => parseProducts("/api/v1/products/recommendations"),
  listLatestProducts: () => parseProducts("/api/v1/products/latest"),
  getProduct: (id: number) =>
    requestParsed(productDetailSchema, `/api/v1/products/${id}`).then((detail) => normalizePublicProduct({
      ...detail.product,
      discount_price: detail.product.discount_price
        || discountPriceFromLowest(detail.product.base_price, detail.lowest_price),
      shipping_type: detail.product.shipping_type || detail.delivery_type || "NORMAL",
      delivery_type: detail.delivery_type ?? detail.product.delivery_type,
      delivery_label: detail.delivery_label ?? detail.product.delivery_label,
      today_shipping_available:
        detail.today_shipping_available ?? detail.product.today_shipping_available,
    })),
  getProductReviews: (id: number) =>
    requestParsed(z.array(reviewSchema), `/api/v1/products/${id}/reviews`),
  listActiveCarousels: () =>
    requestParsed(z.array(carouselSchema), "/api/v1/carousels/active"),
  recordCampaignClick: (campaignID: number) =>
    requestParsed(statusResponseSchema, `/api/v1/cms/campaigns/${campaignID}/click`, { method: "POST" }),
};

function discountPriceFromLowest(basePrice: number, lowestPrice?: number): number {
  return lowestPrice !== undefined && lowestPrice < basePrice ? lowestPrice : 0;
}
