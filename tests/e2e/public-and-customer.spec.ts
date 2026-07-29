import { expect, test } from "@playwright/test";
import { backendBaseURL, flushReact, loginThroughUI } from "../support/live-backend";

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

  test("customer can complete checkout from a live API-seeded cart", async ({ page, request }, testInfo) => {
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
    await checkoutButton.click();

    await expect(page).toHaveURL(/\/orders\/[^/]+$/);
    await expect(page.getByText("Order no.", { exact: true })).toBeVisible();
    await expect(page.getByText("Could not load order.", { exact: true })).toHaveCount(0);
  });
});
