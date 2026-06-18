import { expect, test, type Page } from "@playwright/test";

const isMockE2E = process.env.NEXT_PUBLIC_API_MOCKING === "enabled";
const adminEmail = process.env.E2E_ADMIN_EMAIL ?? (isMockE2E ? "admin@commerce.test" : "admin@commerce.com");
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? (isMockE2E ? "password" : "password123");

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(adminEmail);
  await page.getByLabel("비밀번호").fill(adminPassword);
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/mypage$/);
}

async function visibleWeeklyDropTargetID(page: Page) {
  const weeklyDropCard = page.locator("section").filter({ hasText: "Weekly Drop" }).last();
  await expect(weeklyDropCard).toBeVisible();
  const targetText = await weeklyDropCard.getByText(/PRODUCT #\d+/).textContent();
  const match = targetText?.match(/#(\d+)/);
  if (!match) {
    throw new Error(`Weekly Drop 상품 대상 ID를 찾지 못했습니다: ${targetText ?? ""}`);
  }
  return match[1];
}

test("home renders active CMS carousel", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Weekly Drop" })).toBeVisible();
  await expect(page.getByText(/상품 #\d+/)).toBeVisible();
});

test("admin can review scheduled CMS carousels", async ({ page }) => {
  await loginAsAdmin(page);

  await page.goto("/admin/cms");
  await expect(page.getByRole("heading", { name: "CMS" })).toBeVisible();
  await expect(page.getByText("홈 캐러셀과 운영 배너의 노출 상태를 관리합니다.")).toBeVisible();

  await expect(page.getByText("Weekly Drop")).toBeVisible();
  await expect(page.getByText(/PRODUCT #\d+/)).toBeVisible();
  await expect(page.getByText(/KST/)).toBeVisible();
  await expect(page.getByText("노출 순서 1")).toBeVisible();

  await expect(page.getByText("오늘출발 모음")).toBeVisible();
  await expect(page.getByText(/MARKET #\d+/)).toBeVisible();
  await expect(page.getByText("즉시 - 무기한")).toBeVisible();
  await expect(page.locator("span").filter({ hasText: "비활성" })).toBeVisible();
});

test("admin CMS status filter hides inactive carousels", async ({ page }) => {
  await loginAsAdmin(page);

  await page.goto("/admin/cms");
  await page.getByLabel("상태").selectOption("ACTIVE");

  await expect(page.getByText("Weekly Drop")).toBeVisible();
  await expect(page.getByText("오늘출발 모음")).toHaveCount(0);
});

test("admin can create update and deactivate CMS carousel", async ({ page }) => {
  await loginAsAdmin(page);

  const title = `Summer Spotlight ${Date.now()}`;
  const updatedTitle = `${title} Updated`;
  await page.goto("/admin/cms");
  const targetID = await visibleWeeklyDropTargetID(page);

  await page.getByLabel("제목").fill(title);
  await page.getByLabel("이미지 URL").fill("https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200&auto=format&fit=crop");
  await page.getByLabel("대상 ID").fill(targetID);
  await page.getByLabel("노출 순서").fill("3");
  await page.locator("form").getByRole("button", { name: "등록" }).click();

  const createdCard = page.locator("section").filter({ hasText: title }).last();
  await expect(createdCard).toBeVisible();
  await createdCard.getByRole("button", { name: "수정" }).click();
  await page.getByLabel("제목").fill(updatedTitle);
  await page.locator("form").getByRole("button", { name: "수정" }).click();

  const updatedCard = page.locator("section").filter({ hasText: updatedTitle }).last();
  await expect(updatedCard).toBeVisible();
  await updatedCard.getByRole("button", { name: "비활성화" }).click();
  await page.getByLabel("상태").selectOption("ACTIVE");

  await expect(page.getByText(updatedTitle)).toHaveCount(0);
});
