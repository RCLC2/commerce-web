import { z } from "zod";
import { ApiHttpError, requestParsed } from "../api-client";
import type { CommerceCategory, PLPInformation, PLPProductPage, PLPProductParams, Product } from "../types";
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
  plpInformationSchema,
  plpProductPageSchema,
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
  getPLPInformation: async (): Promise<PLPInformation> => {
    try {
      return await requestParsed(plpInformationSchema, "/api/v1/plp-information");
    } catch (error) {
      if (isNotFound(error)) return dummyPLPInformation;
      throw error;
    }
  },
  listPLPProducts: async (params: PLPProductParams = {}): Promise<PLPProductPage> => {
    const path = plpProductsPath(params);
    try {
      const page = await requestParsed(plpProductPageSchema, path);
      return { ...page, items: page.items.map(normalizePublicProduct) };
    } catch (error) {
      if (isNotFound(error)) return dummyPLPPage(params);
      throw error;
    }
  },
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

function isNotFound(error: unknown): boolean {
  return (error instanceof ApiHttpError && error.status === 404)
    || (typeof error === "object" && error !== null && "status" in error && error.status === 404);
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

const dummyCategories: CommerceCategory[] = [
  { id: 1, name: "원피스", slug: "dress", href: "/products?category=dress", depth: 0, level: 1, sort_order: 1, category_ids: [1] },
  { id: 2, name: "상의", slug: "tops", href: "/products?category=tops", depth: 0, level: 1, sort_order: 2, category_ids: [2] },
  { id: 3, name: "아우터", slug: "outer", href: "/products?category=outer", depth: 0, level: 1, sort_order: 3, category_ids: [3] },
  { id: 4, name: "팬츠", slug: "pants", href: "/products?category=pants", depth: 0, level: 1, sort_order: 4, category_ids: [4] },
];

const dummyMarkets = [
  { id: 1, name: "아틀리에 여름" },
  { id: 2, name: "모던 데이" },
  { id: 3, name: "스튜디오 마레" },
];

const dummyProducts: Product[] = Array.from({ length: 31 }, (_, index) => {
  const market = dummyMarkets[index % dummyMarkets.length];
  const basePrice = 39000 + (index % 7) * 10000;
  const discounted = index % 3 !== 0;
  const tagChips = [
    ...(index % 2 === 0 ? [{ code: "FREE_SHIPPING", label: "무료배송", tone: "shipping" }] : []),
    ...(index % 4 === 0 ? [{ code: "TODAY_SHIPPING", label: "오늘출발", tone: "delivery" }] : []),
    ...(index % 5 === 0 ? [{ code: "EXCLUSIVE_DEAL", label: "단독특가", tone: "promotion" }] : []),
  ];
  return {
    id: index + 1,
    market_id: market.id,
    market_name: market.name,
    category_id: (index % dummyCategories.length) + 1,
    name: ["린넨 셔츠 원피스", "여름 크롭 셔츠", "라이트 윈드 재킷", "와이드 코튼 팬츠"][index % 4] + ` ${index + 1}`,
    description: "404 개발 폴백용 PLP 상품입니다.",
    image_url: [
      "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=800&q=80",
    ][index % 4],
    base_price: basePrice,
    discount_price: discounted ? basePrice - 8000 : 0,
    shipping_type: index % 2 === 0 ? "FREE" : "NORMAL",
    popularity_score: 100 - index,
    status: "SELLING" as const,
    in_stock: index % 6 !== 0,
    tag_chips: tagChips,
  };
});

const dummyPLPInformation: PLPInformation = {
  categories: dummyCategories,
  total_product_count: dummyProducts.length,
  price_ranges: [
    { code: "", label: "전체 가격", min_price: 0, max_price: 0 },
    { code: "under-30000", label: "3만원 이하", min_price: 0, max_price: 30_000 },
    { code: "30000-50000", label: "3–5만원", min_price: 30_000, max_price: 50_000 },
    { code: "over-50000", label: "5만원 이상", min_price: 50_000, max_price: 0 },
  ],
  sort_options: [
    { code: "popular", label: "인기순" },
    { code: "new", label: "신상품순" },
    { code: "price-low", label: "낮은 가격순" },
    { code: "price-high", label: "높은 가격순" },
  ],
  default_sort: "popular",
  tag_chips: [
    { code: "FREE_SHIPPING", label: "무료배송", tone: "shipping" },
    { code: "TODAY_SHIPPING", label: "오늘출발", tone: "delivery" },
    { code: "EXCLUSIVE_DEAL", label: "단독특가", tone: "promotion" },
  ],
  is_dummy: true,
};

function dummyPLPPage(params: PLPProductParams): PLPProductPage {
  const price = (product: Product) => product.discount_price || product.base_price;
  let items = dummyProducts.filter((product) =>
    (!params.categoryIDs?.length || params.categoryIDs.includes(product.category_id))
    && (!params.marketId || product.market_id === params.marketId)
    && (!params.minPrice || price(product) >= params.minPrice)
    && (!params.maxPrice || price(product) <= params.maxPrice)
    && (!params.shipping || product.shipping_type === "FREE")
    && (!params.onSale || product.discount_price > 0)
    && (!params.inStock || product.in_stock)
    && (!params.tagChip || product.tag_chips?.some((chip) => chip.code === params.tagChip)),
  );
  items = [...items].sort((a, b) => {
    if (params.sort === "price-low") return price(a) - price(b);
    if (params.sort === "price-high") return price(b) - price(a);
    if (params.sort === "new") return b.id - a.id;
    return b.popularity_score - a.popularity_score;
  });
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(60, Math.max(1, params.pageSize ?? 24));
  const total = items.length;
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    page,
    page_size: pageSize,
    total,
    total_pages: total ? Math.ceil(total / pageSize) : 0,
    is_dummy: true,
  };
}
