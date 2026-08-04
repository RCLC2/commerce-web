import { expect, test, type APIRequestContext } from "@playwright/test";
import { backendBaseURL, seedAccounts, signIn } from "../support/live-backend";

async function getJSON(request: APIRequestContext, endpoint: string, token?: string) {
  const response = await request.get(`${backendBaseURL}${endpoint}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  expect(response.ok(), `${endpoint}: ${response.status()} ${await response.text()}`).toBeTruthy();
  return response.json() as Promise<unknown>;
}

function unwrapFrontendEnvelope(payload: unknown) {
  if (
    payload
    && typeof payload === "object"
    && "success" in payload
    && payload.success === true
    && "data" in payload
  ) {
    return payload.data;
  }
  return payload;
}

test.describe("backend origin/main live API contract", () => {
  test("health and public catalog return usable collections", async ({ request }) => {
    const health = await request.get(`${backendBaseURL}/healthz`);
    expect(health.ok()).toBeTruthy();

    for (const endpoint of [
      "/api/v1/markets",
      "/api/v1/categories",
      "/api/v1/events",
      "/api/v1/products",
      "/api/v1/products/popular",
      "/api/v1/products/promotions",
      "/api/v1/products/recommendations",
    ]) {
      const body = await getJSON(request, endpoint);
      expect(Array.isArray(body), endpoint).toBeTruthy();
      expect((body as unknown[]).length, endpoint).toBeGreaterThan(0);
    }

    const detail = await getJSON(request, "/api/v1/products/1") as {
      product?: { id?: number; name?: string; options?: unknown[] };
    };
    expect(detail.product?.id).toBe(1);
    expect(detail.product?.name).toBeTruthy();
    expect(detail.product?.options?.length).toBeGreaterThan(0);
  });

  test("authentication accepts seed users and rejects bad credentials", async ({ request }) => {
    for (const account of Object.values(seedAccounts)) {
      const session = await signIn(request, account);
      expect(session.role).toBe(account.role);
    }

    const invalid = await request.post(`${backendBaseURL}/api/v1/auth/signin`, {
      data: { email: seedAccounts.member.email, password: "not-the-password" },
    });
    expect(invalid.status()).toBe(401);
  });

  test("member resources are authorized and collection-shaped", async ({ request }) => {
    const session = await signIn(request, seedAccounts.member);
    const profile = await getJSON(request, "/api/v1/me", session.accessToken) as {
      email?: string; point_balance?: number;
    };
    expect(profile.email).toBe(seedAccounts.member.email);
    expect(profile.point_balance).toBeGreaterThanOrEqual(0);

    for (const endpoint of [
      "/api/v1/cart",
      "/api/v1/coupons",
      "/api/v1/coupons/issuable",
      "/api/v1/me/addresses",
      "/api/v1/me/reviews",
      "/api/v1/me/wishlist",
      "/api/v1/me/liked-products",
      "/api/v1/orders?limit=100&offset=0",
    ]) {
      expect(Array.isArray(await getJSON(request, endpoint, session.accessToken)), endpoint).toBeTruthy();
    }

    const unauthorized = await request.get(`${backendBaseURL}/api/v1/me`);
    expect(unauthorized.status()).toBe(401);
  });

  test("market follow status exposes the boolean consumed by the customer UI", async ({ request }) => {
    const session = await signIn(request, seedAccounts.member);
    const status = await getJSON(request, "/api/v1/markets/1/follow", session.accessToken);
    expect(status).toEqual(expect.objectContaining({ following: expect.any(Boolean) }));
  });

  test("customer coupon endpoints expose the raw shapes handled by explicit adapters", async ({ request }) => {
    const session = await signIn(request, seedAccounts.member);
    const coupons = await getJSON(
      request,
      "/api/v1/coupons/issuable",
      session.accessToken,
    ) as Array<Record<string, unknown>>;

    expect(coupons.length).toBeGreaterThan(0);
    expect(coupons[0]).toEqual(expect.objectContaining({
      ID: expect.any(Number),
      Name: expect.any(String),
      DiscountType: expect.stringMatching(/^(PERCENT|AMOUNT)$/),
      DiscountValue: expect.any(Number),
      MinOrderAmount: expect.any(Number),
    }));

    const quotes = await getJSON(
      request,
      "/api/v1/coupons/issuable?order_amount=30000",
      session.accessToken,
    ) as Array<Record<string, unknown>>;
    expect(quotes.length).toBeGreaterThan(0);
    expect(quotes[0]).toEqual(expect.objectContaining({
      coupon: expect.objectContaining({
        ID: expect.any(Number),
        DiscountType: expect.stringMatching(/^(PERCENT|AMOUNT)$/),
      }),
      max_discount: expect.any(Number),
      discount_amount: expect.any(Number),
      platform_coupon_amount: expect.any(Number),
      market_coupon_amount: expect.any(Number),
      market_coupon_rate: expect.any(Number),
      discounted_amount: expect.any(Number),
    }));
  });

  test("seller context and management resources match the seeded market", async ({ request }) => {
    const session = await signIn(request, seedAccounts.seller);
    const context = await getJSON(request, "/api/v1/seller/context", session.accessToken) as {
      market_id?: number; market_name?: string;
    };
    expect(context.market_id).toBe(1);
    expect(context.market_name).toBe("mood studio");

    for (const endpoint of [
      "/api/v1/seller/products?market_id=1",
      "/api/v1/seller/orders?market_id=1",
      "/api/v1/seller/settlements?market_id=1",
    ]) {
      expect(Array.isArray(await getJSON(request, endpoint, session.accessToken)), endpoint).toBeTruthy();
    }
  });

  test("admin resources use the collection contract consumed by the console", async ({ request }) => {
    const session = await signIn(request, seedAccounts.admin);
    for (const endpoint of [
      "/api/v1/admin/members?limit=100&offset=0",
      "/api/v1/admin/markets?limit=100&offset=0",
      "/api/v1/admin/products",
      "/api/v1/admin/orders?limit=100&offset=0",
      "/api/v1/admin/settlements",
      "/api/v1/admin/coupons",
    ]) {
      expect.soft(
        Array.isArray(unwrapFrontendEnvelope(
          await getJSON(request, endpoint, session.accessToken),
        )),
        endpoint,
      ).toBeTruthy();
    }

    const members = unwrapFrontendEnvelope(
      await getJSON(request, "/api/v1/admin/members?limit=100&offset=0", session.accessToken),
    ) as Array<Record<string, unknown>>;
    const markets = unwrapFrontendEnvelope(
      await getJSON(request, "/api/v1/admin/markets?limit=100&offset=0", session.accessToken),
    ) as Array<Record<string, unknown>>;
    expect(members.length).toBeGreaterThan(0);
    expect(members[0]).toEqual(expect.objectContaining({
      ID: expect.any(Number),
      Email: expect.any(String),
    }));
    expect(markets.length).toBeGreaterThan(0);
    expect(markets[0]).toEqual(expect.objectContaining({
      id: expect.any(Number),
      name: expect.any(String),
    }));
  });
});
