import { expect, test } from "@playwright/test";

test("PDP puts the market shelf above reviews, a flexible banner below reviews, and similar products at the bottom", async ({ page }) => {
  const product = {
    id: 1,
    market_id: 7,
    category_id: 3,
    name: "테스트 원피스",
    description: "상품 상세 설명",
    summary_description: "가볍게 입는 원피스",
    base_price: 50_000,
    discount_price: 45_000,
    shipping_type: "NORMAL",
    popularity_score: 10,
    status: "SELLING",
    image_url: "/images/fashion-placeholder.svg",
    market_name: "테스트 마켓",
    in_stock: true,
    options: [{ id: 11, product_id: 1, option_name: "사이즈", option_value: "M", additional_price: 0, quantity: 5, is_active: true }],
  };
  const shelfProduct = (id: number, name: string) => ({
    ...product,
    id,
    name,
    options: [],
    market: { id: 7, name: "테스트 마켓" },
    tag_chips: [],
  });

  await page.route("**/api/v1/products/1**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/reviews/summary")) {
      await route.fulfill({ status: 200, json: { product_id: 1, review_count: 0, average_rating: 0, photo_review_count: 0 } });
      return;
    }
    if (path.endsWith("/reviews")) {
      await route.fulfill({ status: 200, json: [] });
      return;
    }
    if (path.endsWith("/market-shelf")) {
      await route.fulfill({ status: 200, json: { mode: "PLATFORM_RECOMMENDED", items: [shelfProduct(2, "마켓 추천 상품")] } });
      return;
    }
    if (path.endsWith("/similar")) {
      await route.fulfill({ status: 200, json: { items: [shelfProduct(3, "비슷한 상품")] } });
      return;
    }
    if (path.endsWith("/review-banner")) {
      await route.fulfill({
        status: 200,
        json: {
          status: "FILLED",
          card: {
            source: "PLATFORM",
            id: 15,
            card_type: "SIGNUP_COUPON",
            headline: "가입 축하 쿠폰이 도착했어요",
            coupon_id: 3,
            cta_label: "쿠폰 받기",
            landing_url: "/mypage/coupons",
          },
        },
      });
      return;
    }
    await route.fulfill({ status: 200, json: { product } });
  });

  await page.goto("/products/1");
  const marketShelfTitle = page.getByRole("heading", { name: "테스트 마켓의 추천 상품" });
  const reviewTitle = page.getByRole("heading", { name: "상품 리뷰" });
  const similarTitle = page.getByRole("heading", { name: "비슷한 상품 추천" });
  const detailTitle = page.getByRole("heading", { name: "상품 상세 정보" });
  const reviewBanner = page.getByLabel("리뷰 아래 추천 배너");

  await expect(marketShelfTitle).toBeVisible();
  await expect(similarTitle).toBeVisible();
  expect(await marketShelfTitle.evaluate((node) => node.getBoundingClientRect().top))
    .toBeLessThan(await reviewTitle.evaluate((node) => node.getBoundingClientRect().top));
  await expect(reviewBanner.getByText("가입 축하 쿠폰이 도착했어요")).toBeVisible();
  expect(await reviewTitle.evaluate((node) => node.getBoundingClientRect().top))
    .toBeLessThan(await reviewBanner.evaluate((node) => node.getBoundingClientRect().top));
  expect(await reviewBanner.evaluate((node) => node.getBoundingClientRect().top))
    .toBeLessThan(await detailTitle.evaluate((node) => node.getBoundingClientRect().top));
  expect(await similarTitle.evaluate((node) => node.getBoundingClientRect().top))
    .toBeGreaterThan(await detailTitle.evaluate((node) => node.getBoundingClientRect().top));
});
