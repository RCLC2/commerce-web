import { expect, test } from "@playwright/test";

const carts = [
  {
    ID: 1,
    MemberID: 7,
    ProductID: 101,
    OptionID: 1001,
    Quantity: 1,
    PriceAtAdded: 89_000,
    CouponPriceAtAdded: 79_000,
    CouponIDAtAdded: 31,
    CouponIssueRequiredAtAdded: true,
    CurrentPrice: 99_000,
    CurrentCouponPrice: 89_000,
    BestCouponQuote: { CouponID: 32, Source: "ISSUABLE", DiscountAmount: 10_000, DiscountedAmount: 89_000, IssueRequired: true },
    PriceChangeAmount: 10_000,
    PriceChangeRate: 12,
  },
  {
    ID: 2,
    MemberID: 7,
    ProductID: 102,
    OptionID: 1002,
    Quantity: 1,
    PriceAtAdded: 59_000,
    CouponPriceAtAdded: 49_000,
    CouponIDAtAdded: 40,
    UserCouponIDAtAdded: 400,
    CouponIssueRequiredAtAdded: false,
    CurrentPrice: 53_100,
    CurrentCouponPrice: 43_100,
    BestCouponQuote: { CouponID: 40, UserCouponID: 400, Source: "OWNED", DiscountAmount: 10_000, DiscountedAmount: 43_100, IssueRequired: false },
    PriceChangeAmount: -5_900,
    PriceChangeRate: -12,
  },
];

const products = {
  "101": {
    product: {
      id: 101,
      market_id: 11,
      category_id: 1,
      name: "소프트 울 크롭 재킷",
      description: "가볍고 포근한 울 혼방 재킷",
      base_price: 99_000,
      discount_price: 0,
      coupon_lowest_price: 89_000,
      best_coupon_quote: { coupon_id: 32, code: "PUBLIC-10K", name: "공개 10,000원 쿠폰", source: "ISSUABLE", discount_amount: 10_000, discounted_amount: 89_000, issue_required: true },
      shipping_type: "NORMAL",
      popularity_score: 92,
      status: "SELLING",
      market_name: "모먼트 스튜디오",
      image_url: "https://images.unsplash.com/mock-jacket",
      in_stock: true,
      options: [
        {
          id: 1001,
          product_id: 101,
          option_name: "색상/사이즈",
          option_value: "크림 / FREE",
          additional_price: 0,
          quantity: 20,
          reserved_quantity: 2,
          is_active: true,
        },
      ],
    },
    lowest_price: 99_000,
    delivery_type: "NORMAL",
  },
  "102": {
    product: {
      id: 102,
      market_id: 12,
      category_id: 1,
      name: "에센셜 스트레이트 데님",
      description: "매일 입기 좋은 스트레이트 데님",
      base_price: 59_000,
      discount_price: 53_100,
      coupon_lowest_price: 43_100,
      best_coupon_quote: { coupon_id: 40, user_coupon_id: 400, code: "MEMBER-10K", name: "보유 10,000원 쿠폰", source: "OWNED", discount_amount: 10_000, discounted_amount: 43_100, issue_required: false },
      shipping_type: "NORMAL",
      popularity_score: 78,
      status: "SELLING",
      market_name: "데일리 아카이브",
      image_url: "https://images.unsplash.com/mock-denim",
      in_stock: true,
      options: [
        {
          id: 1002,
          product_id: 102,
          option_name: "색상/사이즈",
          option_value: "딥블루 / M",
          additional_price: 0,
          quantity: 15,
          reserved_quantity: 1,
          is_active: true,
        },
      ],
    },
    lowest_price: 53_100,
    delivery_type: "NORMAL",
  },
};

const jacket = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320"><rect width="320" height="320" fill="#f3eee8"/><path d="M103 82l31-19h52l31 19 35 50-35 29v99H103v-99l-35-29z" fill="#e3d3c3" stroke="#8d7968" stroke-width="5"/><path d="M134 63l26 35 26-35M160 98v142M68 132l48 35M252 132l-48 35" fill="none" stroke="#8d7968" stroke-width="5"/></svg>`;
const denim = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320"><rect width="320" height="320" fill="#e9eef4"/><path d="M101 57h118l-10 91 25 111h-58l-16-93-16 93H86l25-111 10-91z" fill="#617a9b" stroke="#304964" stroke-width="5"/><path d="M101 86h118M160 57v109" fill="none" stroke="#c9d5e3" stroke-width="4"/></svg>`;

test("captures cart price increases and decreases for the pull request", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => {
    window.localStorage.setItem("commerce.accessToken", "ci-member-token");
    window.localStorage.setItem("commerce.memberID", "7");
    window.localStorage.setItem("commerce.role", "MEMBER");
  });

  await page.route("**/api/v1/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/v1/cart") {
      await route.fulfill({ status: 200, json: carts });
      return;
    }
    if (pathname === "/api/v1/categories") {
      await route.fulfill({ status: 200, json: [] });
      return;
    }
    if (pathname === "/api/v1/me") {
      await route.fulfill({
        status: 200,
        json: {
          id: 7,
          email: "member@commerce.test",
          role: "MEMBER",
          status: "ACTIVE",
          point_balance: 0,
        },
      });
      return;
    }
    if (pathname === "/api/v1/me/notifications/unread-count") {
      await route.fulfill({ status: 200, json: { unread_count: 2 } });
      return;
    }
    const productMatch = pathname.match(/^\/api\/v1\/products\/(\d+)$/);
    if (productMatch) {
      const product = products[productMatch[1] as keyof typeof products];
      await route.fulfill(product ? { status: 200, json: product } : { status: 404, json: {} });
      return;
    }
    await route.fulfill({ status: 404, json: { message: "not mocked" } });
  });

  await page.route("**/_next/image?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: route.request().url().includes("mock-denim") ? denim : jacket,
    });
  });

  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "장바구니", exact: true })).toBeVisible();
  await expect(page.getByText("담은 뒤 10,000원 올랐어요", { exact: true })).toBeVisible();
  await expect(page.getByText("담은 뒤 5,900원 내렸어요", { exact: true })).toBeVisible();
  await expect(page.getByText("담을 때보다", { exact: true })).toBeVisible();
  await expect(page.getByText("+4,100원", { exact: true })).toBeVisible();

  await page.screenshot({
    path: "output/pr-screenshots/cart-price-change.png",
    fullPage: true,
  });
});
