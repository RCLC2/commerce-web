import { defineConfig, devices } from "@playwright/test";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const apiMocking = process.env.NEXT_PUBLIC_API_MOCKING ?? (process.env.NEXT_PUBLIC_API_BASE_URL ? "disabled" : "enabled");
const isMockE2E = apiMocking === "enabled";

export default defineConfig({
  testDir: "./tests/e2e",
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    env: {
      NEXT_PUBLIC_API_BASE_URL: apiBaseUrl,
      NEXT_PUBLIC_API_MOCKING: apiMocking,
    },
    reuseExistingServer: !process.env.CI && isMockE2E,
    timeout: 120_000,
    url: "http://localhost:3000",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
