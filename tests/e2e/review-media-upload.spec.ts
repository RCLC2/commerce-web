import { expect, test, type Page } from "@playwright/test";

const orderPath = "/orders/ORD-20260605-0001";
const validPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEUlEQVR4nGP4Yh/3H4QZYAwAW9IKQUycgCkAAAAASUVORK5CYII=",
  "base64",
);

async function openReviewComposer(page: Page) {
  const failedRequests: string[] = [];
  page.on("requestfailed", (request) => {
    failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? ""}`);
  });

  await page.goto(orderPath);
  await expect(page.getByRole("heading", { name: "주문 상품" })).toBeVisible();
  await expect(page.getByText("리뷰 작성")).toBeVisible();

  expect(failedRequests).toEqual([]);
}

test("uploads a review image and creates a photo review", async ({ page }) => {
  await openReviewComposer(page);

  const requests: { method: string; url: string; body: string | null }[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("/media/review-images") || url.includes("/mock-s3/") || url.includes("/orders/ORD-20260605-0001/items/99/reviews")) {
      requests.push({ method: request.method(), url, body: request.postData() });
    }
  });

  await page.getByPlaceholder("상품 사용 경험을 남겨주세요").fill("사진과 함께 남기는 자동화 리뷰입니다.");
  await page.locator('input[type="file"]').setInputFiles({
    name: "review.png",
    mimeType: "image/png",
    buffer: validPng,
  });

  const presignResponse = page.waitForResponse("**/api/v1/media/review-images/presign");
  const uploadResponse = page.waitForResponse("**/mock-s3/review-image-upload");
  const completeResponse = page.waitForResponse("**/api/v1/media/review-images/complete");
  const createReviewResponse = page.waitForResponse("**/api/v1/orders/ORD-20260605-0001/items/99/reviews");

  await page.getByRole("button", { name: "리뷰 등록" }).click();

  await expect(page.getByText("리뷰가 등록됐습니다.")).toBeVisible();
  expect((await presignResponse).status()).toBe(201);
  expect((await uploadResponse).status()).toBe(200);
  expect((await completeResponse).status()).toBe(200);
  expect((await createReviewResponse).status()).toBe(201);

  const reviewCreateRequest = requests.find((request) => request.url.includes("/orders/ORD-20260605-0001/items/99/reviews"));
  expect(reviewCreateRequest?.method).toBe("POST");
  const reviewCreateBody = JSON.parse(reviewCreateRequest?.body ?? "{}") as {
    images?: { media_asset_id: number; sort_order: number; is_representative: boolean }[];
  };
  expect(reviewCreateBody).toMatchObject({
    rating_x2: 10,
    content: "사진과 함께 남기는 자동화 리뷰입니다.",
  });
  expect(reviewCreateBody.images).toHaveLength(1);
  expect(reviewCreateBody.images?.[0]).toMatchObject({ sort_order: 1, is_representative: true });
  expect(reviewCreateBody.images?.[0]?.media_asset_id).toBeGreaterThan(0);
});

test("rejects unsupported review image files before upload", async ({ page }) => {
  await openReviewComposer(page);

  await page.locator('input[type="file"]').setInputFiles({
    name: "not-image.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not an image"),
  });

  await expect(page.getByText("JPG, PNG, WEBP 이미지만 10MiB 이하로 등록할 수 있습니다.")).toBeVisible();
});

test("limits review image selection to five files", async ({ page }) => {
  await openReviewComposer(page);

  await page.locator('input[type="file"]').setInputFiles(
    Array.from({ length: 6 }, (_, index) => ({
      name: `review-${index + 1}.png`,
      mimeType: "image/png",
      buffer: validPng,
    })),
  );

  await expect(page.getByText("리뷰 이미지는 최대 5장까지 등록할 수 있습니다.")).toBeVisible();
});
