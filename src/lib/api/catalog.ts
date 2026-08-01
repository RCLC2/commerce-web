import { z } from "zod";
import { ApiHttpError, requestParsed } from "../api-client";
import { demoCategoryInformation, demoMarket, demoMarketProducts } from "../category-information-demo";
import { fallbackHomeCategoryChips } from "../home-category-chip-fallback";
import {
  fallbackHomeEvents,
  fallbackHomeProducts,
  fallbackHomeSections,
} from "../home-preview-fallback";
import {
  carouselSchema,
  categoryInformationSchema,
  categorySchema,
  eventSchema,
  homeCategoryChipSchema,
  homeSectionSchema,
  instagramTrendPageSchema,
  marketSchema,
  plpProductSchema,
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
  (await requestParsed(z.array(plpProductSchema), path)).map(normalizePublicProduct);

async function with404Fallback<T>(request: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (error instanceof ApiHttpError && error.status === 404) return fallback;
    throw error;
  }
}

export const catalogApi = {
  listMarkets: () => requestParsed(z.array(marketSchema), "/api/v1/markets"),
  listCategories: () => requestParsed(z.array(categorySchema), "/api/v1/categories"),
  listCategoryTree: () => requestParsed(z.array(categorySchema), "/api/v1/categories/tree"),
  getMarket: async (id: number) => {
    try {
      return await requestParsed(marketSchema, `/api/v1/markets/${id}`);
    } catch (error) {
      if (error instanceof ApiHttpError && error.status === 404) {
        return demoMarket(id);
      }
      throw error;
    }
  },
  getCategoryInformation: async (params: { category?: string; page?: number; pageSize?: number }) => {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 8;
    const search = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    if (params.category) search.set("category", params.category);
    try {
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
    } catch (error) {
      if (error instanceof ApiHttpError && error.status === 404) {
        return demoCategoryInformation(params.category ?? "", page, pageSize);
      }
      throw error;
    }
  },
  listEvents: () => with404Fallback(
    () => requestParsed(z.array(eventSchema), "/api/v1/events"),
    fallbackHomeEvents,
  ),
  listHomeSections: () => with404Fallback(
    () => requestParsed(z.array(homeSectionSchema), "/api/v1/home/sections"),
    fallbackHomeSections,
  ),
  listHomeCategoryChips: () => with404Fallback(
    () => requestParsed(z.array(homeCategoryChipSchema), "/api/v1/home/category-chips"),
    fallbackHomeCategoryChips,
  ),
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
  getEvent: async (id: number) => {
    const previewEvent = fallbackHomeEvents.find((event) => event.id === id);

    try {
      return await requestParsed(eventSchema, `/api/v1/events/${id}`);
    } catch (error) {
      if (
        error instanceof ApiHttpError
        && error.status === 404
        && previewEvent
      ) {
        return previewEvent;
      }
      throw error;
    }
  },
  listProducts: async (params?: { categoryID?: number; marketID?: number; sort?: string; q?: string }) => {
    const search = new URLSearchParams();
    if (params?.marketID) search.set("marketID", String(params.marketID));
    if (params?.categoryID) search.set("categoryID", String(params.categoryID));
    if (params?.sort) search.set("sort", params.sort);
    if (params?.q) search.set("q", params.q);
    const query = search.toString();
    try {
      return await parseProducts(`/api/v1/products${query ? `?${query}` : ""}`);
    } catch (error) {
      if (error instanceof ApiHttpError && error.status === 404) {
        if (params?.marketID) {
          return demoMarketProducts(params.marketID);
        }
        return fallbackHomeProducts
          .filter((product) => !params?.categoryID || product.category_id === params.categoryID)
          .filter((product) => !params?.q || product.name.includes(params.q));
      }
      throw error;
    }
  },
  listPopularProducts: () => with404Fallback(
    () => parseProducts("/api/v1/products/popular"),
    fallbackHomeProducts.slice(0, 10),
  ),
  listPromotionProducts: () => with404Fallback(
    () => parseProducts("/api/v1/products/promotions"),
    fallbackHomeProducts.slice(10, 20),
  ),
  listRecommendedProducts: (params?: { limit?: number; offset?: number }) => {
    const search = new URLSearchParams();
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.offset !== undefined) search.set("offset", String(params.offset));
    const query = search.toString();
    const limit = params?.limit ?? fallbackHomeProducts.length;
    const offset = params?.offset ?? 0;
    return with404Fallback(
      () => parseProducts(`/api/v1/products/recommendations${query ? `?${query}` : ""}`),
      fallbackHomeProducts.slice(offset, offset + limit),
    );
  },
  listLatestProducts: () => with404Fallback(
    () => parseProducts("/api/v1/products/latest"),
    fallbackHomeProducts.slice(20, 30),
  ),
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
