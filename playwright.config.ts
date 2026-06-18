import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3301",
    trace: "on-first-retry",
  },
  webServer: {
    command: "NEXT_PUBLIC_API_MOCKING=enabled npm run dev -- --hostname 127.0.0.1 --port 3301",
    url: "http://127.0.0.1:3301",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
