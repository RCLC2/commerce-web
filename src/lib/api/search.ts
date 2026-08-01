import { z } from "zod";
import { requestParsed } from "../api-client";
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
    return requestParsed(searchResponseSchema, `/api/v1/search?${query.toString()}`);
  },
  searchSuggestions: (q: string) =>
    requestParsed(z.array(searchSuggestionSchema), `/api/v1/search/suggestions?q=${encodeURIComponent(q)}`),
  trendingSearches: (segment: string) =>
    requestParsed(trendingSearchResponseSchema, `/api/v1/search/trending?segment=${encodeURIComponent(segment)}`),
};
