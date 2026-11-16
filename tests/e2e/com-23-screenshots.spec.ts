import { test, expect, type Page, type Route } from "@playwright/test";

const capturedAt = "2026-11-16T03:20:00Z";
const surveyDueAt = "2026-11-15T03:20:00Z";

const listItems = [
  inquiry(401, "STARTED", "주말 전에 받을 수 있을까요?", "ORDER", "DELIVERY"),
  inquiry(402, "IN_PROGRESS", "반품 수거 일정을 바꾸고 싶어요", "ORDER", "RETURN"),
  inquiry(403, "COMPLETED", "쿠폰이 결제 화면에 보이지 않아요", "PROMOTION", "COUPON_BENEFIT", surveyDueAt),
  inquiry(404, "CLOSED", "마케팅 알림을 끄고 싶어요", "NOTIFICATION", "PUSH_INBOX", surveyDueAt),
];

test("COM-23 PR screenshots", async ({ page }) => {
  test.setTimeout(90_000);
  await installApiMocks(page);
  await installSession(page, "MEMBER");
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/mypage");
  await expect(page.getByRole("heading", { name: "minji님" })).toBeVisible();
  await expect(page.getByText("울 블렌드 하프 코트", { exact: true })).toBeVisible();
  await shot(page, "01-mypage-summary.png");

  await page.goto("/orders/ORD-20261116-1001");
  const productInquiry = page.getByRole("link", { name: "이 상품 문의하기" });
  await expect(productInquiry).toBeVisible();
  await productInquiry.scrollIntoViewIfNeeded();
  await shot(page, "02-order-inquiry-entry.png", false);

  await page.goto("/mypage/inquiries/new?orderCode=ORD-20261116-1001&lineItemID=6");
  await expect(page.getByRole("heading", { name: "새 문의 작성" })).toBeVisible();
  await shot(page, "03-create-order-inquiry.png");

  await page.goto("/mypage/inquiries");
  await expect(page.getByText("주말 전에 받을 수 있을까요?", { exact: true })).toBeVisible();
  await shot(page, "04-inquiry-list.png");

  await page.goto("/mypage/inquiries/402");
  await expect(page.getByText("담당자가 반품 수거 일정을 확인하고 있습니다.", { exact: true })).toBeVisible();
  await shot(page, "05-inquiry-thread.png");

  await page.goto("/mypage/inquiries/403");
  await page.getByRole("button", { name: "네, 해결됐어요" }).click();
  await page.getByRole("button", { name: "5점" }).click();
  await page.getByPlaceholder("좋았던 점을 남겨주세요.").fill("빠르고 이해하기 쉬운 답변이었어요.");
  await page.getByTestId("satisfaction-survey").scrollIntoViewIfNeeded();
  await shot(page, "06-satisfaction-positive.png", false);

  await page.reload();
  await page.getByRole("button", { name: "아니요" }).click();
  await page.getByRole("button", { name: "2점" }).click();
  await page.getByRole("button", { name: "해결되지 않았어요" }).click();
  await page.getByPlaceholder("어떤 점이 아쉬웠는지 알려주세요.").fill("쿠폰 적용 조건을 확인했지만 결제 화면에서는 여전히 보이지 않았어요.");
  await page.getByTestId("satisfaction-survey").scrollIntoViewIfNeeded();
  await shot(page, "07-satisfaction-negative.png", false);

  await page.goto("/notifications");
  await expect(page.getByText("문의 답변이 도착했습니다", { exact: true })).toBeVisible();
  await shot(page, "08-answer-notification.png");

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/mypage");
  await expect(page.getByRole("heading", { name: "minji님" })).toBeVisible();
  await shot(page, "11-pc-mypage-summary.png");

  await page.goto("/orders/ORD-20261116-1001");
  await expect(productInquiry).toBeVisible();
  await productInquiry.scrollIntoViewIfNeeded();
  await shot(page, "12-pc-order-inquiry-entry.png", false);

  await page.goto("/mypage/inquiries/new?orderCode=ORD-20261116-1001&lineItemID=6");
  await expect(page.getByRole("heading", { name: "새 문의 작성" })).toBeVisible();
  await shot(page, "13-pc-create-order-inquiry.png");

  await page.goto("/mypage/inquiries");
  await expect(page.getByText("주말 전에 받을 수 있을까요?", { exact: true })).toBeVisible();
  await shot(page, "14-pc-inquiry-list.png");

  await page.goto("/mypage/inquiries/402");
  await expect(page.getByText("담당자가 반품 수거 일정을 확인하고 있습니다.", { exact: true })).toBeVisible();
  await shot(page, "15-pc-inquiry-thread.png");

  await page.goto("/mypage/inquiries/403");
  await page.getByRole("button", { name: "네, 해결됐어요" }).click();
  await page.getByRole("button", { name: "5점" }).click();
  await page.getByPlaceholder("좋았던 점을 남겨주세요.").fill("빠르고 이해하기 쉬운 답변이었어요.");
  await page.getByTestId("satisfaction-survey").scrollIntoViewIfNeeded();
  await shot(page, "16-pc-satisfaction-positive.png", false);

  await page.reload();
  await page.getByRole("button", { name: "아니요" }).click();
  await page.getByRole("button", { name: "2점" }).click();
  await page.getByRole("button", { name: "해결되지 않았어요" }).click();
  await page.getByPlaceholder("어떤 점이 아쉬웠는지 알려주세요.").fill("쿠폰 적용 조건을 확인했지만 결제 화면에서는 여전히 보이지 않았어요.");
  await page.getByTestId("satisfaction-survey").scrollIntoViewIfNeeded();
  await shot(page, "17-pc-satisfaction-negative.png", false);

  await page.goto("/notifications");
  await expect(page.getByText("문의 답변이 도착했습니다", { exact: true })).toBeVisible();
  await shot(page, "18-pc-answer-notification.png");

  await installSession(page, "SELLER");
  await page.goto("/seller/inquiries");
  await page.getByRole("button", { name: /주말 전에 받을 수 있을까요/ }).click();
  await expect(page.getByText("문의 #401", { exact: true })).toBeVisible();
  await shot(page, "09-seller-inquiry-console.png");

  await installSession(page, "ADMIN");
  await page.goto("/admin/inquiries");
  await page.getByPlaceholder("예: 지난주 처리 중인 배송 지연 문의").fill("쿠폰 결제 화면");
  await page.getByRole("button", { name: "AI 검색", exact: true }).click();
  await expect(page.getByTestId("ai-search-explanation")).toBeVisible();
  await page.getByRole("button", { name: /쿠폰이 결제 화면에 보이지 않아요/ }).click();
  await expect(page.getByText("문의 #403", { exact: true })).toBeVisible();
  await shot(page, "10-admin-natural-language-search.png");

  await page.getByPlaceholder("예: 지난주 처리 중인 배송 지연 문의").fill("지난달 없는 회원 문의");
  await page.getByRole("button", { name: "AI 검색", exact: true }).click();
  await expect(page.getByText("조건에 맞는 문의가 없습니다", { exact: true })).toBeVisible();
  await shot(page, "19-pc-admin-ai-empty.png");

  await page.getByPlaceholder("예: 지난주 처리 중인 배송 지연 문의").fill("쿠폰 오류 테스트");
  await page.getByRole("button", { name: "AI 검색", exact: true }).click();
  await expect(page.getByText("AI 검색을 완료하지 못했습니다", { exact: true })).toBeVisible();
  await shot(page, "20-pc-admin-ai-unavailable.png");

  await page.getByRole("button", { name: "기본 키워드 검색으로 전환" }).click();
  await expect(page.getByRole("button", { name: /쿠폰이 결제 화면에 보이지 않아요/ })).toBeVisible();
  await shot(page, "21-pc-admin-keyword-fallback.png");
});

