import {
  expect,
  test,
  type APIRequestContext,
  type TestInfo,
} from "@playwright/test";
import {
  backendBaseURL,
  installSession,
  seedAccounts,
  signIn,
} from "../support/live-backend";

async function createMember(
  request: APIRequestContext,
  testInfo: TestInfo,
  prefix: string,
) {
  const email = `${prefix}-${Date.now()}-${testInfo.retry}@test.com`;
  const password = "password123";
  const signup = await request.post(`${backendBaseURL}/api/v1/auth/signup`, {
    data: {
      email,
      password,
      marketingConsent: false,
      nighttimeConsent: false,
    },
  });
  expect(signup.status(), await signup.text()).toBe(201);

  return {
    email,
    session: await signIn(request, { email, password }),
  };
}

test.describe("remaining public catalog routes against backend origin/main", () => {
  for (const target of [
    {
      route: "/popular-markets",
      endpoint: "/api/v1/markets",
      heading: "인기 마켓",
      linkPrefix: "/markets/",
    },
    {
      route: "/popular-products",
      endpoint: "/api/v1/products/popular",
      heading: "인기 상품",
      linkPrefix: "/products/",
    },
  ] as const) {
    test(`${target.route} renders its live collection`, async ({ page }) => {
      const responsePromise = page.waitForResponse((response) =>
        response.url().includes(target.endpoint));

      await page.goto(target.route);
      const response = await responsePromise;
      expect(response.ok(), `${target.endpoint}: ${response.status()}`).toBeTruthy();
      await response.finished();

      await expect(page.getByRole("heading", {
        name: target.heading,
        exact: true,
      })).toBeVisible();
      await expect(page.locator(`a[href^="${target.linkPrefix}"]`).first()).toBeVisible();
    });
  }

  test("legacy recommendations route points to the home recommendation slot", async ({ page }) => {
    await page.goto("/recommendations");

    await expect(page).toHaveURL(/\/#recommendations$/);
    await expect(page.locator("#recommendations").getByRole("heading")).toBeVisible();
  });

  test("category hub filters the live catalog and links to products", async ({ page }) => {
    const categoriesResponse = page.waitForResponse((response) =>
      response.url().includes("/api/v1/category-information"));
    await page.goto("/categories");
    const initialCategoriesResponse = await categoriesResponse;
    expect(initialCategoriesResponse.ok()).toBeTruthy();
    expect(new URL(initialCategoriesResponse.url()).searchParams.has("category")).toBeFalsy();

    await expect(page.getByRole("heading", { name: "카테고리관", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "상의", exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "상의 상품", exact: true })).toBeVisible();
    await expect(page.locator('a[href^="/products/"]').first()).toBeVisible();
  });

  test("event detail renders the selected live event and products", async ({ page, request }) => {
    const eventsResponse = await request.get(`${backendBaseURL}/api/v1/events`);
    expect(eventsResponse.ok(), await eventsResponse.text()).toBeTruthy();
    const events = await eventsResponse.json() as Array<{ id: number; title: string }>;
    expect(events.length).toBeGreaterThan(0);
    const event = events[0];

    const detailResponse = page.waitForResponse((response) =>
      response.url().includes(`/api/v1/events/${event.id}`));
    await page.goto(`/events/${event.id}`);
    expect((await detailResponse).ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: event.title, exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "이벤트 상품", exact: true })).toBeVisible();
    await expect(page.locator('a[href^="/products/"]').first()).toBeVisible();
  });

  test("market detail renders its live market and products", async ({ page }) => {
    const marketResponse = page.waitForResponse((response) =>
      response.url().includes("/api/v1/markets/1"));
    await page.goto("/markets/1");
    expect((await marketResponse).ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: "mood studio", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "마켓 상품", exact: true })).toBeVisible();
    await expect(page.locator('a[href^="/products/"]').first()).toBeVisible();
  });

  test("product catalog applies server-backed sort filters through the URL", async ({ page }) => {
    const informationResponse = page.waitForResponse((response) =>
      response.url().includes("/api/v1/plp-information"));
    const productsResponse = page.waitForResponse((response) =>
      response.url().includes("/api/v1/plp-products"));
    await page.goto("/products?sort=popular");
    expect((await informationResponse).ok()).toBeTruthy();
    expect((await productsResponse).ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: "전체 상품", exact: true })).toBeVisible();
    await expect(page.locator('a[href^="/products/"]').first()).toBeVisible();

    const sortedResponse = page.waitForResponse((response) =>
      response.url().includes("/api/v1/plp-products") && response.url().includes("sort=price-low"));
    await page.getByRole("button", { name: "낮은 가격", exact: true }).click();
    expect((await sortedResponse).ok()).toBeTruthy();
    await expect(page).toHaveURL(/\/products\?.*sort=price-low/);
    await expect(page.getByRole("button", { name: "낮은 가격", exact: true })).toHaveClass(/bg-brand/);
  });

  test("integrated search transitions from trends to live results", async ({ page }) => {
    const trendingResponse = page.waitForResponse((response) =>
      response.url().includes("/api/v1/search/trending"));
    await page.goto("/search");
    expect((await trendingResponse).ok()).toBeTruthy();
    await expect(page.getByRole("heading", { name: "인기 검색어", exact: true })).toBeVisible();

    const searchResponse = page.waitForResponse((response) =>
      response.url().includes("/api/v1/search?q="));
    await page.getByLabel("검색어 입력").fill("스냅");
    await page.getByLabel("검색어 입력").press("Enter");
    expect((await searchResponse).ok()).toBeTruthy();

    await expect(page).toHaveURL(/\/search\?q=%EC%8A%A4%EB%83%85/);
    await expect(page.getByRole("heading", { name: "상품", exact: true })).toBeVisible();
    await expect(page.locator('a[href^="/products/"]').first()).toBeVisible();
  });

  test("legacy snapshot redirects to market feed without requesting search trends", async ({ page }) => {
    let trendingRequestCount = 0;
    page.on("request", (request) => {
      if (request.url().includes("/api/v1/search/trending")) trendingRequestCount += 1;
    });
    const marketsResponse = page.waitForResponse((response) =>
      response.url().includes("/api/v1/markets?sort=popular&limit=6"));
    await page.goto("/snapshot");
    expect((await marketsResponse).ok()).toBeTruthy();

    await expect(page).toHaveURL(/\/market-feed$/);
    await expect(page.getByRole("heading", { name: "마켓 피드", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "팔로우할 마켓을 찾아보세요", exact: true })).toBeVisible();
    expect(trendingRequestCount).toBe(0);
  });
});

