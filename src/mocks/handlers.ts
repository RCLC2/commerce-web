import { http, HttpResponse } from "msw";
import type { ReviewImage } from "@/lib/types";
import {
  adminDashboard,
  addresses,
  auditLogs,
  carousels,
  categories,
  cartItems,
  coupons,
  issuableCoupons,
  inventoryLogs,
  inventorySources,
  events,
  markets,
  members,
  orders,
  products,
  reviews,
  sellerDashboard,
  settlements,
} from "./mock-data";
import { getApiBaseUrl } from "@/lib/api-base-url";

const API_BASE_URL = getApiBaseUrl();

type PendingReviewImageAsset = {
  id: number;
  width: number;
  height: number;
  content_type: string;
  content_length: number;
  status: "PENDING_UPLOAD" | "VALIDATED";
  url?: string;
  detail_url?: string;
  thumbnail_url?: string;
};

type ReviewImageUploadPayload = {
  filename?: string;
  width?: number;
  height?: number;
  content_type?: string;
  content_length?: number;
};

type CreateReviewPayload = {
  rating_x2?: number;
  content?: string;
  images?: {
    media_asset_id: number;
    sort_order: number;
    is_representative: boolean;
  }[];
};

const reviewImageAssets = new Map<number, PendingReviewImageAsset>();
let nextReviewImageAssetID = 7000;
let nextReviewImageID = 8000;
let nextReviewID = 9000;

function getMockReviewImageURL(assetID: number) {
  return `/images/fashion-placeholder.svg?review_asset_id=${assetID}`;
}