async function installSession(page: Page, role: "MEMBER" | "SELLER" | "ADMIN") {
  await page.addInitScript((nextRole) => {
    localStorage.setItem("commerce.accessToken", `${nextRole.toLowerCase()}-preview-token`);
    localStorage.setItem("commerce.memberID", nextRole === "ADMIN" ? "99" : nextRole === "SELLER" ? "77" : "3");
    localStorage.setItem("commerce.role", nextRole);
    if (nextRole === "SELLER") localStorage.setItem("commerce.sellerContext", JSON.stringify({ marketID: 1, marketName: "오브제 스튜디오", token: "seller-preview-token" }));
    else localStorage.removeItem("commerce.sellerContext");
  }, role);
}

async function shot(page: Page, name: string, scrollTop = true) {
  if (scrollTop) await page.evaluate(() => window.scrollTo(0, 0));
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.screenshot({ path: `docs/pr-assets/com-23/${name}`, animations: "disabled" });
}

function inquiry(id: number, status: "STARTED" | "IN_PROGRESS" | "COMPLETED" | "CLOSED", title: string, category: string, subcategory: string, satisfactionDueAt?: string) {
  return {
    id, member_id: 3, owner_type: category === "ORDER" ? "MARKET" : "ADMIN", market_id: category === "ORDER" ? 1 : undefined,
    order_id: category === "ORDER" ? 4 : undefined, market_order_id: category === "ORDER" ? 5 : undefined, order_line_item_id: category === "ORDER" ? 6 : undefined,
    category, subcategory, title, status, completed_at: status === "COMPLETED" || status === "CLOSED" ? "2026-11-14T03:20:00Z" : undefined,
    closed_at: status === "CLOSED" ? "2026-11-16T02:00:00Z" : undefined, satisfaction_due_at: satisfactionDueAt,
    last_message_at: capturedAt, created_at: "2026-11-14T01:00:00Z", updated_at: capturedAt,
  };
}

