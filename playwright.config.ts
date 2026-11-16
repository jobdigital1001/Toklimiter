import { defineConfig, devices } from "@playwright/test";
import { APP_PORT, BASE_URL, MOCK_GITHUB_PORT, TEST_ENV } from "./tests/e2e/env";

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "off",
  },
  projects: [
    // The primary target: an Android phone browser.
    { name: "android-chrome", use: { ...devices["Pixel 7"] } },
    { name: "desktop-chrome", use: { ...devices["Desktop Chrome"] }, testMatch: /audit-flow\.spec\.ts/ },
  ],
  webServer: [
    {
      command: "node tests/e2e/mock-github.mjs",
      url: `http://127.0.0.1:${MOCK_GITHUB_PORT}/__health`,
      env: { MOCK_GITHUB_PORT: String(MOCK_GITHUB_PORT) },
      reuseExistingServer: false,
    },
    {
      command: `npm run build && npx next start -p ${APP_PORT}`,
      url: BASE_URL,
      env: TEST_ENV,
      timeout: 240_000,
      reuseExistingServer: false,
    },
  ],
});
