import { afterEach, describe, expect, it, vi } from "vitest";
import { customerApi } from "./customer";

afterEach(() => vi.unstubAllGlobals());

const product = {
  id: 31,
  market_id: 8,
  category_id: 2,
  name: "린넨 셔츠",
  description: "가벼운 셔츠",
  base_price: 49000,
  discount_price: 0,
  coupon_lowest_price: 0,
  shipping_type: "NORMAL",
  popularity_score: 12,
  status: "SELLING",
  market_name: "아틀리에 팔",
};

describe("customer discovery contracts", () => {
  it("loads hydrated member recommendations with an explicit limit", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([{
      member_id: 7,
      product_id: 31,
      score: 0.91,
      rank: 1,
      reason_code: "PREFERRED_MARKET",
      algorithm: "hybrid_v1",
      source: "BATCH",
      generated_at: "2026-09-05T03:00:00Z",
      product,
    }]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const recommendations = await customerApi.listMyRecommendations("token", { limit: 12, offset: 24 });

    expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/me/recommendations?limit=12&offset=24");
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get("Authorization")).toBe("Bearer token");
    expect(recommendations[0]).toMatchObject({ source: "BATCH", product: { id: 31 } });
  });

  it("passes an opaque market-feed cursor without interpreting it", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      items: [{
        market: { id: 8, name: "아틀리에 팔", follower_count: 1520 },
        product,
        published_at: "2026-09-05T03:00:00Z",
      }],
      next_cursor: "opaque+/=cursor",
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const feed = await customerApi.listMarketFeed("token", { limit: 20, cursor: "previous+/=cursor" });

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.pathname).toBe("/api/v1/me/market-feed");
    expect(url.searchParams.get("limit")).toBe("20");
    expect(url.searchParams.get("cursor")).toBe("previous+/=cursor");
    expect(feed).toMatchObject({ items: [{ product: { id: 31 } }], next_cursor: "opaque+/=cursor" });
  });
});

it("persists a cart group edit with authenticated PATCH and parses the saved row", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ID: 1, MemberID: 7, ProductID: 31, OptionID: 5, Quantity: 3, PriceAtAdded: 42000 }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  const payload = { cart_item_ids: [1, 2], option_id: 5, quantity: 3 };
  const saved = await customerApi.updateCartItems("token", payload);
  expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/cart/items");
  expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "PATCH", body: JSON.stringify(payload) });
  expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get("Authorization")).toBe("Bearer token");
  expect(saved).toMatchObject({ id: 1, option_id: 5, quantity: 3, price_at_added: 42000 });
});

it("uses the authenticated cart, address, and order quote routes", async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ ID: 7, ReceiverName: "김하늘", ReceiverPhone: "010-1234-5678", PostalCode: "06234", BaseAddress: "서울", DetailAddress: "5층", IsDefault: true }), { status: 201 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ product_total: 64000, discount_total: 0, used_point: 0, shipping_fee: 0, payment_amount: 64000, line_items: [{ cart_item_id: 3, unit_price: 32000, line_total: 64000 }] }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);

  await customerApi.removeCartItems("token", [1, 2]);
  const address = await customerApi.createAddress("token", { receiver: "김하늘", phone: "010-1234-5678", zip_code: "06234", line1: "서울", line2: "5층", is_default: true });
  const quote = await customerApi.quoteOrder("token", { cart_item_ids: [3], used_point: 0, shipping_address: { receiver: address.receiver, phone: address.phone, zip_code: address.zip_code, line1: address.line1, line2: address.line2 } });

  expect(fetchMock.mock.calls.map((call) => [new URL(String(call[0])).pathname, call[1].method])).toEqual([
    ["/api/v1/cart/items", "DELETE"], ["/api/v1/me/addresses", "POST"], ["/api/v1/orders/quote", "POST"],
  ]);
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ cart_item_ids: [1, 2] });
  expect(address.id).toBe(7);
  expect(quote).toMatchObject({ shipping_fee: 0, payment_amount: 64000 });
});
