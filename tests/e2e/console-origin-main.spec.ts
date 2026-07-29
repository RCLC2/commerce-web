import { expect, test } from "@playwright/test";
import {
  backendBaseURL,
  expectConsoleHealthy,
  flushReact,
  installSession,
  seedAccounts,
  signIn,
} from "../support/live-backend";

const adminPages = [
  { route: "/admin", heading: "어드민 홈", endpoint: "/api/v1/admin/orders" },
  { route: "/admin/members", heading: "회원 관리", endpoint: "/api/v1/admin/members", sentinel: "admin@commerce.com" },
  { route: "/admin/markets", heading: "마켓 관리", endpoint: "/api/v1/admin/markets", sentinel: "mood studio" },
  { route: "/admin/products", heading: "상품 관리", endpoint: "/api/v1/admin/products", sentinel: "스냅 코튼 크롭 셔츠" },
  { route: "/admin/orders", heading: "주문 관리", endpoint: "/api/v1/admin/orders" },
  { route: "/admin/settlements", heading: "정산 관리", endpoint: "/api/v1/admin/settlements" },
  { route: "/admin/coupons", heading: "쿠폰 관리", endpoint: "/api/v1/admin/coupons", sentinel: "신규 회원 10% 쿠폰" },
  { route: "/admin/audit-logs", heading: "감사 로그", endpoint: "/api/v1/admin/audit-logs" },
  { route: "/admin/cms", heading: "CMS 운영", endpoint: "/api/v1/admin/carousels" },
  { route: "/admin/tokens", heading: "셀러 화면 진입", endpoint: "/api/v1/admin/markets", sentinel: "mood studio" },
] as const;

const sellerPages = [
  { route: "/seller", heading: "셀러 홈", endpoint: "/api/v1/seller/dashboard" },
  { route: "/seller/products", heading: "내 상품 관리", endpoint: "/api/v1/seller/products", sentinel: "스냅 코튼 크롭 셔츠" },
  { route: "/seller/inventory", heading: "외부몰 재고 연동", endpoint: "/api/v1/seller/inventory/sources" },
  { route: "/seller/orders", heading: "주문/배송", endpoint: "/api/v1/seller/orders" },
  { route: "/seller/settlements", heading: "정산", endpoint: "/api/v1/seller/settlements" },
  { route: "/seller/reviews", heading: "리뷰", endpoint: "/api/v1/seller/reviews" },
] as const;

test.describe("admin console against backend origin/main", () => {
  for (const target of adminPages) {
    test(`${target.route} loads without a contract error`, async ({ page, request }) => {
      let issuedMemberID: number | undefined;
      if (target.route === "/admin/coupons") {
        const email = `e2e-admin-coupon-${Date.now()}@test.com`;
        const signup = await request.post(`${backendBaseURL}/api/v1/auth/signup`, {
          data: {
            email,
            password: "password123",
            marketingConsent: false,
            nighttimeConsent: false,
          },
        });
        expect(signup.status(), await signup.text()).toBe(201);
        const memberSession = await signIn(request, { email, password: "password123" });
        const issuableResponse = await request.get(`${backendBaseURL}/api/v1/coupons/issuable`, {
          headers: { Authorization: `Bearer ${memberSession.accessToken}` },
        });
        expect(issuableResponse.ok(), await issuableResponse.text()).toBeTruthy();
        const issuable = await issuableResponse.json() as Array<{ ID: number }>;
        expect(issuable.length).toBeGreaterThan(0);
        const issueResponse = await request.post(
          `${backendBaseURL}/api/v1/coupons/${issuable[0].ID}/issue`,
          { headers: { Authorization: `Bearer ${memberSession.accessToken}` } },
        );
        expect(issueResponse.ok(), await issueResponse.text()).toBeTruthy();
        issuedMemberID = memberSession.memberID;
      }

      const session = await signIn(request, seedAccounts.admin);
      await installSession(page, session);
      const responsePromise = page.waitForResponse((response) =>
        response.url().includes(target.endpoint));

      await page.goto(target.route);
      const response = await responsePromise;
      expect(response.ok(), `${target.endpoint}: ${response.status()}`).toBeTruthy();
      await response.finished();
      await expectConsoleHealthy(page, target.heading);
      if ("sentinel" in target) {
        await expect(
          page.getByText(target.sentinel, { exact: true }).and(page.locator(":visible")).first(),
        ).toBeVisible();
      }
      if (target.route === "/admin/coupons") {
        if (!issuedMemberID) {
          throw new Error("관리자 쿠폰 검증 회원이 준비되지 않았습니다.");
        }
        await expect(page.getByText("서버 미제공", { exact: true })).toBeVisible();
        const memberCouponResponse = page.waitForResponse((response) =>
          response.url().includes(`/api/v1/admin/coupons?member_id=${issuedMemberID}`));
        const memberSelect = page.getByRole("combobox").first();
        await memberSelect.selectOption(String(issuedMemberID));
        const selectedResponse = await memberCouponResponse;
        expect(selectedResponse.ok(), await selectedResponse.text()).toBeTruthy();
        await selectedResponse.finished();
        await expect(page.getByRole("button", { name: "발급됨", exact: true })).toBeDisabled();
      }
    });
  }

  test("latest main experiment console renders its connection blocker", async ({ page, request }) => {
    const session = await signIn(request, seedAccounts.admin);
    await installSession(page, session);

    await page.goto("/admin/experiments");

    await expect(page.getByRole("heading", { name: "실험 관리", exact: true })).toBeVisible();
    await expect(page.getByText("토큰 필요", { exact: true })).toBeVisible();
    await expect(page.getByText("데이터를 불러오지 못했습니다.", { exact: true })).toHaveCount(0);
  });
});

test.describe("seller console against backend origin/main", () => {
  for (const target of sellerPages) {
    test(`${target.route} loads without a contract error`, async ({ page, request }) => {
      const session = await signIn(request, seedAccounts.seller);
      await installSession(page, session);
      const responsePromise = page.waitForResponse((response) =>
        response.url().includes(target.endpoint));

      await page.goto(target.route);
      const response = await responsePromise;
      expect(response.ok(), `${target.endpoint}: ${response.status()}`).toBeTruthy();
      await response.finished();
      await expectConsoleHealthy(page, target.heading);
      if ("sentinel" in target) {
        await expect(
          page.getByText(target.sentinel, { exact: true }).and(page.locator(":visible")).first(),
        ).toBeVisible();
      }
    });
  }

  test("seller creates a product through the UI and sees it in the live list", async ({ page, request }, testInfo) => {
    const session = await signIn(request, seedAccounts.seller);
    await installSession(page, session);
    await page.goto("/seller/products");
    await expect(page.getByRole("heading", { name: "내 상품 관리" })).toBeVisible();

    const productName = `Playwright 상품 ${Date.now()}-${testInfo.retry}`;
    await page.getByLabel("Product name").fill(productName);
    await page.getByLabel("Price").fill("19000");
    await page.getByLabel("Stock").fill("3");
    await page.getByLabel("Option name").fill("SIZE");
    await page.getByLabel("Option value").fill("FREE");
    await page.getByLabel("Description").fill("origin/main 실연동 테스트 상품");

    const createResponsePromise = page.waitForResponse((response) =>
      response.url().endsWith("/api/v1/products") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Create product" }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.ok(), await createResponse.text()).toBeTruthy();

    await expect(page.getByText("Created.", { exact: true })).toBeVisible();
    await flushReact(page);
    await expect(page.getByText(productName, { exact: true })).toBeVisible();
  });
});
