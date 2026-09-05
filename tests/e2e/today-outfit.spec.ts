import { expect, test } from "@playwright/test";

const dayStart = 1_788_091_200;
const daySeconds = 86_400;
const weatherFixture = {
  timezone: "Asia/Seoul",
  utcOffsetSeconds: 32_400,
  coordinates: { latitude: 37.57, longitude: 126.98 },
  current: {
    time: dayStart + 13 * 3_600,
    temperature: 27.4,
    apparentTemperature: 29.1,
    humidity: 64,
    weatherCode: 1,
    isDay: true,
    precipitationProbability: 10,
  },
  days: Array.from({ length: 7 }, (_, index) => ({
    time: dayStart + index * daySeconds,
    weatherCode: index === 2 ? 61 : 1,
    temperatureMax: 27 - index % 3,
    temperatureMin: 19 - index % 2,
    temperatureMean: 23 - index % 2,
    precipitationProbability: index === 2 ? 80 : 10,
    sunrise: dayStart + index * daySeconds + 6 * 3_600,
    sunset: dayStart + index * daySeconds + 19 * 3_600,
  })),
  weeklyAverageTemperature: 22.6,
};

const slotLabels = {
  head: "모자",
  accessory: "액세서리",
  outer: "아우터",
  top: "상의",
  bottom: "하의",
  bag: "가방",
  shoes: "신발",
} as const;

const outfitFixture = {
  weather_profile: "WARM",
  generated_at: "2026-09-05T02:30:00Z",
  looks: Array.from({ length: 10 }, (_, lookIndex) => ({
    id: lookIndex + 1,
    title: `실제 상품 코디 ${lookIndex + 1}`,
    reason: "가벼운 레이어드와 포인트 컬러를 조합했어요.",
    image_url: "/images/fashion-placeholder.svg",
    image_disclosure: "AI 연출 이미지 · 실제 상품과 차이가 있을 수 있습니다",
    items: Object.entries(slotLabels).map(([slot, slotLabel], slotIndex) => ({
      slot,
      slot_label: slotLabel,
      product: {
        id: (lookIndex + 1) * 100 + slotIndex + 1,
        market_id: 10,
        category_id: 20,
        name: `${slotLabel} 실제 상품 ${lookIndex + 1}`,
        description: "실제 판매 중인 상품",
        base_price: 50_000 + slotIndex,
        discount_price: 45_000 + slotIndex,
        shipping_type: "NORMAL",
        popularity_score: 1,
        status: "SELLING",
        image_url: "/images/fashion-placeholder.svg",
        in_stock: true,
        market: { id: 10, name: "실제 마켓" },
        tag_chips: [],
      },
    })),
  })),
};

test.describe("today outfit", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "geolocation", {
        configurable: true,
        value: {
          getCurrentPosition: (success: PositionCallback) => success({
            coords: {
              latitude: 37.5665,
              longitude: 126.978,
              accuracy: 10,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
              toJSON: () => ({}),
            },
            timestamp: Date.now(),
            toJSON: () => ({}),
          }),
        },
      });
    });
    await page.route("**/api/weather?**", (route) => route.fulfill({ status: 200, json: weatherFixture }));
    await page.route("**/api/v1/outfits/today?**", (route) => route.fulfill({ status: 200, json: outfitFixture }));
    await page.route("**/api/v1/categories", (route) => route.fulfill({ status: 200, json: [] }));
  });

  test("shows real products, navigates looks, and connects callouts to the product list", async ({ page }) => {
    test.slow();
    await page.goto("/today-outfit");

    await expect(page.getByRole("heading", { name: "오늘의 코디", exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "오늘의 코디 10개" })).toBeVisible();
    await expect(page.getByText("주간 평균", { exact: false })).toContainText("23°");
    await expect(page.getByText("01 / 10", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "다음 코디", exact: true }).click();
    await expect(page.getByText("02 / 10", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "5번째 코디 보기", exact: true }).click();
    await expect(page.getByText("05 / 10", { exact: true })).toBeVisible();

    await expect(page.getByRole("heading", { name: "이 코디의 실제 상품" })).toBeVisible();
    await expect(page.getByRole("button", { name: /신발 실제 상품 5, 상품 목록에서 보기/ })).toBeVisible();
    await page.getByRole("button", { name: /신발 실제 상품 5, 상품 목록에서 보기/ }).click();
    await expect(page.locator('[data-selected="true"]')).toContainText("신발 실제 상품 5");
    await expect(page.getByRole("button", { name: /남성 코디|여성 코디|다른 코디/ })).toHaveCount(0);

    const slider = page.getByRole("region", { name: "오늘의 코디 10개" });
    await slider.dispatchEvent("pointerdown", { clientX: 300 });
    await slider.dispatchEvent("pointerup", { clientX: 100 });
    await expect(page.getByText("06 / 10", { exact: true })).toBeVisible();
  });

  test("keeps the seven-item bottom navigation visible on desktop", async ({ page }) => {
    await page.goto("/today-outfit");

    const navigation = page.getByRole("navigation", { name: "하단 주요 메뉴" });
    await expect(navigation).toBeVisible();
    for (const label of ["카테고리", "트렌드관", "오늘의 코디", "홈", "좋아요", "장바구니", "마이페이지"]) {
      await expect(navigation.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
  });
});
