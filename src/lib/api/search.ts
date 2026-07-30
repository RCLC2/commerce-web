import { z } from "zod";
import { requestParsed } from "../api-client";
import { marketSchema, productSchema } from "./contracts/schemas";

const searchSuggestionSchema = z.object({
  id: z.string(),
  type: z.enum(["PRODUCT", "MARKET", "KEYWORD"]),
  label: z.string(),
  href: z.string(),
});
const searchResponseSchema = z.object({
  q: z.string(),
  products: z.array(productSchema),
  markets: z.array(marketSchema),
  suggestions: z.array(searchSuggestionSchema),
});
const trendingSearchResponseSchema = z.object({
  segment: z.string(),
  captured_at: z.string(),
  segments: z.array(z.string()),
  items: z.array(z.object({
    rank: z.number().int().positive(),
    keyword: z.string(),
    trend: z.enum(["UP", "DOWN", "SAME"]),
  })),
});

export const searchApi = {
  search: (q: string) =>
    requestParsed(searchResponseSchema, `/api/v1/search?q=${encodeURIComponent(q)}`),
  searchSuggestions: (q: string) =>
    requestParsed(z.array(searchSuggestionSchema), `/api/v1/search/suggestions?q=${encodeURIComponent(q)}`),
  trendingSearches: (segment: string) =>
    requestParsed(trendingSearchResponseSchema, `/api/v1/search/trending?segment=${encodeURIComponent(segment)}`),
};
