import { request } from "../api-client";
import type { CMSCarousel, CommerceCategory, CommerceEvent, Market, Product, Review } from "../types";

export const catalogApi = {
  listMarkets: () => request<Market[]>("/api/v1/markets"),
  listCategories: () => request<CommerceCategory[]>("/api/v1/categories"),
  getMarket: (id: number) => request<Market>(`/api/v1/markets/${id}`),
  activeCarousels: () => request<unknown[]>("/api/v1/carousels/active").then((items) => items.map(normalizeCarousel)),
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

function normalizeCarousel(raw: unknown): CMSCarousel {
  const record = isRecord(raw) ? raw : {};
  return {
    id: numberValue(record.id ?? record.ID),
    title: stringValue(record.title ?? record.Title),
    image_url: nullableString(record.image_url ?? record.ImageURL),
    target_type: stringValue(record.target_type ?? record.TargetType, "PRODUCT"),
    target_id: numberValue(record.target_id ?? record.TargetID),
    display_order: numberValue(record.display_order ?? record.DisplayOrder),
    is_active: booleanValue(record.is_active ?? record.IsActive, true),
    starts_at: nullableString(record.starts_at ?? record.StartsAt),
    ends_at: nullableString(record.ends_at ?? record.EndsAt),
  };
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" && value ? value : fallback;
}

function nullableString(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function numberValue(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function booleanValue(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
