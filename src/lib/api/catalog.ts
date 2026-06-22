import { request } from "../api-client";
import type { CommerceCategory, CommerceEvent, Market, Product, Review } from "../types";

type ProductDetailResponse = {
  product?: Product;
  lowest_price?: number;
  delivery_type?: string;
  delivery_label?: string;
  today_shipping_available?: boolean;
};

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
  getProduct: (id: number) => request<Product | ProductDetailResponse>(`/api/v1/products/${id}`).then(normalizeProductDetail),
  getProductReviews: (id: number) => request<Review[]>(`/api/v1/products/${id}/reviews`),
};

function normalizeProductDetail(payload: Product | ProductDetailResponse): Product {
  const source = "product" in payload && payload.product ? payload.product : (payload as Product);
  const detail = "product" in payload ? payload : undefined;
  const description = normalizeDescription(source.description);

  return {
    ...source,
    description,
    discount_price: source.discount_price || discountPriceFromLowest(source.base_price, detail?.lowest_price),
    shipping_type: source.shipping_type || detail?.delivery_type || "NORMAL",
  };
}

function discountPriceFromLowest(basePrice: number, lowestPrice?: number): number {
  if (lowestPrice && lowestPrice < basePrice) {
    return lowestPrice;
  }
  return 0;
}

function normalizeDescription(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }
    try {
      const parsed = JSON.parse(trimmed) as { text?: unknown; html?: unknown };
      if (typeof parsed.text === "string") {
        return parsed.text;
      }
      if (typeof parsed.html === "string") {
        return parsed.html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      }
    } catch {
      return trimmed;
    }
    return trimmed;
  }

  if (value && typeof value === "object") {
    const parsed = value as { text?: unknown; html?: unknown };
    if (typeof parsed.text === "string") {
      return parsed.text;
    }
    if (typeof parsed.html === "string") {
      return parsed.html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    }
  }

  return "";
}
