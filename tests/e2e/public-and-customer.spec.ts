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

  test("my reviews reports the backend blocker without calling a nonexistent endpoint", async ({ page }) => {
    await loginThroughUI(page, seedAccounts.member);
    let nonexistentReviewRequests = 0;
    page.on("request", (browserRequest) => {
      if (new URL(browserRequest.url()).pathname === "/api/v1/me/reviews") {
        nonexistentReviewRequests += 1;
      }
    });

    await page.goto("/mypage/reviews");

    await expect(page.getByRole("heading", { name: "내 리뷰" })).toBeVisible();
    await expect(page.getByText("현재 서버에서 지원하지 않는 기능입니다", { exact: true })).toBeVisible();
    expect(nonexistentReviewRequests).toBe(0);
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

    await page.reload();
    await expect(page.getByRole("heading", { name: "주문서" })).toBeVisible();
    await expect(retryButton).toBeEnabled();
    await expect(page.getByText(/생성된 주문:/)).toBeVisible();

    await page.unroute(checkoutPattern);
    const checkoutResponsePromise = page.waitForResponse((response) =>
      /\/api\/v1\/orders\/[^/]+\/payment-checkout$/.test(response.url())
      && response.request().method() === "POST");
    await retryButton.click();
    const checkoutResponse = await checkoutResponsePromise;
    expect(checkoutResponse.ok()).toBeTruthy();
    await expect(page).toHaveURL(/^http:\/\/localhost:8090\/mock-checkout\/[^/]+$/);
    expect(orderCreateRequests).toBe(1);
  });
});
