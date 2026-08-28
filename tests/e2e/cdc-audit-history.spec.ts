import { expect, test } from "@playwright/test";
import {
  backendBaseURL,
  installSession,
  seedAccounts,
  signIn,
} from "../support/live-backend";

test.describe("CDC audit history console", () => {
  test.skip(process.env.E2E_CDC_AUDIT !== "1", "Tabellarius CDC stack is required");

  test("renders attributed admin and seller changes with filters and cursor pagination", async ({
    page,
    request,
  }) => {
    const suffix = Date.now();
    const adminRequestID = `cdc-playwright-admin-${suffix}`;
    const sellerRequestID = `cdc-playwright-seller-${suffix}`;
    const categoryName = `CDC Playwright ${suffix}`;
    const admin = await signIn(request, seedAccounts.admin);
    const seller = await signIn(request, seedAccounts.seller);

    const categoryResponse = await request.post(`${backendBaseURL}/api/v1/admin/categories`, {
      headers: {
        Authorization: `Bearer ${admin.accessToken}`,
        "X-Request-ID": adminRequestID,
      },
      data: {
        name: categoryName,
        slug: `cdc-playwright-${suffix}`,
        display_order: 99,
      },
    });
    expect(categoryResponse.status(), await categoryResponse.text()).toBe(201);

    const accountResponse = await request.put(
      `${backendBaseURL}/api/v1/seller/markets/1/settlement-account`,
      {
        headers: {
          Authorization: `Bearer ${seller.accessToken}`,
          "X-Request-ID": sellerRequestID,
        },
        data: {
          BankCode: "088",
          AccountNumber: String(suffix),
          AccountHolder: "CDC Playwright",
        },
      },
    );
    expect(accountResponse.status(), await accountResponse.text()).toBe(200);

    await expect.poll(async () => {
      const response = await request.get(`${backendBaseURL}/api/v1/admin/audit-logs`, {
        headers: { Authorization: `Bearer ${admin.accessToken}` },
        params: { request_id: adminRequestID },
      });
      if (!response.ok()) return false;
      const body = await response.json() as { items: Array<{ request_id?: string }> };
      return body.items.some((item) => item.request_id === adminRequestID);
    }, { timeout: 20_000 }).toBe(true);

    await installSession(page, admin);
    const defaultResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === "/api/v1/admin/audit-logs"
        && response.request().method() === "GET"
        && url.searchParams.get("limit") === "30";
    });
    await page.goto("/admin/audit-logs");
    expect((await defaultResponse).ok()).toBeTruthy();
    await expect(page.getByRole("heading", { name: "변경 이력", exact: true })).toBeVisible();
    await expect(page.getByLabel("페이지 크기")).toHaveValue("30");
    await expect(page.getByText("ADMIN.CATEGORY.CREATE", { exact: true }).first()).toBeVisible();

    const limitResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === "/api/v1/admin/audit-logs"
        && response.request().method() === "GET"
        && url.searchParams.get("limit") === "10";
    });
    await page.getByLabel("페이지 크기").selectOption("10");
    expect((await limitResponse).ok()).toBeTruthy();
    await expect(page.getByLabel("페이지 크기")).toHaveValue("10");
    await expect(page.getByRole("button", { name: "상세 보기", exact: true })).toHaveCount(10);

    await page.getByLabel("요청 ID").fill(adminRequestID);
    await page.getByLabel("행위자 역할").selectOption("ADMIN");
    await page.getByLabel("테이블").fill("categories");
    await page.getByLabel("변경 유형").selectOption("INSERT");
    await page.getByLabel("귀속 상태").selectOption("ATTRIBUTED");
    const filterResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === "/api/v1/admin/audit-logs"
        && response.request().method() === "GET"
        && url.searchParams.get("request_id") === adminRequestID
        && url.searchParams.get("actor_role") === "ADMIN"
        && url.searchParams.get("table_name") === "categories"
        && url.searchParams.get("operation") === "INSERT"
        && url.searchParams.get("attribution_status") === "ATTRIBUTED";
    });
    await page.getByRole("button", { name: "필터 적용", exact: true }).click();
    expect((await filterResponse).ok()).toBeTruthy();
    await expect(page.getByRole("button", { name: "상세 보기", exact: true })).toHaveCount(1);
    await expect(page.getByText("관리자 #1", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("ADMIN.CATEGORY.CREATE", { exact: true }).first()).toBeVisible();

    await page.getByRole("button", { name: "상세 보기", exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "변경 이력 상세", exact: true })).toBeVisible();
    await expect(page.getByText(adminRequestID, { exact: true })).toBeVisible();
    await expect(page.getByText(categoryName)).toBeVisible();
    await page.getByRole("button", { name: "닫기", exact: true }).click();

    await page.getByRole("button", { name: "필터 초기화", exact: true }).click();
    await expect(page.getByLabel("요청 ID")).toHaveValue("");
    await expect(page.getByRole("button", { name: "상세 보기", exact: true })).toHaveCount(10);

    const nextResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === "/api/v1/admin/audit-logs"
        && response.request().method() === "GET"
        && url.searchParams.get("limit") === "10"
        && Boolean(url.searchParams.get("cursor"));
    });
    await page.getByRole("button", { name: "다음 페이지", exact: true }).click();
    expect((await nextResponse).ok()).toBeTruthy();
    await expect(page.getByText("cursor 기반 2페이지", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "이전 페이지", exact: true })).toBeEnabled();

    await installSession(page, seller);
    const sellerLogsResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === "/api/v1/seller/audit-logs"
        && response.request().method() === "GET"
        && url.searchParams.get("limit") === "30";
    });
    await page.goto("/seller/audit-logs");
    expect((await sellerLogsResponse).ok()).toBeTruthy();
    await expect(page.getByText("SELLER.SETTLEMENT_ACCOUNT.UPSERT", { exact: true }).first()).toBeVisible();
    await expect(page.getByLabel("마켓 ID")).toHaveCount(0);
  });
});
