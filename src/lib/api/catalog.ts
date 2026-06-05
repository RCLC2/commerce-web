import { request } from "../api-client";
import type { CommerceCategory, CommerceEvent, Market, Product, Review } from "../types";

export const catalogApi = {
  listMarkets: () => request<Market[]>("/api/v1/markets"),
  listCategories: () => request<CommerceCategory[]>("/api/v1/categories"),
  getMarket: (id: number) => request<Market>(`/api/v1/markets/${id}`),
  listEvents: () => request<CommerceEvent[]>("/api/v1/events"),
  getEvent: (id: number) => request<CommerceEvent>(`/api/v1/events/${id}`),
  listProducts: (params?: { categoryID?: number; sort?: string; q?: string }) => {
    const search = new URLSearchParams();
    if (params?.categoryID) {
      search.set("categoryID", String(params.categoryID));
    }
    if (params?.sort) {
      search.set("sort", params.sort);
    }
    if (params?.q) {
      search.set("q", params.q);
    }
    const query = search.toString();
    return request<Product[]>(`/api/v1/products${query ? `?${query}` : ""}`);
  },
  getProduct: (id: number) => request<Product>(`/api/v1/products/${id}`),
  getProductReviews: (id: number) => request<Review[]>(`/api/v1/products/${id}/reviews`),
};
