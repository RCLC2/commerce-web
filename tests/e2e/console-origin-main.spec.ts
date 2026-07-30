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

  test("admin creates, updates, and deactivates a CMS carousel through the UI", async ({ page, request }, testInfo) => {
    const session = await signIn(request, seedAccounts.admin);
    await installSession(page, session);
    await page.goto("/admin/cms");
    await expect(page.getByRole("heading", { name: "CMS 운영", exact: true })).toBeVisible();

    const title = `Playwright 캐러셀 ${Date.now()}-${testInfo.retry}`;
    const updatedTitle = `${title} 수정`;
    const carouselForm = page.locator("section").filter({
      has: page.getByRole("heading", { name: "이벤트 캐러셀 등록", exact: true }),
    }).last();
    await carouselForm.getByLabel("캐러셀 제목").fill(title);
    await carouselForm.getByLabel("이미지 URL").fill("https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1200&auto=format&fit=crop");
    await carouselForm.getByLabel("대상 유형").selectOption("PRODUCT");
    await carouselForm.getByLabel("대상 ID").fill("1");
    await carouselForm.getByLabel("노출 순서").fill("99");
    await carouselForm.getByLabel("노출 상태").selectOption("ACTIVE");
    await carouselForm.getByLabel("시작 일시").fill(
      new Date(Date.now() - 60 * 60 * 1000).toISOString().slice(0, 16),
    );
    await carouselForm.getByLabel("종료 일시").fill(
      new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    );

    const createResponse = page.waitForResponse((response) =>
      response.url().endsWith("/api/v1/carousels")
      && response.request().method() === "POST");
    await carouselForm.getByRole("button", { name: "등록", exact: true }).click();
    expect((await createResponse).ok()).toBeTruthy();
    await expect(page.getByText(title, { exact: true })).toBeVisible();

    const createdCard = page.locator("section").filter({
      has: page.getByText(title, { exact: true }),
    }).last();
    await createdCard.getByRole("button", { name: "수정", exact: true }).click();
    const editForm = page.locator("section").filter({
      has: page.getByRole("heading", { name: "이벤트 캐러셀 수정", exact: true }),
    }).last();
    await editForm.getByLabel("캐러셀 제목").fill(updatedTitle);

    const updateResponse = page.waitForResponse((response) =>
      /\/api\/v1\/carousels\/\d+$/.test(response.url())
      && response.request().method() === "PUT");
    await editForm.getByRole("button", { name: "수정 저장", exact: true }).click();
    expect((await updateResponse).ok()).toBeTruthy();
    await expect(page.getByText(updatedTitle, { exact: true })).toBeVisible();

    const updatedCard = page.locator("section").filter({
      has: page.getByText(updatedTitle, { exact: true }),
    }).last();
    const deactivateResponse = page.waitForResponse((response) =>
      /\/api\/v1\/carousels\/\d+$/.test(response.url())
      && response.request().method() === "DELETE");
    await updatedCard.getByRole("button", { name: "비활성화", exact: true }).click();
    expect((await deactivateResponse).ok()).toBeTruthy();
    await expect(updatedCard.getByText("비활성", { exact: true })).toBeVisible();
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

  test("seller creates and updates a product while exposing the base-price migration blocker", async ({ page, request }, testInfo) => {
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

    const statusSelect = page.getByLabel(`${productName} 상태`);
    await expect(statusSelect).toBeVisible();
    await statusSelect.selectOption("SOLD_OUT");
    const productRow = statusSelect.locator(
      "xpath=ancestor::div[contains(@style, 'grid-template-columns')][1]",
    );
    const updateResponsePromise = page.waitForResponse((response) =>
      /\/api\/v1\/products\/\d+$/.test(response.url())
      && response.request().method() === "PUT");
    await productRow.getByRole("button", { name: "변경 저장", exact: true }).click();
    const updateResponse = await updateResponsePromise;
    expect(updateResponse.ok(), await updateResponse.text()).toBeTruthy();
    await flushReact(page);
    await expect(page.getByLabel(`${productName} 상태`)).toHaveValue("SOLD_OUT");

    const priceInput = page.getByLabel(`${productName} 판매가`);
    await priceInput.fill("21000");
    const refreshedProductRow = priceInput.locator(
      "xpath=ancestor::div[contains(@style, 'grid-template-columns')][1]",
    );
    const blockedPriceResponsePromise = page.waitForResponse((response) =>
      /\/api\/v1\/products\/\d+$/.test(response.url())
      && response.request().method() === "PUT");
    await refreshedProductRow.getByRole("button", { name: "변경 저장", exact: true }).click();
    const blockedPriceResponse = await blockedPriceResponsePromise;
    expect(blockedPriceResponse.status()).toBe(500);
    expect(await blockedPriceResponse.text()).toContain("수정 실패");
    await expect(page.getByText("작업을 완료하지 못했습니다.", { exact: true })).toBeVisible();
    await expect(page.getByText("수정 실패", { exact: true })).toBeVisible();
  });
});
