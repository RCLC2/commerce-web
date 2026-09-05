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
  });

  test("shows weather and slides through ten outfits for each gender", async ({ page }) => {
    await page.goto("/today-outfit");

    await expect(page.getByRole("heading", { name: "오늘의 코디", exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "오늘의 코디 10개" })).toBeVisible();
    await expect(page.getByText("주간 평균", { exact: false })).toContainText("23°");
    await expect(page.getByText("01 / 10", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "다음 코디", exact: true }).click();
    await expect(page.getByText("02 / 10", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "5번째 코디 보기", exact: true }).click();
    await expect(page.getByText("05 / 10", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "남성 코디", exact: true }).click();
    await expect(page.getByText("01 / 10", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "남성 코디", exact: true })).toHaveAttribute("aria-pressed", "true");

    const slider = page.getByRole("region", { name: "오늘의 코디 10개" });
    await slider.dispatchEvent("pointerdown", { clientX: 300 });
    await slider.dispatchEvent("pointerup", { clientX: 100 });
    await expect(page.getByText("02 / 10", { exact: true })).toBeVisible();
  });

  test("keeps the seven-item bottom navigation visible on desktop", async ({ page }) => {
    await page.goto("/today-outfit");

    const navigation = page.getByRole("navigation", { name: "하단 주요 메뉴" });
    await expect(navigation).toBeVisible();
    for (const label of ["카테고리", "마켓 피드", "오늘의 코디", "홈", "좋아요", "장바구니", "마이페이지"]) {
      await expect(navigation.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
  });
});
