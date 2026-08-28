import { z } from "zod";
import { requestParsed, requestVoid } from "../api-client";
import type { PLPInformation, PLPProductPage, PLPProductParams } from "../types";
import {
  carouselSchema,
  categoryInformationSchema,
  categorySchema,
  eventSchema,
  homeCategoryChipSchema,
  homeSectionSchema,
  marketSchema,
  plpInformationSchema,
  plpProductPageSchema,
  plpProductSchema,
  productSchema,
  reviewSchema,
  reviewSummarySchema,
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
  (await requestParsed(z.array(plpProductSchema), path)).map(normalizePublicProduct);

export const catalogApi = {
  listMarkets: () => requestParsed(z.array(marketSchema), "/api/v1/markets"),
  listCategories: () => requestParsed(z.array(categorySchema), "/api/v1/categories"),
  getPLPInformation: (): Promise<PLPInformation> =>
    requestParsed(plpInformationSchema, "/api/v1/plp-information"),
  listPLPProducts: async (params: PLPProductParams = {}): Promise<PLPProductPage> => {
    const page = await requestParsed(plpProductPageSchema, plpProductsPath(params));
    return { ...page, items: page.items.map(normalizePublicProduct) };
  },
  listCategoryTree: () => requestParsed(z.array(categorySchema), "/api/v1/categories/tree"),
  getMarket: (id: number) => requestParsed(marketSchema, `/api/v1/markets/${id}`),
  getMarketFollowStatus: (token: string, id: number) =>
    requestParsed(z.object({ following: z.boolean() }), `/api/v1/markets/${id}/follow`, { token }),
  followMarket: (token: string, id: number) =>
    requestVoid(`/api/v1/markets/${id}/follow`, { method: "POST", token }),
  unfollowMarket: (token: string, id: number) =>
    requestVoid(`/api/v1/markets/${id}/follow`, { method: "DELETE", token }),
  getCategoryInformation: async (params: { category?: string; page?: number; pageSize?: number }) => {
    const search = new URLSearchParams({
      page: String(params.page ?? 1),
      page_size: String(params.pageSize ?? 8),
    });
    if (params.category) search.set("category", params.category);
    const information = await requestParsed(
      categoryInformationSchema,
      `/api/v1/category-information?${search.toString()}`,
    );
    return {
      ...information,
      products: information.products.map(normalizePublicProduct),
      realtime_popular_carousel: {
        ...information.realtime_popular_carousel,
        products: information.realtime_popular_carousel.products.map(normalizePublicProduct),
      },
    };
  },
  listEvents: () => requestParsed(z.array(eventSchema), "/api/v1/events"),
  listHomeSections: () => requestParsed(z.array(homeSectionSchema), "/api/v1/home/sections"),
  listHomeCategoryChips: () => requestParsed(z.array(homeCategoryChipSchema), "/api/v1/home/category-chips"),
  getEvent: (id: number) => requestParsed(eventSchema, `/api/v1/events/${id}`),
  listProducts: (params?: { categoryID?: number; marketID?: number; sort?: string; q?: string }) => {
    const search = new URLSearchParams();
    if (params?.marketID) search.set("marketID", String(params.marketID));
    if (params?.categoryID) search.set("categoryID", String(params.categoryID));
    if (params?.sort) search.set("sort", params.sort);
    if (params?.q) search.set("q", params.q);
    const query = search.toString();
    return parseProducts(`/api/v1/products${query ? `?${query}` : ""}`);
  },
  listPopularProducts: () => parseProducts("/api/v1/products/popular"),
  listPromotionProducts: () => parseProducts("/api/v1/products/promotions"),
  listRecommendedProducts: (params?: { limit?: number; offset?: number }) => {
    const search = new URLSearchParams();
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.offset !== undefined) search.set("offset", String(params.offset));
    const query = search.toString();
    return parseProducts(`/api/v1/products/recommendations${query ? `?${query}` : ""}`);
  },
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
  getProductReviewSummary: (id: number) =>
    requestParsed(reviewSummarySchema, `/api/v1/products/${id}/reviews/summary`),
  listActiveCarousels: () =>
    requestParsed(z.array(carouselSchema), "/api/v1/carousels/active"),
  recordCampaignClick: (campaignID: number) =>
    requestParsed(statusResponseSchema, `/api/v1/cms/campaigns/${campaignID}/click`, { method: "POST" }),
};

function discountPriceFromLowest(basePrice: number, lowestPrice?: number): number {
  return lowestPrice !== undefined && lowestPrice < basePrice ? lowestPrice : 0;
}

function plpProductsPath(params: PLPProductParams): string {
  const search = new URLSearchParams();
  if (params.categoryIDs?.length) search.set("category_ids", params.categoryIDs.join(","));
  if (params.marketId) search.set("market_id", String(params.marketId));
  if (params.minPrice) search.set("min_price", String(params.minPrice));
  if (params.maxPrice) search.set("max_price", String(params.maxPrice));
  if (params.shipping) search.set("shipping", params.shipping);
  if (params.onSale) search.set("on_sale", "true");
  if (params.inStock) search.set("in_stock", "true");
  if (params.tagChip) search.set("tag_chip", params.tagChip);
  if (params.sort) search.set("sort", params.sort);
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("page_size", String(params.pageSize));
  const query = search.toString();
  return `/api/v1/plp-products${query ? `?${query}` : ""}`;
}
