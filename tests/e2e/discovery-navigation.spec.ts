import { expect, test } from "@playwright/test";

const categoryRoots = [
  { id: 1, name: "아우터", slug: "outer", href: "/categories?category=outer", depth: 1, level: 1, sort_order: 1 },
  { id: 2, name: "상의", slug: "top", href: "/categories?category=top", depth: 1, level: 1, sort_order: 2 },
];

test.describe("discovery navigation with controlled APIs", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/v1/categories", (route) => route.fulfill({ status: 200, json: categoryRoots }));
  });

  test("lets the server choose the initial category and sends explicit choices afterward", async ({ page }) => {
    const requestedURLs: string[] = [];
    await page.route("**/api/v1/category-information?**", (route) => {
      requestedURLs.push(route.request().url());
      const selectedSlug = new URL(route.request().url()).searchParams.get("category") ?? "outer";
      const selectedCategory = categoryRoots.find((category) => category.slug === selectedSlug) ?? categoryRoots[0];
      return route.fulfill({
        status: 200,
        json: {
          categories: categoryRoots,
          selected_category: selectedCategory,
          bundle_label: "카테고리별 추천",
          products: [],
          pagination: { page: 1, page_size: 8, has_next: false },
          realtime_popular_carousel: {
            title: "실시간 인기",
            description: "현재 인기 상품",
            insert_after: 0,
            captured_at: "2026-08-29T00:00:00Z",
            products: [],
          },
        },
      });
    });

    await page.goto("/categories");
    await expect(page.getByRole("heading", { name: "아우터 상품", exact: true })).toBeVisible();
    expect(new URL(requestedURLs[0]).searchParams.has("category")).toBeFalsy();

    await page.getByRole("button", { name: "상의", exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "상의 상품", exact: true })).toBeVisible();
    expect(new URL(requestedURLs.at(-1) ?? "").searchParams.get("category")).toBe("top");
  });

  test("renders search trends without requesting the removed social-post endpoint", async ({ page }) => {
    let removedEndpointCalls = 0;
    page.on("request", (request) => {
      if (request.url().includes("/api/v1/trends/posts")) removedEndpointCalls += 1;
    });
    await page.route("**/api/v1/search/trending?**", (route) => route.fulfill({
      status: 200,
      json: {
        segment: "women",
        segments: [{ id: "women", label: "여성" }, { id: "men", label: "남성" }],
        items: Array.from({ length: 10 }, (_, index) => ({
          rank: index + 1,
          keyword: `스타일 ${index + 1}`,
          trend: index % 3 === 0 ? "UP" : index % 3 === 1 ? "DOWN" : "SAME",
        })),
      },
    }));

    await page.goto("/snapshot");
    await expect(page.getByRole("heading", { name: "실시간 인기 검색어", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /01 스타일 1/ })).toBeVisible();
    expect(removedEndpointCalls).toBe(0);
  });
});
