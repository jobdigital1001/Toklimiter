import { expect, test } from "@playwright/test";
import { USERS } from "./env";

test.describe("signed out", () => {
  test("landing page offers GitHub sign-in and explains the three steps", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Sign in with GitHub" })).toBeVisible();
    for (const step of ["Choose repository", "Add task", "Review context pack"]) {
      await expect(page.getByRole("heading", { name: step })).toBeVisible();
    }
  });

  for (const path of ["/audit", "/history", "/settings", "/history/cmabcdefghij0123456789xyz"]) {
    test(`${path} redirects to sign-in`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/$/);
      await expect(page.getByRole("button", { name: "Sign in with GitHub" })).toBeVisible();
    });
  }

  test("API routes reject unauthenticated requests", async ({ request }) => {
    expect((await request.get("/api/repos")).status()).toBe(401);
    const audit = await request.post("/api/audits", {
      data: { repository: "octo-org/demo-app", prompt: "Fix it", tokenBudget: 20000 },
    });
    expect(audit.status()).toBe(401);
  });

  test("a forged session cookie is not accepted", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([
      { name: "next-auth.session-token", value: "not-a-real-token", domain: "localhost", path: "/" },
    ]);
    const page = await context.newPage();
    await page.goto("/audit");
    await expect(page).toHaveURL(/\/$/);
    await context.close();
  });
});

test.describe("signed in", () => {
  test.use({ storageState: USERS.alice.state });

  test("the landing page sends signed-in users to the audit flow", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/audit$/);
    await expect(page.getByRole("heading", { level: 1, name: "Choose repository" })).toBeVisible();
  });

  test("invalid audit requests are rejected with 400", async ({ request }) => {
    const response = await request.post("/api/audits", {
      data: { repository: "../etc/passwd", prompt: "", tokenBudget: 1 },
    });
    expect(response.status()).toBe(400);
  });

  test("auditing a repository without access returns 404", async ({ request }) => {
    const response = await request.post("/api/audits", {
      data: { repository: "someone-else/private-repo", prompt: "Fix src/a.ts so that tests pass", tokenBudget: 20000 },
    });
    expect(response.status()).toBe(404);
  });
});
