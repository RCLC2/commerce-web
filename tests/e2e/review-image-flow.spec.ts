import { expect, test } from "@playwright/test";

const reviewImagePNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEUlEQVR4nGP4Yh/3H4QZYAwAW9IKQUycgCkAAAAASUVORK5CYII=",
  "base64",
);

test("구매확정 주문 상품에 이미지를 첨부해 리뷰를 등록하고 상품 상세에서 확인한다", async ({ page }) => {
  const reviewContent = `Playwright 이미지 리뷰 ${Date.now()}`;

  await page.goto("/orders/ORD-20260605-0001");

  await expect(page.getByRole("heading", { name: "주문 상품" })).toBeVisible();
  await expect(page.getByText("구매확정").first()).toBeVisible();

  await page.getByRole("button", { name: "리뷰 작성" }).click();
  await expect(page.getByText("구매 리뷰 작성")).toBeVisible();

  await page.getByRole("button", { name: "4점" }).click();
  await page.getByLabel("리뷰 내용").fill(reviewContent);
  await page.locator('input[type="file"]').setInputFiles({
    name: "review-image.png",
    mimeType: "image/png",
    buffer: reviewImagePNG,
  });

  await expect(page.getByText("1/5")).toBeVisible();
  await expect(page.getByRole("img", { name: "첨부 이미지 1" })).toBeVisible();

  await page.getByRole("button", { name: "리뷰 등록" }).click();
  await expect(page.getByText("리뷰가 등록되었습니다.")).toBeVisible();

  await page.getByRole("link", { name: "스냅 코튼 크롭 셔츠" }).click();
  await expect(page).toHaveURL(/\/products\/101$/);

  await expect(page.getByText(reviewContent)).toBeVisible();
  await expect(page.getByText("포토리뷰").first()).toBeVisible();
  await expect(page.getByRole("img", { name: "리뷰 이미지 1" }).first()).toBeVisible();
});
