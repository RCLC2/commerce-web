import { request } from "../api-client";
import type { SearchResponse, SearchSuggestion, TrendingSearchResponse } from "../types";

export const searchApi = {
  search: (q: string) => request<SearchResponse>(`/api/v1/search?q=${encodeURIComponent(q)}`),
  searchSuggestions: (q: string) =>
    request<SearchSuggestion[]>(`/api/v1/search/suggestions?q=${encodeURIComponent(q)}`),
  trendingSearches: (segment: string) =>
    request<TrendingSearchResponse>(`/api/v1/search/trending?segment=${encodeURIComponent(segment)}`),
};
