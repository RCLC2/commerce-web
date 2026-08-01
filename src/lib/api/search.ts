import { z } from "zod";
import { ApiHttpError, requestParsed } from "../api-client";
import { marketSchema, productSchema } from "./contracts/schemas";

const searchSuggestionSchema = z.object({
  id: z.string(),
  type: z.enum(["PRODUCT", "MARKET", "KEYWORD"]),
  label: z.string(),
  href: z.string(),
});
const pageSchema = <T extends z.ZodTypeAny>(itemSchema: T) => z.object({
  items: z.array(itemSchema),
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  total_pages: z.number().int().nonnegative(),
});
const searchMarketSchema = marketSchema.extend({
  satisfaction_rate: z.number().min(0).max(100).optional(),
  average_product_rating: z.number().min(0).max(5).optional(),
  product_count: z.number().int().nonnegative().optional(),
  new_product_count: z.number().int().nonnegative().optional(),
  popular_products: z.array(productSchema).optional(),
});
const searchSectionSchema = z.object({
  id: z.number().int().positive(),
  sequence: z.number().int(),
  title: z.string(),
  section_type: z.enum(["PRODUCT_CAROUSEL", "MARKET_CAROUSEL"]),
  products: z.array(productSchema).optional(),
  markets: z.array(searchMarketSchema).optional(),
});
const searchResponseSchema = z.object({
  q: z.string(),
  products: pageSchema(productSchema),
  markets: pageSchema(searchMarketSchema),
  suggestions: z.array(searchSuggestionSchema),
  related_keywords: z.array(z.string()),
  sections: z.array(searchSectionSchema),
});
const trendingSearchResponseSchema = z.object({
  segment: z.enum(["all", "women", "men"]),
  segments: z.array(z.object({ id: z.enum(["women", "men"]), label: z.string() })),
  items: z.array(z.object({
    rank: z.number().int().positive(),
    keyword: z.string(),
    trend: z.enum(["UP", "DOWN", "SAME"]),
  })),
});

export type SearchParams = {
  q: string;
  audience?: "women" | "men";
  productPage?: number;
  marketPage?: number;
  pageSize?: number;
};

export const searchApi = {
  search: (params: SearchParams) => {
    const query = new URLSearchParams({ q: params.q });
    if (params.audience) query.set("audience", params.audience);
    if (params.productPage) query.set("product_page", String(params.productPage));
    if (params.marketPage) query.set("market_page", String(params.marketPage));
    if (params.pageSize) query.set("page_size", String(params.pageSize));
    const path = `/api/v1/search?${query.toString()}`;
    return with404Fallback(
      () => requestParsed(searchResponseSchema, path),
      () => dummySearchResponse(params),
    );
  },
  searchSuggestions: (q: string) => {
    const path = `/api/v1/search/suggestions?q=${encodeURIComponent(q)}`;
    return with404Fallback(
      () => requestParsed(z.array(searchSuggestionSchema), path),
      () => dummySuggestions(q),
    );
  },
  trendingSearches: (segment: string) => {
    const path = `/api/v1/search/trending?segment=${encodeURIComponent(segment)}`;
    return with404Fallback(
      () => requestParsed(trendingSearchResponseSchema, path),
      () => dummyTrending(segment),
    );
  },
};

async function with404Fallback<T>(request: () => Promise<T>, fallback: () => T): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (error instanceof ApiHttpError && error.status === 404) return fallback();
    throw error;
  }
}

function dummyProduct(id: number, query: string) {
  const names = ["오버핏 코튼 셔츠", "데일리 와이드 팬츠", "레이어드 니트 베스트", "라이트 윈드 재킷"];
  return {
    id,
    market_id: (id % 4) + 1,
    category_id: (id % 3) + 1,
    name: `${query || "신상"} ${names[id % names.length]}`,
    description: "검색 화면 점검을 위한 404 전용 더미 상품입니다.",
    base_price: 39000 + (id % 5) * 8000,
    discount_price: 29000 + (id % 5) * 6000,
    shipping_type: id % 2 ? "FREE" : "NORMAL",
    popularity_score: 100 - id,
    status: "SELLING" as const,
    tags: id % 2 ? ["오늘출발", "신상"] : ["베스트"],
  };
}

