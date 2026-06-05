import { http, HttpResponse } from "msw";
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
  http.post(`${API_BASE_URL}/api/v1/auth/login`, async () =>
    HttpResponse.json({
      memberID: 1,
      role: "CUSTOMER",
      accessToken: "mock-access-token",
    }),
  ),
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