function normalizeSearch(value: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function createSearchSuggestions(q: string) {
  const query = normalizeSearch(q);
  const productSuggestions = products
    .filter((product) => {
      if (!query) {
        return true;
      }
      return (
        product.name.toLowerCase().includes(query) ||
        product.market_name?.toLowerCase().includes(query) ||
        product.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    })
    .slice(0, 5)
    .map((product) => ({
      id: `product-${product.id}`,
      type: "PRODUCT" as const,
      label: product.name,
      href: `/products/${product.id}`,
    }));
  const marketSuggestions = markets
    .filter((market) => {
      if (!query) {
        return true;
      }
      return (
        market.name.toLowerCase().includes(query) ||
        market.description.toLowerCase().includes(query) ||
        market.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    })
    .slice(0, 4)
    .map((market) => ({
      id: `market-${market.id}`,
      type: "MARKET" as const,
      label: market.name,
      href: `/markets/${market.id}`,
    }));
  const keywordSuggestions = ["원피스", "데님", "무료배송", "오늘출발", "아우터"]
    .filter((keyword) => !query || keyword.toLowerCase().includes(query))
    .slice(0, 3)
    .map((keyword) => ({
      id: `keyword-${keyword}`,
      type: "KEYWORD" as const,
      label: keyword,
      href: `/search?q=${encodeURIComponent(keyword)}`,
    }));

  return [...keywordSuggestions, ...productSuggestions, ...marketSuggestions].slice(0, 10);
}

const trendingSegments = ["전체", "10대", "20대 초반", "20대 중반", "20대 후반", "30대 이상"];
const trendingKeywordMap: Record<string, string[]> = {
  전체: ["슬랑이", "키링", "베이프", "파우치", "시계", "인형", "지갑", "팬츠", "말랑이", "퍼티"],
  "10대": ["키링", "인형", "말랑이", "파우치", "후드", "반팔티", "슬랑이", "지갑", "스티커", "백팩"],
  "20대 초반": ["원피스", "데님", "나시", "셔츠", "하객룩", "슬랙스", "파우치", "샌들", "가디건", "스커트"],
  "20대 중반": ["오피스룩", "슬랙스", "토트백", "블라우스", "니트", "로퍼", "재킷", "원피스", "가방", "팬츠"],
  "20대 후반": ["하객룩", "롱원피스", "재킷", "트렌치", "토트백", "셔츠", "로퍼", "슬랙스", "스커트", "니트"],
  "30대 이상": ["데일리룩", "블라우스", "린넨", "가디건", "원피스", "편한신발", "숄더백", "팬츠", "재킷", "스카프"],
};

export const handlers = [
  http.get(`${API_BASE_URL}/api/v1/search`, ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? "";
    const query = normalizeSearch(q);
    const resultProducts = products.filter((product) => {
      if (!query) {
        return true;
      }
      return (
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.market_name?.toLowerCase().includes(query) ||
        product.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    });
    const resultMarkets = markets.filter((market) => {
      if (!query) {
        return true;
      }
      return (
        market.name.toLowerCase().includes(query) ||
        market.description.toLowerCase().includes(query) ||
        market.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    });

    return HttpResponse.json({
      q,
      products: resultProducts,
      markets: resultMarkets,
      suggestions: createSearchSuggestions(q),
    });
  }),
  http.get(`${API_BASE_URL}/api/v1/search/suggestions`, ({ request }) => {
    const url = new URL(request.url);
    return HttpResponse.json(createSearchSuggestions(url.searchParams.get("q") ?? ""));
  }),
  http.get(`${API_BASE_URL}/api/v1/search/trending`, ({ request }) => {
    const url = new URL(request.url);
    const segment = url.searchParams.get("segment") ?? "전체";
    const keywords = trendingKeywordMap[segment] ?? trendingKeywordMap["전체"];
    return HttpResponse.json({
      segment: trendingKeywordMap[segment] ? segment : "전체",
      captured_at: "2026-06-05T22:00:00.000+09:00",
      segments: trendingSegments,
      items: keywords.map((keyword, index) => ({
        rank: index + 1,
        keyword,
        trend: index % 3 === 2 ? "SAME" : "UP",
      })),
    });
  }),
  http.get(`${API_BASE_URL}/api/v1/markets`, () => HttpResponse.json(markets)),
  http.get(`${API_BASE_URL}/api/v1/categories`, () =>
    HttpResponse.json([...categories].sort((a, b) => a.sort_order - b.sort_order)),
  ),
  http.get(`${API_BASE_URL}/api/v1/markets/:id`, ({ params }) => {
    const market = markets.find((item) => item.id === Number(params.id));
    return market ? HttpResponse.json(market) : new HttpResponse(null, { status: 404 });
  }),
  http.get(`${API_BASE_URL}/api/v1/events`, () => HttpResponse.json(events)),
  http.get(`${API_BASE_URL}/api/v1/events/:id`, ({ params }) => {
    const event = events.find((item) => item.id === Number(params.id));
    return event ? HttpResponse.json(event) : new HttpResponse(null, { status: 404 });
  }),
  http.get(`${API_BASE_URL}/api/v1/products`, ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.toLowerCase();
    const sort = url.searchParams.get("sort");
    let result = [...products];

    if (q) {
      result = result.filter((product) => product.name.toLowerCase().includes(q));
    }
    if (sort === "price-low") {
      result.sort((a, b) => (a.discount_price || a.base_price) - (b.discount_price || b.base_price));
    }
    if (sort === "popular") {
      result.sort((a, b) => b.popularity_score - a.popularity_score);
    }

    return HttpResponse.json(result);
  }),
  http.get(`${API_BASE_URL}/api/v1/products/:id`, ({ params }) => {
    const product = products.find((item) => item.id === Number(params.id));
    return product ? HttpResponse.json(product) : new HttpResponse(null, { status: 404 });
  }),
  http.get(`${API_BASE_URL}/api/v1/products/:id/reviews`, ({ params }) =>
    HttpResponse.json(reviews.filter((review) => review.product_id === Number(params.id))),
  ),
  http.post(`${API_BASE_URL}/api/v1/media/review-images/presign`, async ({ request }) => {
    const payload = (await request.json()) as ReviewImageUploadPayload;
    const id = nextReviewImageAssetID++;
    const asset: PendingReviewImageAsset = {
      id,
      width: payload.width ?? 1,
      height: payload.height ?? 1,
      content_type: payload.content_type ?? "image/png",
      content_length: payload.content_length ?? 0,
      status: "PENDING_UPLOAD",
    };

    reviewImageAssets.set(id, asset);

    return HttpResponse.json(
      {
        id,
        upload_url: `${API_BASE_URL}/mock-storage/review-images/${id}`,
        headers: {
          "Content-Type": asset.content_type,
        },
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        width: asset.width,
        height: asset.height,
        content_type: asset.content_type,
        content_length: asset.content_length,
        status: asset.status,
      },
      { status: 201 },
    );
  }),
  http.put(`${API_BASE_URL}/mock-storage/review-images/:assetID`, ({ params }) => {
    const asset = reviewImageAssets.get(Number(params.assetID));
    return asset ? new HttpResponse(null, { status: 200 }) : new HttpResponse(null, { status: 404 });
  }),
  http.post(`${API_BASE_URL}/api/v1/media/review-images/:assetID/complete`, ({ params }) => {
    const assetID = Number(params.assetID);
    const asset = reviewImageAssets.get(assetID);

    if (!asset) {
      return HttpResponse.json({ message: "review image asset not found" }, { status: 404 });
    }

    const url = getMockReviewImageURL(assetID);
    const completedAsset = {
      ...asset,
      status: "VALIDATED" as const,
      url,
      detail_url: url,
      thumbnail_url: url,
    };
    reviewImageAssets.set(assetID, completedAsset);

    return HttpResponse.json(completedAsset);
  }),
  http.post(`${API_BASE_URL}/api/v1/auth/login`, async ({ request }) => {
    const payload = (await request.json()) as { email?: string };
    const role = payload.email?.includes("admin")
      ? "ADMIN"
      : payload.email?.includes("seller")
        ? "SELLER"
        : "CUSTOMER";

    return HttpResponse.json({
      memberID: role === "ADMIN" ? 3 : role === "SELLER" ? 2 : 1,
      role,
      accessToken: `${role.toLowerCase()}-mock-access-token`,
    });
  }),
  http.post(`${API_BASE_URL}/api/v1/auth/register`, () => HttpResponse.json({ id: 1 }, { status: 201 })),
  http.get(`${API_BASE_URL}/api/v1/me`, () =>
    HttpResponse.json({
      id: 1,
      user_name: "지수",
      email: "customer@commerce.test",
      role: "CUSTOMER",
      status: "ACTIVE",
      notification_type: "PUSH",
      marketing_consent: true,
      nighttime_consent: false,
      point_balance: 12800,
      created_at: new Date().toISOString(),
    }),
  ),
  http.patch(`${API_BASE_URL}/api/v1/me`, async ({ request }) => {
    const payload = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      id: 1,
      user_name: "지수",
      email: "customer@commerce.test",
      role: "CUSTOMER",
      status: "ACTIVE",
      notification_type: payload.notification_type ?? "PUSH",
      marketing_consent: payload.marketing_consent ?? true,
      nighttime_consent: payload.nighttime_consent ?? false,
      point_balance: 12800,
      created_at: new Date().toISOString(),
    });
  }),
  http.post(`${API_BASE_URL}/api/v1/cart/items`, () => HttpResponse.json({ status: "ADDED" }, { status: 201 })),
  http.get(`${API_BASE_URL}/api/v1/cart`, () => HttpResponse.json(cartItems)),
  http.get(`${API_BASE_URL}/api/v1/coupons`, () => HttpResponse.json(coupons)),
  http.get(`${API_BASE_URL}/api/v1/coupons/issuable`, () => HttpResponse.json(issuableCoupons)),
  http.post(`${API_BASE_URL}/api/v1/coupons/:couponID/issue`, ({ params }) => {
    const coupon = issuableCoupons.find((item) => item.id === Number(params.couponID));
    return coupon ? HttpResponse.json({ ...coupon, status: "ISSUED" }, { status: 201 }) : new HttpResponse(null, { status: 404 });
  }),
  http.get(`${API_BASE_URL}/api/v1/me/addresses`, () => HttpResponse.json(addresses)),
  http.post(`${API_BASE_URL}/api/v1/orders`, () => HttpResponse.json({ orderCode: "ORD-20260605-0001" }, { status: 201 })),
  http.get(`${API_BASE_URL}/api/v1/orders`, () => HttpResponse.json(orders)),
  http.get(`${API_BASE_URL}/api/v1/orders/:orderCode`, ({ params }) => {
    const order = orders.find((item) => item.order_code === params.orderCode);
    return order ? HttpResponse.json(order) : new HttpResponse(null, { status: 404 });
  }),
  http.post(`${API_BASE_URL}/api/v1/orders/:orderCode/items/:itemID/reviews`, async ({ params, request }) => {
    const order = orders.find((item) => item.order_code === params.orderCode);
    const lineItem = order?.market_orders
      ?.flatMap((marketOrder) => marketOrder.line_items)
      .find((item) => item.id === Number(params.itemID));

    if (!order || !lineItem) {
      return HttpResponse.json({ message: "order line item not found" }, { status: 404 });
    }
    if (lineItem.status !== "COMPLETED") {
      return HttpResponse.json({ message: "completed order item is required" }, { status: 409 });
    }

    const payload = (await request.json()) as CreateReviewPayload;
    const ratingX2 = payload.rating_x2 ?? 10;
    const reviewImages: ReviewImage[] = [];

    for (const [index, image] of (payload.images ?? []).entries()) {
      const asset = reviewImageAssets.get(image.media_asset_id);
      if (!asset || asset.status !== "VALIDATED") {
        return HttpResponse.json({ message: "validated review image is required" }, { status: 400 });
      }

      reviewImages.push({
        id: nextReviewImageID++,
        media_asset_id: image.media_asset_id,
        url: asset.url,
        detail_url: asset.detail_url,
        thumbnail_url: asset.thumbnail_url,
        sort_order: image.sort_order ?? index + 1,
        is_representative: image.is_representative ?? index === 0,
        width: asset.width,
        height: asset.height,
        content_type: asset.content_type,
        status: asset.status,
      });
    }

    const review = {
      id: nextReviewID++,
      product_id: lineItem.product_id,
      member_id: order.member_id ?? 1,
      order_id: order.id,
      order_line_item_id: lineItem.id,
      rating_x2: ratingX2,
      rating: ratingX2 / 2,
      content: payload.content ?? "",
      is_photo_review: reviewImages.length > 0,
      images: reviewImages,
      created_at: new Date().toISOString(),
    };

    reviews.unshift(review);

    return HttpResponse.json(review, { status: 201 });
  }),
  http.post(`${API_BASE_URL}/api/v1/orders/:orderCode/complete-payment`, ({ params }) =>
    HttpResponse.json({ orderCode: params.orderCode, status: "PAYMENT_COMPLETED" }, { status: 202 }),
  ),
  http.get(`${API_BASE_URL}/api/v1/seller/dashboard`, () => HttpResponse.json(sellerDashboard)),
  http.get(`${API_BASE_URL}/api/v1/seller/products`, () => HttpResponse.json(products.filter((product) => product.market_id === 1))),
  http.get(`${API_BASE_URL}/api/v1/seller/inventory/sources`, () => HttpResponse.json(inventorySources)),
  http.get(`${API_BASE_URL}/api/v1/seller/inventory/sync-logs`, () => HttpResponse.json(inventoryLogs)),
  http.get(`${API_BASE_URL}/api/v1/seller/orders`, () => HttpResponse.json(orders)),
  http.get(`${API_BASE_URL}/api/v1/seller/settlements`, () => HttpResponse.json(settlements.filter((item) => item.market_id === 1))),
  http.get(`${API_BASE_URL}/api/v1/seller/reviews`, () => HttpResponse.json(reviews)),
  http.post(`${API_BASE_URL}/api/v1/inventory/sources`, async ({ request }) => {
    const payload = (await request.json()) as { provider?: string; display_name?: string };
    return HttpResponse.json(
      {
        id: 99,
        market_id: 1,
        provider: payload.provider ?? "SHOPIFY",
        display_name: payload.display_name ?? "New source",
        status: "ACTIVE",
        last_synced_at: new Date().toISOString(),
      },
      { status: 201 },
    );
  }),
  http.get(`${API_BASE_URL}/api/v1/admin/dashboard`, () => HttpResponse.json(adminDashboard)),
  http.get(`${API_BASE_URL}/api/v1/admin/members`, () => HttpResponse.json(members)),
  http.get(`${API_BASE_URL}/api/v1/admin/markets`, () => HttpResponse.json(markets)),
  http.get(`${API_BASE_URL}/api/v1/admin/products`, () => HttpResponse.json(products)),
  http.get(`${API_BASE_URL}/api/v1/admin/orders`, () => HttpResponse.json(orders)),
  http.get(`${API_BASE_URL}/api/v1/admin/settlements`, () => HttpResponse.json(settlements)),
  http.get(`${API_BASE_URL}/api/v1/admin/coupons`, () => HttpResponse.json(coupons)),
  http.get(`${API_BASE_URL}/api/v1/admin/audit-logs`, () => HttpResponse.json(auditLogs)),
  http.get(`${API_BASE_URL}/api/v1/admin/carousels`, () => HttpResponse.json(carousels)),
  http.post(`${API_BASE_URL}/api/v1/admin/:domain/:id/:action`, () => HttpResponse.json({ status: "RECORDED" })),
];
