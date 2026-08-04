import { expect, test } from "@playwright/test";
import { backendBaseURL, flushReact, loginThroughUI, seedAccounts } from "../support/live-backend";

test.describe("public and customer journeys against backend origin/main", () => {
  test("public home renders live catalog and opens product detail", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "인기 상품" })).toBeVisible();
    const productLink = page.getByRole("link", { name: /스냅 코튼 크롭 셔츠/ }).first();
    await expect(productLink).toBeVisible();
    await productLink.click();

    await expect(page).toHaveURL(/\/products\/1$/);
    await expect(page.getByRole("heading", { name: "스냅 코튼 크롭 셔츠" })).toBeVisible();
    await expect(page.getByRole("combobox").first()).toBeVisible();
  });

  test("registration, login, and my page load all supporting account data", async ({ page }, testInfo) => {
    const email = `e2e-register-${Date.now()}-${testInfo.retry}@test.com`;
    await page.goto("/register");
    await page.getByLabel("이메일").fill(email);
    await page.getByLabel("비밀번호").fill("password123");
    await page.getByRole("button", { name: "가입하기" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await loginThroughUI(page, { email, password: "password123" });
    const couponResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/v1/coupons/issuable"));
    await page.reload();
    const couponResponse = await couponResponsePromise;
    expect(couponResponse.ok()).toBeTruthy();
    await couponResponse.finished();
    await flushReact(page);
    await expect(page.getByText(email, { exact: true })).toBeVisible();
    await expect(
      page.getByText("Available coupons", { exact: true }).locator("..").getByText("1", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry", exact: true })).toHaveCount(0);
    await expect(page.getByText("Available coupons could not be loaded.", { exact: true })).toHaveCount(0);

    await page.getByText("Coupon wallet", { exact: true }).click();
    const issueResponsePromise = page.waitForResponse((response) =>
      /\/api\/v1\/coupons\/\d+\/issue$/.test(response.url())
      && response.request().method() === "POST");
    await page.getByRole("button", { name: "Issue", exact: true }).click();
    const issueResponse = await issueResponsePromise;
    expect(issueResponse.ok(), await issueResponse.text()).toBeTruthy();
    await flushReact(page);
    await expect(page.getByText("신규 회원 10% 쿠폰", { exact: true }).last()).toBeVisible();
    await expect(
      page.getByText("My coupons", { exact: true }).locator("..").getByText("1", { exact: true }),
    ).toBeVisible();
  });

  test("my reviews loads the deployed collection without a stale backend blocker", async ({ page }) => {
    await loginThroughUI(page, seedAccounts.member);
    await page.route("**/api/v1/me/reviews", (route) => route.fulfill({ status: 200, json: [] }));
    const reviewsResponse = page.waitForResponse((response) =>
      new URL(response.url()).pathname === "/api/v1/me/reviews");
    await page.goto("/mypage/reviews");
    expect((await reviewsResponse).ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: "리뷰 관리" })).toBeVisible();
    await expect(page.getByText("현재 서버에서 지원하지 않는 기능입니다", { exact: true })).toHaveCount(0);
    await expect(page.getByText("작성한 리뷰가 없습니다.", { exact: true })).toBeVisible();
  });

  test("my reviews distinguishes an API failure from an empty collection", async ({ page }) => {
    await loginThroughUI(page, seedAccounts.member);
    await page.route("**/api/v1/me/reviews", (route) => route.fulfill({ status: 503, body: "reviews unavailable" }));
    await page.goto("/mypage/reviews");

    await expect(page.getByRole("button", { name: "다시 불러오기", exact: true })).toBeVisible();
    await expect(page.getByText("작성한 리뷰가 없습니다.", { exact: true })).toHaveCount(0);
  });

  test("my review mutations report success and refresh the persisted collection", async ({ page }) => {
    await loginThroughUI(page, seedAccounts.member);
    let reviews = [{
      id: 5,
      product_id: 1,
      option_id: 1,
      member_id: 3,
      order_id: 4,
      order_line_item_id: 6,
      rating_x2: 10,
      rating: 5,
      content: "원래 리뷰",
      is_photo_review: false,
      status: "ACTIVE",
      images: [],
    }];
    let updateAttempts = 0;
    let deleteAttempts = 0;
    await page.route("**/api/v1/me/reviews", (route) => route.fulfill({ status: 200, json: reviews }));
    await page.route("**/api/v1/reviews/5", async (route) => {
      if (route.request().method() === "DELETE") {
        deleteAttempts += 1;
        if (deleteAttempts === 1) {
          await route.fulfill({ status: 503, body: "delete unavailable" });
          return;
        }
        reviews = [];
        await route.fulfill({ status: 204, body: "" });
        return;
      }
      updateAttempts += 1;
      if (updateAttempts === 1) {
        await route.fulfill({ status: 503, body: "update unavailable" });
        return;
      }
      const draft = route.request().postDataJSON() as { rating_x2: number; content: string };
      reviews = [{ ...reviews[0], ...draft, rating: draft.rating_x2 / 2 }];
      await route.fulfill({ status: 200, json: reviews[0] });
    });
    await page.goto("/mypage/reviews");

    await page.getByRole("button", { name: "수정", exact: true }).click();
    await page.locator("textarea").fill("수정한 리뷰");
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByText(/리뷰를 수정하지 못했습니다/)).toBeVisible();
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByText("리뷰를 수정했습니다.", { exact: true })).toBeVisible();
    await expect(page.getByText("수정한 리뷰", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "삭제", exact: true }).click();
    await expect(page.getByText(/리뷰를 삭제하지 못했습니다/)).toBeVisible();
    await page.getByRole("button", { name: "삭제 다시 시도", exact: true }).click();
    await expect(page.getByText("리뷰를 삭제했습니다.", { exact: true })).toBeVisible();
    await expect(page.getByText("작성한 리뷰가 없습니다.", { exact: true })).toBeVisible();
  });

  test("coupon issue exposes success and refreshes the issuable collection", async ({ page }) => {
    await loginThroughUI(page, seedAccounts.member);
    let issuable = true;
    let issueAttempts = 0;
    await page.route("**/api/v1/coupons/issuable", (route) => route.fulfill({
      status: 200,
      json: issuable ? [{
        ID: 91,
        Code: "E2E1000",
        Name: "E2E 쿠폰",
        DiscountType: "AMOUNT",
        DiscountValue: 1000,
        MaxDiscount: 1000,
        MinOrderAmount: 10000,
        ExpiresAt: null,
        Status: "ACTIVE",
      }] : [],
    }));
    await page.route("**/api/v1/coupons", (route) => route.fulfill({ status: 200, json: [] }));
    await page.route("**/api/v1/coupons/91/issue", (route) => {
      issueAttempts += 1;
      if (issueAttempts === 1) return route.fulfill({ status: 503, body: "issue unavailable" });
      issuable = false;
      return route.fulfill({ status: 204, body: "" });
    });
    await page.goto("/mypage/coupons");

    await expect(page.getByText("E2E 쿠폰", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "쿠폰 받기", exact: true }).click();
    await expect(page.getByText(/쿠폰을 발급하지 못했습니다/)).toBeVisible();
    await page.getByRole("button", { name: "발급 상태 확인 후 다시 시도", exact: true }).click();
    await expect(page.getByText("쿠폰을 발급했습니다.", { exact: true })).toBeVisible();
    await expect(page.getByText("표시할 쿠폰이 없습니다.", { exact: true })).toBeVisible();
  });

  test("coupon query failure is not rendered as an empty collection", async ({ page }) => {
    await loginThroughUI(page, seedAccounts.member);
    await page.route("**/api/v1/coupons/issuable", (route) => route.fulfill({ status: 503, body: "coupons unavailable" }));
    await page.route("**/api/v1/coupons", (route) => route.fulfill({ status: 200, json: [] }));
    await page.goto("/mypage/coupons");

    await expect(page.getByRole("button", { name: "다시 불러오기", exact: true })).toBeVisible();
    await expect(page.getByText("표시할 쿠폰이 없습니다.", { exact: true })).toHaveCount(0);
  });

  test("order detail keeps a persisted reviewed line closed after reload", async ({ page }) => {
    await loginThroughUI(page, seedAccounts.member);
    await page.route("**/api/v1/orders/REVIEWED-E2E", (route) => route.fulfill({
      status: 200,
      json: {
        id: 4,
        order_code: "REVIEWED-E2E",
        total_order_price: 29901,
        total_discount_price: 0,
        used_point: 0,
        status: "COMPLETED",
        market_orders: [{
          id: 5,
          market_id: 1,
          shipping_fee: 0,
          status: "COMPLETED",
          expected_settlement_amount: 25000,
          line_items: [{
            id: 6,
            product_id: 1,
            option_id: 1,
            quantity: 1,
            price: 29901,
            status: "COMPLETED",
            reviewable: true,
          }],
        }],
      },
    }));
    await page.route("**/api/v1/me/reviews", (route) => route.fulfill({
      status: 200,
      json: [{
        id: 7,
        product_id: 1,
        option_id: 1,
        member_id: 3,
        order_id: 4,
        order_line_item_id: 6,
        rating_x2: 10,
        rating: 5,
        content: "이미 작성한 리뷰",
        is_photo_review: false,
        status: "ACTIVE",
        images: [],
      }],
    }));
    await page.goto("/orders/REVIEWED-E2E");

    await expect(page.getByText("Reviewed", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Write review", exact: true })).toHaveCount(0);
    await page.reload();
    await expect(page.getByText("Reviewed", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Write review", exact: true })).toHaveCount(0);
  });

  test("customer restores one live order after checkout failure and hands off to hosted payment", async ({ page, request }, testInfo) => {
    const email = `e2e-checkout-${Date.now()}-${testInfo.retry}@test.com`;
    const signup = await request.post(`${backendBaseURL}/api/v1/auth/signup`, {
      data: {
        email,
        password: "password123",
        marketingConsent: false,
        nighttimeConsent: false,
      },
    });
    expect(signup.status(), await signup.text()).toBe(201);

    const signin = await request.post(`${backendBaseURL}/api/v1/auth/signin`, {
      data: { email, password: "password123" },
    });
    expect(signin.ok(), await signin.text()).toBeTruthy();
    const { accessToken } = await signin.json() as { accessToken: string };
    const addCart = await request.post(`${backendBaseURL}/api/v1/cart/items`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { product_id: 1, option_id: 1, quantity: 1 },
    });
    expect(addCart.status(), await addCart.text()).toBe(201);

    await loginThroughUI(page, { email, password: "password123" });
    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: "장바구니" })).toBeVisible();
    await expect(page.getByText("스냅 코튼 크롭 셔츠", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "주문하기" }).click();

    await expect(page.getByRole("heading", { name: "주문서" })).toBeVisible();
    const checkoutButton = page.getByRole("button", { name: "주문 생성 후 결제" });
    await expect(checkoutButton).toBeEnabled();
    let orderCreateRequests = 0;
    page.on("request", (browserRequest) => {
      const url = new URL(browserRequest.url());
      if (browserRequest.method() === "POST" && url.pathname === "/api/v1/orders") {
        orderCreateRequests += 1;
      }
    });
    const checkoutPattern = "**/api/v1/orders/*/payment-checkout";
    await page.route(checkoutPattern, async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "text/plain",
        body: "temporary checkout failure",
      });
    });
    await checkoutButton.click();

    const retryButton = page.getByRole("button", { name: "같은 주문 결제 재시도" });
    await expect(retryButton).toBeVisible();
    await expect(page.getByText(/temporary checkout failure/)).toBeVisible();
    expect(orderCreateRequests).toBe(1);

    const replacementCart = await request.post(`${backendBaseURL}/api/v1/cart/items`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { product_id: 1, option_id: 1, quantity: 2 },
    });
    expect(replacementCart.status(), await replacementCart.text()).toBe(201);

    await page.reload();
    await expect(page.getByRole("heading", { name: "주문서" })).toBeVisible();
    await expect(retryButton).toBeEnabled();
    await expect(page.getByText(/생성된 주문:/)).toBeVisible();
    await expect(page.getByText("복구한 주문은 현재 장바구니와 별개입니다", { exact: true })).toBeVisible();
    await expect(page.getByText("옵션 #1 · 1개", { exact: true })).toBeVisible();
    await expect(page.getByText("옵션 #1 · 2개", { exact: true })).toHaveCount(0);

    await page.unroute(checkoutPattern);
    const checkoutResponsePromise = page.waitForResponse((response) =>
      /\/api\/v1\/orders\/[^/]+\/payment-checkout$/.test(response.url())
      && response.request().method() === "POST");
    await retryButton.click();
    const checkoutResponse = await checkoutResponsePromise;
    expect(checkoutResponse.ok()).toBeTruthy();
    await expect(page.getByRole("heading", { name: "실제 결제 완료는 지원하지 않습니다" })).toBeVisible();
    await expect(page).toHaveURL(/\/checkout$/);
    await page.getByRole("button", { name: "mock handoff 주소 열기" }).click();
    await expect(page).toHaveURL(/^http:\/\/localhost:8090\/mock-checkout\/[^/]+$/);
    expect(orderCreateRequests).toBe(1);
  });
});