test.describe("customer account UI with live and controlled API boundaries", () => {
  test("product likes and wishlists persist and render as separate collections", async ({ page, request }, testInfo) => {
    const account = await createMember(request, testInfo, "e2e-engagement");
    await installSession(page, account.session);
    await page.goto("/products/1");

    const likeButton = page.getByRole("button", { name: "좋아요", exact: true });
    const addLikeResponse = page.waitForResponse((response) =>
      response.url().endsWith("/api/v1/products/1/like")
      && response.request().method() === "POST");
    await likeButton.click();
    expect((await addLikeResponse).ok()).toBeTruthy();
    await expect(page.getByRole("button", { name: "좋아요 취소", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "찜하기", exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("button", { name: "좋아요 취소", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "찜하기", exact: true })).toBeVisible();

    const wishlistButton = page.getByRole("button", { name: "찜하기", exact: true });
    const addResponse = page.waitForResponse((response) =>
      response.url().endsWith("/api/v1/products/1/wishlist")
      && response.request().method() === "POST");
    await wishlistButton.click();
    expect((await addResponse).ok()).toBeTruthy();
    await expect(page.getByRole("button", { name: "찜 해제", exact: true })).toBeVisible();

    const removeLikeResponse = page.waitForResponse((response) =>
      response.url().endsWith("/api/v1/products/1/like")
      && response.request().method() === "DELETE");
    await page.getByRole("button", { name: "좋아요 취소", exact: true }).click();
    expect((await removeLikeResponse).ok()).toBeTruthy();

    await page.reload();
    await expect(page.getByRole("button", { name: "좋아요", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "찜 해제", exact: true })).toBeVisible();

    await page.goto("/likes");
    await expect(page.getByRole("heading", { name: "좋아요", exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: /좋아요 상품/ })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("좋아요한 상품이 없습니다.", { exact: true })).toBeVisible();

    await page.getByRole("tab", { name: /찜한 상품/ }).click();
    await expect(page.getByRole("tab", { name: /찜한 상품/ })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("스냅 코튼 크롭 셔츠", { exact: true }).first()).toBeVisible();

    await page.goto("/products/1");
    const removeWishlistResponse = page.waitForResponse((response) =>
      response.url().endsWith("/api/v1/products/1/wishlist")
      && response.request().method() === "DELETE");
    await page.getByRole("button", { name: "찜 해제", exact: true }).click();
    expect((await removeWishlistResponse).ok()).toBeTruthy();
    await expect(page.getByRole("button", { name: "찜하기", exact: true })).toBeVisible();
  });

  test("market follow UI persists through controlled state transitions", async ({ page, request }, testInfo) => {
    const account = await createMember(request, testInfo, "e2e-market-follow");
    await installSession(page, account.session);
    let following = false;
    await page.route("**/api/v1/markets/1/follow", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ status: 200, json: { following } });
        return;
      }
      following = route.request().method() === "POST";
      await route.fulfill({ status: 204, body: "" });
    });
    await page.goto("/markets/1");

    const followButton = page.getByRole("button", { name: /^팔로우 ·/ });
    const followResponse = page.waitForResponse((response) =>
      response.url().endsWith("/api/v1/markets/1/follow")
      && response.request().method() === "POST");
    await followButton.click();
    expect((await followResponse).ok()).toBeTruthy();
    await expect(page.getByRole("button", { name: /^팔로잉 ·/ })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("button", { name: /^팔로잉 ·/ })).toBeVisible();

    const unfollowResponse = page.waitForResponse((response) =>
      response.url().endsWith("/api/v1/markets/1/follow")
      && response.request().method() === "DELETE");
    await page.getByRole("button", { name: /^팔로잉 ·/ }).click();
    expect((await unfollowResponse).ok()).toBeTruthy();
    await expect(page.getByRole("button", { name: /^팔로우 ·/ })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("button", { name: /^팔로우 ·/ })).toBeVisible();
  });

  test("controlled market follow failure is not rendered as an unfollowed state", async ({ page, request }, testInfo) => {
    const account = await createMember(request, testInfo, "e2e-market-follow-error");
    await installSession(page, account.session);
    await page.route("**/api/v1/markets/1/follow", (route) => route.fulfill({ status: 503, body: "follow unavailable" }));
    await page.goto("/markets/1");

    const unknownFollowButton = page.getByRole("button", { name: /^상태 확인 필요 ·/ });
    await expect(unknownFollowButton).toBeDisabled();
    await expect(unknownFollowButton.locator("svg.lucide-heart")).toHaveCount(0);
    await expect(unknownFollowButton.locator("svg.lucide-circle-question-mark")).toBeVisible();
    await expect(page.getByRole("button", { name: "팔로우 상태 다시 확인", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /^팔로우 ·/ })).toHaveCount(0);
  });

  test("market follow response loss reconciles before retrying the command", async ({ page, request }, testInfo) => {
    const account = await createMember(request, testInfo, "e2e-market-follow-response-loss");
    await installSession(page, account.session);
    let following = false;
    let postCount = 0;
    await page.route("**/api/v1/markets/1/follow", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ status: 200, json: { following } });
        return;
      }
      postCount += 1;
      following = true;
      await route.fulfill({ status: 503, body: "follow response lost" });
    });
    await page.goto("/markets/1");

    await page.getByRole("button", { name: /^팔로우 ·/ }).click();
    await expect(page.getByText(/마켓 팔로우 상태를 저장하지 못했습니다/)).toBeVisible();
    await page.getByRole("button", { name: "상태 확인 후 다시 시도", exact: true }).click();

    await expect(page.getByRole("button", { name: /^팔로잉 ·/ })).toBeVisible();
    await expect(page.getByText("서버에서 마켓 팔로우 상태를 확인했습니다.", { exact: true })).toBeVisible();
    expect(postCount).toBe(1);
  });

  test("product engagement stays locked while cached state is refreshed", async ({ page, request }, testInfo) => {
    const account = await createMember(request, testInfo, "e2e-engagement-refresh");
    const productResponse = await request.get(`${backendBaseURL}/api/v1/products/1`);
    expect(productResponse.ok(), await productResponse.text()).toBeTruthy();
    const { product } = await productResponse.json() as { product: Record<string, unknown> };
    let likedRequestCount = 0;
    let releaseLikedRefresh = () => {};
    const likedRefreshGate = new Promise<void>((resolve) => {
      releaseLikedRefresh = resolve;
    });
    await page.route("**/api/v1/me/liked-products", async (route) => {
      likedRequestCount += 1;
      if (likedRequestCount === 1) {
        await route.fulfill({ status: 200, json: [] });
        return;
      }
      await likedRefreshGate;
      await route.fulfill({ status: 200, json: [product] });
    });
    await page.route("**/api/v1/me/wishlist", (route) => route.fulfill({ status: 200, json: [] }));
    await installSession(page, account.session);
    await page.goto("/products/1");

    await expect(page.getByRole("button", { name: "좋아요", exact: true })).toBeEnabled();
    await page.getByRole("link", { name: "commerce", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goBack();

    await expect(page.getByText("좋아요와 찜 상태를 확인하는 중입니다.", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "좋아요", exact: true })).toBeDisabled();
    releaseLikedRefresh();
    await expect(page.getByRole("button", { name: "좋아요 취소", exact: true })).toBeVisible();
  });

  test("profile exposes the live account in the editable detail form", async ({ page, request }) => {
    const session = await signIn(request, seedAccounts.member);
    await installSession(page, session);
    const profileResponse = page.waitForResponse((response) =>
      response.url().endsWith("/api/v1/me"));
    await page.goto("/mypage/profile");
    expect((await profileResponse).ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: "사용자 상세 정보 수정", exact: true })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "이메일", exact: true })).toHaveValue(seedAccounts.member.email);
    await expect(page.getByRole("button", { name: "변경사항 저장", exact: true })).toBeEnabled();
    await expect(page.getByText("서버 응답을 해석하지 못했습니다.", { exact: true })).toHaveCount(0);
  });

  test("pending order detail renders the server-authoritative order", async ({ page, request }, testInfo) => {
    const account = await createMember(request, testInfo, "e2e-order-detail");
    const authHeaders = { Authorization: `Bearer ${account.session.accessToken}` };

    const addCart = await request.post(`${backendBaseURL}/api/v1/cart/items`, {
      headers: authHeaders,
      data: { product_id: 1, option_id: 1, quantity: 1 },
    });
    expect(addCart.status(), await addCart.text()).toBe(201);
    const cartResponse = await request.get(`${backendBaseURL}/api/v1/cart`, {
      headers: authHeaders,
    });
    expect(cartResponse.ok(), await cartResponse.text()).toBeTruthy();
    const cart = await cartResponse.json() as Array<{ ID: number }>;
    expect(cart.length).toBe(1);

    const orderResponse = await request.post(`${backendBaseURL}/api/v1/orders`, {
      headers: authHeaders,
      data: { cart_item_ids: [cart[0].ID], used_point: 0 },
    });
    expect(orderResponse.status(), await orderResponse.text()).toBe(201);
    const { orderCode } = await orderResponse.json() as { orderCode: string };

    await installSession(page, account.session);
    const detailResponse = page.waitForResponse((response) =>
      response.url().endsWith(`/api/v1/orders/${orderCode}`));
    await page.goto(`/orders/${orderCode}`);
    expect((await detailResponse).ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: orderCode, exact: true })).toBeVisible();
    await expect(page.getByText("Payment pending", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("스냅 코튼 크롭 셔츠", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Payment", exact: true })).toBeVisible();
  });
});
