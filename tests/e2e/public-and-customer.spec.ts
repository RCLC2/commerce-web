import { expect, test } from "@playwright/test";
import { backendBaseURL, flushReact, installSession, loginThroughUI, seedAccounts, signIn } from "../support/live-backend";

test.describe("public and customer journeys with live and controlled API boundaries", () => {
  test("login rejects external-looking return paths", async ({ page }) => {
    await page.goto("/login?next=%2F%2Fevil.example%2Fsteal");
    await page.getByLabel("이메일").fill(seedAccounts.member.email);
    await page.getByLabel("비밀번호").fill(seedAccounts.member.password);
    await page.getByRole("button", { name: "로그인", exact: true }).click();

    await expect(page).toHaveURL(/\/mypage$/);
    expect(new URL(page.url()).hostname).toBe("127.0.0.1");
  });

  test("public home renders live catalog and opens product detail", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "인기 상품" })).toBeVisible();
    const productLink = page.locator('a[href^="/products/"]').first();
    await expect(productLink).toBeVisible();
    const productHref = await productLink.getAttribute("href");
    expect(productHref).toMatch(/^\/products\/\d+$/);
    await productLink.click();

    await expect(page).toHaveURL(new RegExp(`${productHref!.replace("/", "\\/")}$`));
    await expect(page.getByRole("heading").first()).toBeVisible();
    await expect(page.getByRole("combobox").first()).toBeVisible();
  });

  test("public collection failures render retry UI instead of empty content", async ({ page }) => {
    await page.route("**/api/v1/products/popular", (route) => route.fulfill({ status: 503, body: "products unavailable" }));
    await page.goto("/popular-products");
    await expect(page.getByRole("button", { name: "다시 시도", exact: true })).toBeVisible();
    await expect(page.getByText("표시할 상품이 없습니다.", { exact: true })).toHaveCount(0);

    await page.route("**/api/v1/markets", (route) => route.fulfill({ status: 503, body: "markets unavailable" }));
    await page.goto("/popular-markets");
    await expect(page.getByRole("button", { name: "다시 시도", exact: true })).toBeVisible();
    await expect(page.getByText("표시할 마켓이 없습니다.", { exact: true })).toHaveCount(0);

    await page.route("**/api/v1/search/trending**", (route) => route.fulfill({ status: 503, body: "trending unavailable" }));
    await page.goto("/search");
    await expect(page.getByRole("button", { name: "다시 시도", exact: true })).toBeVisible();
    await expect(page.getByText("표시할 인기 검색어가 없습니다.", { exact: true })).toHaveCount(0);
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
      page.getByText("발급 가능한 쿠폰", { exact: true }).locator("..").getByText("1장", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "다시 시도", exact: true })).toHaveCount(0);

    await page.getByText("발급 가능한 쿠폰", { exact: true }).locator("..").getByRole("link", { name: "더보기" }).click();
    const issueResponsePromise = page.waitForResponse((response) =>
      /\/api\/v1\/coupons\/\d+\/issue$/.test(response.url())
      && response.request().method() === "POST");
    await page.getByRole("button", { name: "쿠폰 받기", exact: true }).click();
    const issueResponse = await issueResponsePromise;
    expect(issueResponse.ok(), await issueResponse.text()).toBeTruthy();
    await flushReact(page);
    await expect(page.getByText("쿠폰을 발급했습니다.", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "발급한 쿠폰", exact: true }).click();
    await expect(page.getByText("신규 회원 10% 쿠폰", { exact: true })).toBeVisible();
  });

  test("my reviews renders a controlled deployed-shape collection", async ({ page }) => {
    await loginThroughUI(page, seedAccounts.member);
    await page.route("**/api/v1/me/reviews", (route) => route.fulfill({ status: 200, json: [] }));
    const reviewsResponse = page.waitForResponse((response) =>
      new URL(response.url()).pathname === "/api/v1/me/reviews");
    await page.goto("/mypage/reviews");
    expect((await reviewsResponse).ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: "리뷰 관리" })).toBeVisible();
    await expect(page.getByText("현재 서버에서 지원하지 않는 기능입니다", { exact: true })).toHaveCount(0);
    await expect(page.getByText("작성한 리뷰가 없습니다.", { exact: true })).toBeVisible();
  });

  test("my reviews distinguishes an API failure from an empty collection", async ({ page }) => {
    await loginThroughUI(page, seedAccounts.member);
    await page.route("**/api/v1/me/reviews", (route) => route.fulfill({ status: 503, body: "reviews unavailable" }));
    await page.goto("/mypage/reviews");

    await expect(page.getByRole("button", { name: "다시 불러오기", exact: true })).toBeVisible();
    await expect(page.getByText("작성한 리뷰가 없습니다.", { exact: true })).toHaveCount(0);
  });

  test("review creation reconciles a committed review after the response is lost", async ({ page }) => {
    await loginThroughUI(page, seedAccounts.member);
    let created = false;
    let createAttempts = 0;
    await page.route("**/api/v1/orders/REVIEW-CREATE-E2E", (route) => route.fulfill({
      status: 200,
      json: {
        id: 4,
        order_code: "REVIEW-CREATE-E2E",
        total_order_price: 29901,
        total_discount_price: 0,
        used_point: 0,
        status: "COMPLETED",
        market_orders: [{
          id: 5,
          market_id: 1,
          shipping_fee: 0,
          status: "COMPLETED",
          expected_settlement_amount: 25000,
          line_items: [{ id: 6, product_id: 1, option_id: 1, quantity: 1, price: 29901, status: "COMPLETED", reviewable: true }],
        }],
      },
    }));
    await page.route("**/api/v1/me/reviews", (route) => route.fulfill({
      status: 200,
      json: created ? [{
        id: 7,
        product_id: 1,
        option_id: 1,
        member_id: 3,
        order_id: 4,
        order_line_item_id: 6,
        rating_x2: 10,
        rating: 5,
        content: "응답 유실 리뷰",
        is_photo_review: false,
        status: "ACTIVE",
        images: [],
      }] : [],
    }));
    await page.route("**/api/v1/orders/REVIEW-CREATE-E2E/items/6/reviews", (route) => {
      createAttempts += 1;
      created = true;
      return route.fulfill({ status: 503, body: "create response lost" });
    });
    await page.goto("/orders/REVIEW-CREATE-E2E");

    await page.getByRole("button", { name: "Write review", exact: true }).click();
    await page.getByPlaceholder("사이즈, 핏, 소재감이 어땠나요?").fill("응답 유실 리뷰");
    await page.getByRole("button", { name: "리뷰 등록", exact: true }).click();

    await expect(page.getByText("Reviewed", { exact: true })).toBeVisible();
    expect(createAttempts).toBe(1);
  });

  test("cart add reconciles one matching row after the response is lost", async ({ page, request }) => {
    const session = await signIn(request, seedAccounts.member);
    await installSession(page, session);
    let cartReads = 0;
    let addAttempts = 0;
    await page.route("**/api/v1/cart", (route) => {
      cartReads += 1;
      return route.fulfill({
        status: 200,
        json: cartReads === 1 ? [] : [{
          ID: 901,
          MemberID: session.memberID,
          ProductID: 1,
          OptionID: 1,
          Quantity: 1,
          PriceAtAdded: 29901,
        }],
      });
    });
    await page.route("**/api/v1/cart/items", (route) => {
      addAttempts += 1;
      return route.fulfill({ status: 503, body: "cart response lost" });
    });
    await page.goto("/products/1");

    await page.getByRole("button", { name: "장바구니 담기", exact: true }).first().click();

    await expect(page.getByText(/상품을 담았습니다/).first()).toBeVisible();
    expect(addAttempts).toBe(1);
  });

  test("profile load failure never exposes default values as editable data", async ({ page, request }) => {
    const session = await signIn(request, seedAccounts.member);
    await installSession(page, session);
    await page.route("**/api/v1/me", (route) => route.fulfill({ status: 503, body: "profile unavailable" }));
    await page.goto("/mypage/profile");

    await expect(page.getByRole("button", { name: "다시 시도", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "변경사항 저장", exact: true })).toHaveCount(0);
  });

  test("address save failure remains visible beside the edit form", async ({ page, request }) => {
    const session = await signIn(request, seedAccounts.member);
    await installSession(page, session);
    await page.route("**/api/v1/me/addresses", (route) => route.fulfill({
      status: 200,
      json: [{
        ID: 51,
        ReceiverName: "테스트 사용자",
        ReceiverPhone: "010-0000-0000",
        PostalCode: "06236",
        BaseAddress: "서울시 강남구",
        DetailAddress: "1층",
        IsDefault: true,
      }],
    }));
    await page.route("**/api/v1/me/addresses/51", (route) => route.fulfill({ status: 503, body: "address unavailable" }));
    await page.goto("/mypage");

    await page.getByRole("button", { name: "편집하기", exact: true }).click();
    await page.getByRole("button", { name: "저장", exact: true }).click();

    await expect(page.getByText(/address unavailable/)).toBeVisible();
    await expect(page.getByRole("button", { name: "저장", exact: true })).toBeVisible();
  });

  test("controlled review mutations reconcile uncertain update and delete responses", async ({ page }) => {
    await loginThroughUI(page, seedAccounts.member);
    let reviews = [{
      id: 5,
      product_id: 1,
      option_id: 1,
      member_id: 3,
      order_id: 4,
      order_line_item_id: 6,
      rating_x2: 10,
      rating: 5,
      content: "원래 리뷰",
      is_photo_review: false,
      status: "ACTIVE",
      images: [],
    }];
    let updateAttempts = 0;
    let deleteAttempts = 0;
    await page.route("**/api/v1/me/reviews", (route) => route.fulfill({ status: 200, json: reviews }));
    await page.route("**/api/v1/reviews/5", async (route) => {
      if (route.request().method() === "DELETE") {
        deleteAttempts += 1;
        if (deleteAttempts === 1) {
          reviews = [];
          await route.fulfill({ status: 503, body: "delete unavailable" });
          return;
        }
        await route.fulfill({ status: 404, body: "review not found" });
        return;
      }
      updateAttempts += 1;
      if (updateAttempts === 1) {
        await route.fulfill({ status: 503, body: "update unavailable" });
        return;
      }
      const draft = route.request().postDataJSON() as { rating_x2: number; content: string };
      reviews = [{ ...reviews[0], ...draft, rating: draft.rating_x2 / 2 }];
      await route.fulfill({ status: 200, json: reviews[0] });
    });
    await page.goto("/mypage/reviews");

    await page.getByRole("button", { name: "수정", exact: true }).click();
    await page.locator("textarea").fill("수정한 리뷰");
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByText(/리뷰를 수정하지 못했습니다/)).toBeVisible();
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByText("리뷰를 수정했습니다.", { exact: true })).toBeVisible();
    await expect(page.getByText("수정한 리뷰", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "삭제", exact: true }).click();
    await expect(page.getByText(/리뷰를 삭제하지 못했습니다/)).toBeVisible();
    await page.getByRole("button", { name: "삭제 상태 확인 후 다시 시도", exact: true }).click();
    await expect(page.getByText("리뷰를 삭제했습니다.", { exact: true })).toBeVisible();
    await expect(page.getByText("작성한 리뷰가 없습니다.", { exact: true })).toBeVisible();
  });

  test("controlled coupon issue failure retries after checking server state", async ({ page }) => {
    await loginThroughUI(page, seedAccounts.member);
    let issuable = true;
    let issueAttempts = 0;
    await page.route("**/api/v1/coupons/issuable", (route) => route.fulfill({
      status: 200,
      json: issuable ? [{
        ID: 91,
        Code: "E2E1000",
        Name: "E2E 쿠폰",
        DiscountType: "AMOUNT",
        DiscountValue: 1000,
        MaxDiscount: 1000,
        MinOrderAmount: 10000,
        ExpiresAt: null,
        Status: "ACTIVE",
      }] : [],
    }));
    await page.route("**/api/v1/coupons", (route) => route.fulfill({ status: 200, json: [] }));
    await page.route("**/api/v1/coupons/91/issue", (route) => {
      issueAttempts += 1;
      if (issueAttempts === 1) return route.fulfill({ status: 503, body: "issue unavailable" });
      issuable = false;
      return route.fulfill({ status: 204, body: "" });
    });
    await page.goto("/mypage/coupons");

    await expect(page.getByText("E2E 쿠폰", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "쿠폰 받기", exact: true }).click();
    await expect(page.getByText(/쿠폰을 발급하지 못했습니다/)).toBeVisible();
    await page.getByRole("button", { name: "발급 상태 확인 후 다시 시도", exact: true }).click();
    await expect(page.getByText("쿠폰을 발급했습니다.", { exact: true })).toBeVisible();
    await expect(page.getByText("표시할 쿠폰이 없습니다.", { exact: true })).toBeVisible();
  });

  test("coupon query failure is not rendered as an empty collection", async ({ page }) => {
    await loginThroughUI(page, seedAccounts.member);
    await page.route("**/api/v1/coupons/issuable", (route) => route.fulfill({ status: 503, body: "coupons unavailable" }));
    await page.route("**/api/v1/coupons", (route) => route.fulfill({ status: 200, json: [] }));
    await page.goto("/mypage/coupons");

    await expect(page.getByRole("button", { name: "다시 불러오기", exact: true })).toBeVisible();
    await expect(page.getByText("표시할 쿠폰이 없습니다.", { exact: true })).toHaveCount(0);
  });

  test("coupon retry does not treat an unavailable coupon as owned", async ({ page }) => {
    await loginThroughUI(page, seedAccounts.member);
    let issuable = true;
    let issueAttempts = 0;
    await page.route("**/api/v1/coupons/issuable", (route) => route.fulfill({
      status: 200,
      json: issuable ? [{
        ID: 92,
        Code: "E2E-UNAVAILABLE",
        Name: "재확인 쿠폰",
        DiscountType: "AMOUNT",
        DiscountValue: 1000,
        MaxDiscount: 1000,
        MinOrderAmount: 10000,
        ExpiresAt: null,
        Status: "ACTIVE",
      }] : [],
    }));
    await page.route("**/api/v1/coupons", (route) => route.fulfill({ status: 200, json: [] }));
    await page.route("**/api/v1/coupons/92/issue", (route) => {
      issueAttempts += 1;
      issuable = false;
      return route.fulfill({ status: 503, body: "issue response lost" });
    });
    await page.goto("/mypage/coupons");

    await page.getByRole("button", { name: "쿠폰 받기", exact: true }).click();
    await expect(page.getByText(/쿠폰을 발급하지 못했습니다/)).toBeVisible();
    await page.getByRole("button", { name: "발급 상태 확인 후 다시 시도", exact: true }).click();

    await expect(page.getByText("보유·발급 가능 목록 어디에서도 쿠폰 상태를 확인하지 못했습니다. 다른 쿠폰을 발급하기 전에 상태를 다시 확인해주세요.", { exact: true })).toBeVisible();
    expect(issueAttempts).toBe(1);
  });

  test("order detail locks review writing while refreshing cached review state", async ({ page }) => {
    await loginThroughUI(page, seedAccounts.member);
    await page.route("**/api/v1/orders/REVIEWED-E2E", (route) => route.fulfill({
      status: 200,
      json: {
        id: 4,
        order_code: "REVIEWED-E2E",
        total_order_price: 29901,
        total_discount_price: 0,
        used_point: 0,
        status: "COMPLETED",
        market_orders: [{
          id: 5,
          market_id: 1,
          shipping_fee: 0,
          status: "COMPLETED",
          expected_settlement_amount: 25000,
          line_items: [{
            id: 6,
            product_id: 1,
            option_id: 1,
            quantity: 1,
            price: 29901,
            status: "COMPLETED",
            reviewable: true,
          }],
        }],
      },
    }));
    let reviewRequestCount = 0;
    let releaseReviewRefresh = () => {};
    const reviewRefreshGate = new Promise<void>((resolve) => {
      releaseReviewRefresh = resolve;
    });
    await page.route("**/api/v1/me/reviews", async (route) => {
      reviewRequestCount += 1;
      if (reviewRequestCount === 1) {
        await route.fulfill({ status: 200, json: [] });
        return;
      }
      await reviewRefreshGate;
      await route.fulfill({
        status: 200,
        json: [{
        id: 7,
        product_id: 1,
        option_id: 1,
        member_id: 3,
        order_id: 4,
        order_line_item_id: 6,
        rating_x2: 10,
        rating: 5,
        content: "이미 작성한 리뷰",
        is_photo_review: false,
        status: "ACTIVE",
        images: [],
        }],
      });
    });
    await page.goto("/orders/REVIEWED-E2E");

    await expect(page.getByRole("button", { name: "Write review", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "마이페이지", exact: true }).first().click();
    await expect(page).toHaveURL(/\/mypage$/);
    await page.goBack();

    await expect(page.getByText("리뷰 작성 여부를 확인하는 중입니다.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Write review", exact: true })).toHaveCount(0);
    releaseReviewRefresh();
    await expect(page.getByText("Reviewed", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Write review", exact: true })).toHaveCount(0);
  });

  test("customer restores one live order after checkout failure and hands off to hosted payment", async ({ page, request }, testInfo) => {
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
    let orderCreateRequests = 0;
    page.on("request", (browserRequest) => {
      const url = new URL(browserRequest.url());
      if (browserRequest.method() === "POST" && url.pathname === "/api/v1/orders") {
        orderCreateRequests += 1;
      }
    });
    const checkoutPattern = "**/api/v1/orders/*/payment-checkout";
    const orderCreatePattern = "**/api/v1/orders";
    await page.route(orderCreatePattern, async (route) => {
      const committed = await route.fetch();
      expect(committed.status(), await committed.text()).toBe(201);
      await route.fulfill({ status: 503, body: "order create response lost" });
    });
    await page.route(checkoutPattern, async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "text/plain",
        body: "temporary checkout failure",
      });
    });
    await checkoutButton.click();

    const retryButton = page.getByRole("button", { name: "같은 주문 결제 재시도" });
    await expect(retryButton).toBeVisible();
    await expect(page.getByText(/temporary checkout failure/)).toBeVisible();
    expect(orderCreateRequests).toBe(1);

    const replacementCart = await request.post(`${backendBaseURL}/api/v1/cart/items`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { product_id: 1, option_id: 1, quantity: 2 },
    });
    expect(replacementCart.status(), await replacementCart.text()).toBe(201);

    await page.reload();
    await expect(page.getByRole("heading", { name: "주문서" })).toBeVisible();
    await expect(retryButton).toBeEnabled();
    await expect(page.getByText(/생성된 주문:/)).toBeVisible();
    await expect(page.getByText("복구한 주문은 현재 장바구니와 별개입니다", { exact: true })).toBeVisible();
    await expect(page.getByText("옵션 #1 · 1개", { exact: true })).toBeVisible();
    await expect(page.getByText("옵션 #1 · 2개", { exact: true })).toHaveCount(0);

    await page.unroute(checkoutPattern);
    await page.unroute(orderCreatePattern);
    const checkoutResponsePromise = page.waitForResponse((response) =>
      /\/api\/v1\/orders\/[^/]+\/payment-checkout$/.test(response.url())
      && response.request().method() === "POST");
    await retryButton.click();
    const checkoutResponse = await checkoutResponsePromise;
    expect(checkoutResponse.ok()).toBeTruthy();
    await expect(page.getByRole("heading", { name: "실제 결제 완료는 지원하지 않습니다" })).toBeVisible();
    await expect(page).toHaveURL(/\/checkout(?:\?.*)?$/);
    await page.getByRole("button", { name: "mock handoff 주소 열기" }).click();
    await expect(page).toHaveURL(/^http:\/\/localhost:8090\/mock-checkout\/[^/]+$/);
    expect(orderCreateRequests).toBe(1);
  });
});
