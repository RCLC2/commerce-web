import { expect, test } from "@playwright/test";

const pixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

test.setTimeout(90_000);

test("member rates ten products and completes onboarding", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("commerce.accessToken", "onboarding-token");
    window.localStorage.setItem("commerce.memberID", "7");
    window.localStorage.setItem("commerce.role", "MEMBER");
  });

  const items = Array.from({ length: 10 }, (_, index) => ({
    position: index + 1,
    choice: null as "LIKE" | "DISLIKE" | null,
    product: {
      id: index + 1,
      market_id: index + 1,
      market_name: `마켓 ${index + 1}`,
      name: `취향 상품 ${index + 1}`,
      image_url: pixel,
      base_price: 10_000 + index * 1_000,
      discount_price: 0,
    },
  }));
  const savedChoices: string[] = [];
  const session = () => ({
    session_id: 1,
    generation: 1,
    status: "IN_PROGRESS",
    candidate_version: "balanced_v1",
    total_count: 10,
    responded_count: items.filter((item) => item.choice).length,
    items,
  });

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/v1/me/onboarding" && request.method() === "GET") {
      await route.fulfill({ status: 200, json: session() });
      return;
    }
    const responseMatch = path.match(/\/api\/v1\/me\/onboarding\/responses\/(\d+)$/);
    if (responseMatch && request.method() === "PUT") {
      const productID = Number(responseMatch[1]);
      const payload = request.postDataJSON() as { choice: "LIKE" | "DISLIKE"; input_method: string };
      items[productID - 1].choice = payload.choice;
      savedChoices.push(payload.choice);
      await route.fulfill({ status: 200, json: session() });
      return;
    }
    if (path.endsWith("/events")) {
      await route.fulfill({ status: 204, body: "" });
      return;
    }
    if (path.endsWith("/finish")) {
      expect(request.postDataJSON()).toEqual({ status: "COMPLETED" });
      expect(items.every((item) => item.choice === "LIKE")).toBeTruthy();
      await route.fulfill({
        status: 200,
        json: { status: "COMPLETED", responded_count: 10, recommendation_ready: true, generation: 1 },
      });
      return;
    }
    await route.fulfill({ status: 200, json: [] });
  });

  await page.goto("/onboarding/preferences");
  await expect(page.getByRole("heading", { name: "이 상품, 내 취향인가요?" })).toBeVisible();
  await expect(page.getByRole("link", { name: "commerce" })).toHaveCount(0);

  for (let index = 0; index < 10; index++) {
    await page.getByRole("button", { name: "좋아요", exact: true }).click();
    await expect(page.getByText(`${index + 1}/10`, { exact: true })).toBeVisible();
  }

  await page.getByRole("button", { name: "내 추천 만들기" }).click();
  await expect(page.getByRole("heading", { name: "취향 반영 완료!" })).toBeVisible();
  expect(savedChoices).toEqual(Array(10).fill("LIKE"));
});
