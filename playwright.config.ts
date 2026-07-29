import { defineConfig, devices } from "@playwright/test";

const frontendBaseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const backendBaseURL = process.env.E2E_API_BASE_URL ?? "http://127.0.0.1:18081";
const shouldStartFrontend = !process.env.E2E_API_ONLY && !process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  outputDir: "output/playwright/test-results",
  reporter: [
    ["list"],
    ["html", { outputFolder: "output/playwright/report", open: "never" }],
  ],
  use: {
    baseURL: frontendBaseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: shouldStartFrontend
    ? {
        command: "npm run dev -- --hostname 127.0.0.1 --port 3000",
        url: frontendBaseURL,
        reuseExistingServer: false,
        timeout: 120_000,
        env: {
          NEXT_PUBLIC_API_BASE_URL: backendBaseURL,
        },
      }
    : undefined,
});
