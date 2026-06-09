import { request } from "../api-client";
import type { CommerceCategory, CommerceEvent, Market, Product, ProductListResponse, Review } from "../types";

type ProductListParams = {
  q?: string;
  categoryID?: number;
  marketID?: number;
  minPrice?: number;
  maxPrice?: number;
  status?: "SELLING";
  sort?: string;
  limit?: number;
  offset?: number;
};

type RawRecord = Record<string, unknown>;

const defaultPagination = { limit: 20, offset: 0, count: 0, hasMore: false };

export const catalogApi = {
  listMarkets: () => request<Market[]>("/api/v1/markets"),
  listCategories: () => request<CommerceCategory[]>("/api/v1/categories"),
  getMarket: (id: number) => request<Market>(`/api/v1/markets/${id}`),
  listEvents: () => request<CommerceEvent[]>("/api/v1/events"),
  getEvent: (id: number) => request<CommerceEvent>(`/api/v1/events/${id}`),
  listProductPage: async (params?: ProductListParams) => normalizeProductListResponse(await request<unknown>(productListPath(params))),
  listProducts: async (params?: ProductListParams) => (await catalogApi.listProductPage(params)).items,
  getProduct: async (id: number) => normalizeProduct(await request<unknown>(`/api/v1/products/${id}`)),
  getProductReviews: (id: number) => request<Review[]>(`/api/v1/products/${id}/reviews`),
};

function productListPath(params?: ProductListParams) {
  const search = new URLSearchParams();
  if (params?.q) {
    search.set("q", params.q);
  }
  if (params?.categoryID) {
    search.set("category_id", String(params.categoryID));
  }
  if (params?.marketID) {
    search.set("market_id", String(params.marketID));
  }
  if (params?.minPrice !== undefined) {
    search.set("min_price", String(params.minPrice));
  }
  if (params?.maxPrice !== undefined) {
    search.set("max_price", String(params.maxPrice));
  }
  if (params?.status) {
    search.set("status", params.status);
  }
  if (params?.sort) {
    search.set("sort", params.sort);
  }
  if (params?.limit) {
    search.set("limit", String(params.limit));
  }
  if (params?.offset) {
    search.set("offset", String(params.offset));
  }
  const query = search.toString();
  return `/api/v1/products${query ? `?${query}` : ""}`;
}

function normalizeProductListResponse(raw: unknown): ProductListResponse {
  if (Array.isArray(raw)) {
    const items = raw.map(normalizeProduct);
    return {
      items,
      pagination: { ...defaultPagination, count: items.length, hasMore: false },
    };
  }

  const record = isRecord(raw) ? raw : {};
  const rawItems = Array.isArray(record.items) ? record.items : [];
  const items = rawItems.map(normalizeProduct);
  const pagination = isRecord(record.pagination) ? record.pagination : {};

  return {
    items,
    pagination: {
      limit: numberValue(pagination.limit, items.length || defaultPagination.limit),
      offset: numberValue(pagination.offset, 0),
      count: numberValue(pagination.count, items.length),
      hasMore: booleanValue(pagination.hasMore ?? pagination.has_more, false),
    },
  };
}

function normalizeProduct(raw: unknown): Product {
  const record = isRecord(raw) ? raw : {};
  const originalPrice = numberValue(record.originalPrice ?? record.original_price ?? record.base_price, 0);
  const displayPrice = numberValue(record.displayPrice ?? record.display_price ?? record.salePrice ?? record.sale_price ?? record.discount_price, originalPrice);
  const discountPrice = numberValue(record.discount_price ?? record.salePrice ?? record.sale_price, displayPrice < originalPrice ? displayPrice : 0);
  const options = Array.isArray(record.options) ? record.options.map(normalizeProductOption) : undefined;

  return {
    id: numberValue(record.id, 0),
    market_id: numberValue(record.market_id ?? record.marketId, 0),
    category_id: numberValue(record.category_id ?? record.categoryId, 0),
    name: stringValue(record.name, "상품"),
    description: descriptionValue(record.description),
    base_price: numberValue(record.base_price, originalPrice || displayPrice),
    discount_price: discountPrice,
    display_price: displayPrice,
    discount_percent: numberValue(record.discountPercent ?? record.discount_percent, 0),
    shipping_type: stringValue(record.shipping_type ?? record.shippingType, "NORMAL"),
    popularity_score: numberValue(record.popularity_score ?? record.popularityScore, 0),
    status: stringValue(record.status, "SELLING"),
    availability: normalizeAvailability(record.availability),
    options,
    image_url: optionalString(record.image_url ?? record.imageUrl),
    detail_html: optionalString(record.detail_html ?? record.detailHtml),
    market_name: optionalString(record.market_name ?? record.marketName),
    tags: Array.isArray(record.tags) ? record.tags.map((tag) => String(tag)) : undefined,
    created_at: optionalString(record.created_at ?? record.createdAt),
    updated_at: optionalString(record.updated_at ?? record.updatedAt),
  };
}

function normalizeProductOption(raw: unknown) {
  const record = isRecord(raw) ? raw : {};
  const available = booleanValue(record.available, booleanValue(record.is_active ?? record.isActive, true));
  return {
    id: numberValue(record.id, 0),
    product_id: numberValue(record.product_id ?? record.productId, 0),
    option_name: stringValue(record.option_name ?? record.optionName, "옵션"),
    option_value: stringValue(record.option_value ?? record.optionValue, "기본"),
    additional_price: numberValue(record.additional_price ?? record.additionalPrice, 0),
    quantity: numberValue(record.quantity, available ? 1 : 0),
    is_active: booleanValue(record.is_active ?? record.isActive, available),
    available,
  };
}

function normalizeAvailability(raw: unknown) {
  const record = isRecord(raw) ? raw : {};
  return {
    available: booleanValue(record.available, true),
    reason: stringValue(record.reason, "AVAILABLE"),
  };
}

function descriptionValue(raw: unknown) {
  if (typeof raw === "string") {
    return raw;
  }
  if (raw === undefined || raw === null) {
    return "";
  }
  return JSON.stringify(raw);
}

function isRecord(value: unknown): value is RawRecord {
  return typeof value === "object" && value !== null;
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value ? value : undefined;
}