function detail(id: number) {
  const base = listItems.find((item) => item.id === id) ?? listItems[0];
  const messages = id === 402 ? [
    { id: 21, inquiry_id: id, sender_type: "MEMBER", sender_member_id: 3, body: "내일 오후로 예정된 반품 수거를 금요일 오전으로 변경하고 싶어요.", created_at: "2026-11-16T01:10:00Z" },
    { id: 22, inquiry_id: id, sender_type: "SELLER", sender_member_id: 77, body: "담당자가 반품 수거 일정을 확인하고 있습니다.", created_at: "2026-11-16T02:20:00Z" },
  ] : id === 403 ? [
    { id: 31, inquiry_id: id, sender_type: "MEMBER", sender_member_id: 3, body: "발급받은 20% 쿠폰이 결제 화면에 보이지 않아요.", created_at: "2026-11-14T01:10:00Z" },
    { id: 32, inquiry_id: id, sender_type: "ADMIN", sender_member_id: 99, body: "쿠폰 최소 주문금액을 반영하도록 수정했습니다. 결제 화면에 다시 진입해 확인해주세요.", created_at: "2026-11-14T03:20:00Z" },
  ] : [
    { id: 11, inquiry_id: id, sender_type: "MEMBER", sender_member_id: 3, body: "토요일 오전까지 꼭 받아야 하는데 출고 일정을 확인해주실 수 있나요?", created_at: "2026-11-16T01:10:00Z" },
  ];
  return { ...base, member_email: "minji@example.com", order_code: base.order_id ? "ORD-20261116-1001" : undefined, market_name: base.market_id ? "오브제 스튜디오" : undefined, messages };
}

