import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

/** A separate database so tests never touch development data. */
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgresql://genius:genius@localhost:5432/genius_jobportal_test";

const env = {
  DATABASE_URL: E2E_DATABASE_URL,
  NEXT_PUBLIC_APP_URL: baseURL,
  AUTH_URL: baseURL,
  AUTH_TRUST_HOST: "true",
  AUTH_SECRET: "e2e-only-secret-0123456789abcdef0123456789",
  // Force the dev fallbacks: emails are logged and files are written to local disk.
  RESEND_API_KEY: "",
  BLOB_READ_WRITE_TOKEN: "",
};

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  // Tests share one seeded database and build on each other within a file.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /public\.spec\.ts/ },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `${baseURL}/api/health`,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    env,
  },
});