function dummyMarket(id: number) {
  const availableProductCount = [1, 2, 8, 15][id % 4];
  const previewProductCount = Math.min(3, availableProductCount);
  return {
    id,
    member_id: id,
    name: ["모노 스튜디오", "어반 데이", "클로젯 101", "아틀리에 온"][id % 4],
    description: "검색 화면 점검을 위한 404 전용 더미 마켓입니다.",
    follower_count: 1200 + id * 137,
    satisfaction_rate: 93 + (id % 6),
    average_product_rating: 4.3 + (id % 6) / 10,
    product_count: availableProductCount,
    new_product_count: Math.min(availableProductCount, 1 + (id % 3)),
    popular_products: Array.from({ length: previewProductCount }, (_, index) => dummyProduct(id * 10 + index + 1, index === 0 ? "인기" : "기존")),
    status: "OPEN",
    tags: ["스폰서"],
  };
}

function dummySearchResponse(params: SearchParams): z.infer<typeof searchResponseSchema> {
  const pageSize = params.pageSize ?? 12;
  const marketPageSize = Math.min(pageSize, 4);
  const productPage = params.productPage ?? 1;
  const marketPage = params.marketPage ?? 1;
  const productTotal = 27;
  const marketTotal = 9;
  const products = Array.from({ length: Math.max(0, Math.min(pageSize, productTotal - (productPage - 1) * pageSize)) }, (_, index) =>
    dummyProduct((productPage - 1) * pageSize + index + 1, params.q));
  const markets = Array.from({ length: Math.max(0, Math.min(marketPageSize, marketTotal - (marketPage - 1) * marketPageSize)) }, (_, index) =>
    dummyMarket((marketPage - 1) * marketPageSize + index + 1));
  return {
    q: params.q,
    products: { items: products, page: productPage, page_size: pageSize, total: productTotal, total_pages: Math.ceil(productTotal / pageSize) },
    markets: { items: markets, page: marketPage, page_size: marketPageSize, total: marketTotal, total_pages: Math.ceil(marketTotal / marketPageSize) },
    suggestions: dummySuggestions(params.q),
    related_keywords: ["여름", "데일리", "오버핏", "무료배송"].map((prefix) => `${prefix} ${params.q}`.trim()),
    sections: [
      { id: 1, sequence: 10, title: `${params.q} 연관 상품`, section_type: "PRODUCT_CAROUSEL", products: products.slice(0, 8) },
      { id: 2, sequence: 20, title: "주목할 스폰서 마켓", section_type: "MARKET_CAROUSEL", markets: markets.slice(0, 8) },
    ],
  };
}

function dummySuggestions(q: string): z.infer<typeof searchSuggestionSchema>[] {
  if (!q.trim()) return [];
  return [
    { id: `keyword-${q}`, type: "KEYWORD", label: q, href: `/search?q=${encodeURIComponent(q)}` },
    { id: "product-dummy", type: "PRODUCT", label: `${q} 오버핏 셔츠`, href: "/products/1" },
    { id: "market-dummy", type: "MARKET", label: "모노 스튜디오", href: "/markets/1" },
  ];
}

function dummyTrending(segment: string): z.infer<typeof trendingSearchResponseSchema> {
  const selected = segment === "men" ? "men" : "women";
  const keywords = selected === "women" ? ["여름 원피스", "반팔 니트", "리넨 셔츠", "샌들"] : ["반팔 셔츠", "와이드 팬츠", "러닝화", "카라 니트"];
  return {
    segment: selected,
    segments: [{ id: "women", label: "여성" }, { id: "men", label: "남성" }],
    items: keywords.map((keyword, index) => ({ rank: index + 1, keyword, trend: (["UP", "SAME", "DOWN", "UP"] as const)[index] })),
  };
}