async function installApiMocks(page: Page) {
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();
    if (path === "/api/v1/categories") return json(route, []);
    if (path === "/api/v1/me/notifications/unread-count") return json(route, { unread_count: 1 });
    if (path === "/api/v1/me") return json(route, { id: 3, email: "minji@example.com", role: "MEMBER", status: "ACTIVE", notification_type: "ALL", marketing_consent: true, nighttime_consent: false, height: 164, weight: 52, point_balance: 24500, created_at: "2026-01-10T00:00:00Z" });
    if (path === "/api/v1/coupons") return json(route, []);
    if (path === "/api/v1/me/reviews") return json(route, [
      { id: 1, product_id: 1, option_id: 1, member_id: 3, order_id: 4, order_line_item_id: 6, rating_x2: 10, rating: 5, content: "핏이 예뻐요", is_photo_review: false, status: "ACTIVE", images: [] },
      { id: 2, product_id: 2, option_id: 2, member_id: 3, order_id: 5, order_line_item_id: 7, rating_x2: 8, rating: 4, content: "배송이 빨라요", is_photo_review: false, status: "ACTIVE", images: [] },
    ]);
    if (path === "/api/v1/orders" && url.searchParams.has("limit")) return json(route, [orderFixture()]);
    if (path === "/api/v1/orders/ORD-20261116-1001") return json(route, orderFixture());
    if (path === "/api/v1/orders/ORD-20261116-1001/refunds") return json(route, []);
    if (path === "/api/v1/products/1") return json(route, { product: productFixture() });
    if (path === "/api/v1/markets/1") return json(route, { id: 1, member_id: 77, name: "오브제 스튜디오", description: "매일 입고 싶은 옷", status: "OPEN" });
    if (path === "/api/v1/me/inquiries" && method === "GET") return json(route, { items: listItems, limit: 100, offset: 0, total: listItems.length });
    if (/^\/api\/v1\/me\/inquiries\/\d+$/.test(path)) return json(route, detail(Number(path.split("/").at(-1))));
    if (/^\/api\/v1\/me\/inquiries\/\d+\/read$/.test(path)) return route.fulfill({ status: 204 });
    if (path === "/api/v1/me/notifications") return json(route, { items: [{ id: 51, member_id: 3, message_id: 71, created_at: capturedAt, read_at: null, toast_shown_at: null, message: { id: 71, kind: "INFORMATION", title: "문의 답변이 도착했습니다", body: "반품 수거 일정을 확인했습니다. 금요일 오전 방문으로 변경해드렸어요.", destination_path: "/mypage/inquiries/402", toast_enabled: true, toast_expires_at: null } }], read_through: capturedAt });
    if (path === "/api/v1/notifications/read-all") return route.fulfill({ status: 204 });
    if (path === "/api/v1/seller/context") return json(route, { market_id: 1, market_name: "오브제 스튜디오", status: "OPEN", permissions: ["INQUIRY_READ", "INQUIRY_REPLY"] });
    if (path === "/api/v1/admin/inquiries/search" && method === "POST") {
      const request = route.request().postDataJSON() as { query?: string };
      if (request.query === "쿠폰 오류 테스트") return jsonError(route, 503, "DEPENDENCY_UNAVAILABLE", "연결된 서비스를 일시적으로 사용할 수 없습니다");
      if (request.query === "지난달 없는 회원 문의") return json(route, {
        interpretation: { summary: "지난달 접수된 회원 문의를 찾습니다.", keywords: ["회원"], category: "MEMBER", created_from: "2026-10-01T00:00:00Z", created_to: "2026-11-01T00:00:00Z" },
        summary: "해당 기간과 조건에 맞는 문의를 찾지 못했습니다.", items: [], limit: 30, offset: 0, total: 0,
      });
      return json(route, {
        interpretation: { summary: "결제 화면에서 쿠폰이 보이지 않는 문의를 찾습니다.", keywords: ["쿠폰", "결제 화면"], category: "PROMOTION" },
        summary: "쿠폰 노출과 결제 적용 문제를 직접 다룬 문의 1건입니다.",
        items: [{ ...detail(403), match_reason: "고객이 결제 화면에서 발급 쿠폰을 찾을 수 없다고 문의했습니다.", highlights: ["20% 쿠폰", "결제 화면", "최소 주문금액"] }],
        limit: 30, offset: 0, total: 1,
      });
    }
    if ((path === "/api/v1/seller/inquiries" || path === "/api/v1/admin/inquiries") && method === "GET") {
      const items = path.includes("admin") && url.searchParams.get("q") ? [detail(403)] : listItems.map((item) => ({ ...item, member_email: "minji@example.com", order_code: item.order_id ? "ORD-20261116-1001" : undefined, market_name: item.market_id ? "오브제 스튜디오" : undefined }));
      return json(route, { items, limit: 100, offset: 0, total: items.length });
    }
    const operatorMatch = path.match(/^\/api\/v1\/(seller|admin)\/inquiries\/(\d+)$/);
    if (operatorMatch) return json(route, detail(Number(operatorMatch[2])));
    return json(route, []);
  });
}

function orderFixture() {
  return { id: 4, order_code: "ORD-20261116-1001", total_order_price: 89000, total_discount_price: 10000, used_point: 0, status: "SHIPPED", ordered_at: "2026-11-15T02:10:00Z", payment_method: "CARD", market_orders: [{ id: 5, market_id: 1, shipping_fee: 0, status: "SHIPPED", expected_settlement_amount: 79000, line_items: [{ id: 6, product_id: 1, option_id: 1, quantity: 1, price: 89000, status: "SHIPPED", reviewable: false }] }], deliveries: [{ id: 8, order_id: 4, market_id: 1, market_order_id: 5, status: "SHIPPED", carrier: "CJ", tracking_number: "1234567890", receiver_name: "김민지", receiver_phone: "010-1234-5678", address: "서울시 성동구 성수이로 12" }] };
}

function productFixture() {
  return { id: 1, market_id: 1, category_id: 1, name: "울 블렌드 하프 코트", description: "가볍고 따뜻한 데일리 코트", base_price: 99000, discount_price: 89000, shipping_type: "NORMAL", popularity_score: 88, status: "SELLING", image_url: "https://images.unsplash.com/photo-1539533113208-f6df8cc8b543?w=800", options: [{ id: 1, product_id: 1, option_name: "색상/사이즈", option_value: "오트밀 / M", additional_price: 0, quantity: 10, is_active: true }] };
}

function json(route: Route, value: unknown) {
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(value) });
}

function jsonError(route: Route, status: number, code: string, message: string) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ success: false, error: { code, message, request_id: "req-ai-search", details: { dependency: "inquiry_search_ai" } } }) });
}
