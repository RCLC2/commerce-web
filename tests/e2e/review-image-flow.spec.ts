import { expect, test } from "@playwright/test";

const reviewImagePNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEUlEQVR4nGP4Yh/3H4QZYAwAW9IKQUycgCkAAAAASUVORK5CYII=",
  "base64",
);

async function openReviewPanel(page: import("@playwright/test").Page) {
  await page.goto("/orders/ORD-20260605-0001");

  await expect(page.getByRole("heading", { name: "주문 상품" })).toBeVisible();
  await expect(page.getByText("구매확정").first()).toBeVisible();

  await page.getByRole("button", { name: "리뷰 작성" }).click();
  await expect(page.getByText("구매 리뷰 작성")).toBeVisible();
}

function reviewImageFile(name = "review-image.png") {
  return {
    name,
    mimeType: "image/png",
    buffer: reviewImagePNG,
  };
}

test("구매확정 주문 상품에 이미지를 첨부해 리뷰를 등록하고 상품 상세에서 확인한다", async ({ page }) => {
  const reviewContent = `Playwright 이미지 리뷰 ${Date.now()}`;

  await openReviewPanel(page);

  await page.getByRole("button", { name: "4점" }).click();
  await page.getByLabel("리뷰 내용").fill(reviewContent);
  await page.locator('input[type="file"]').setInputFiles(reviewImageFile());

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

test("리뷰 내용이 없으면 등록 버튼을 비활성화한다", async ({ page }) => {
  await openReviewPanel(page);

  const reviewContent = page.getByLabel("리뷰 내용");
  const submitButton = page.getByRole("button", { name: "리뷰 등록" });

  await expect(submitButton).toBeDisabled();

  await reviewContent.fill("상품 상태와 착용감을 남깁니다");
  await expect(submitButton).toBeEnabled();

  await reviewContent.fill(" ");
  await expect(submitButton).toBeDisabled();
});

test("비이미지 파일 첨부를 거부하고 기존 첨부 수를 유지한다", async ({ page }) => {
  await openReviewPanel(page);

  await page.locator('input[type="file"]').setInputFiles({
    name: "not-an-image.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not an image"),
  });

  await expect(page.getByText("이미지 파일만 첨부할 수 있습니다")).toBeVisible();
  await expect(page.getByText("0/5")).toBeVisible();
});

test("첨부한 리뷰 이미지를 삭제할 수 있다", async ({ page }) => {
  await openReviewPanel(page);

  await page.locator('input[type="file"]').setInputFiles(reviewImageFile("remove-me.png"));

  await expect(page.getByText("1/5")).toBeVisible();
  await expect(page.getByRole("img", { name: "첨부 이미지 1" })).toBeVisible();

  await page.getByRole("button", { name: "remove-me.png 제거" }).click();

  await expect(page.getByText("0/5")).toBeVisible();
  await expect(page.getByRole("img", { name: "첨부 이미지 1" })).toHaveCount(0);
});

test("리뷰 이미지는 최대 5장까지만 첨부한다", async ({ page }) => {
  await openReviewPanel(page);

  await page.locator('input[type="file"]').setInputFiles(
    Array.from({ length: 6 }, (_, index) => reviewImageFile(`review-image-${index + 1}.png`)),
  );

  await expect(page.getByText("리뷰 이미지는 최대 5개까지 등록할 수 있습니다")).toBeVisible();
  await expect(page.getByText("5/5")).toBeVisible();
  await expect(page.getByRole("img", { name: "첨부 이미지 5" })).toBeVisible();
  await expect(page.getByRole("img", { name: /^첨부 이미지/ })).toHaveCount(5);
});

test("이미지 없이 텍스트 리뷰를 등록하고 상품 상세에서 확인한다", async ({ page }) => {
  const reviewContent = `Playwright 텍스트 리뷰 ${Date.now()}`;

  await openReviewPanel(page);

  await page.getByLabel("리뷰 내용").fill(reviewContent);
  await page.getByRole("button", { name: "리뷰 등록" }).click();

  await expect(page.getByText("리뷰가 등록되었습니다.")).toBeVisible();

  await page.getByRole("link", { name: "스냅 코튼 크롭 셔츠" }).click();
  await expect(page).toHaveURL(/\/products\/101$/);

  const reviewArticle = page.locator("article").filter({ hasText: reviewContent });
  await expect(reviewArticle).toBeVisible();
  await expect(reviewArticle.getByLabel("평점 5점")).toBeVisible();
  await expect(reviewArticle.getByText("포토리뷰")).toHaveCount(0);
  await expect(reviewArticle.getByRole("img", { name: /^리뷰 이미지/ })).toHaveCount(0);
});
