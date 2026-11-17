import { expect, test } from "@playwright/test";
import { signIn, USERS } from "./helpers";

const CATEGORY = `Legal ${Date.now()}`;

test.describe.configure({ mode: "serial" });

test.describe("admin", () => {
  test("overview and each management section load", async ({ page }) => {
    await signIn(page, USERS.admin, /\/admin$/);
    await expect(page.getByRole("heading", { level: 1, name: "Platform overview" })).toBeVisible();
    const sections: [string, string][] = [
      ["Users", "Users"],
      ["Companies", "Companies"],
      ["Jobs", "Jobs"],
      ["Categories", "Categories"],
      ["Templates", "Built-in templates"],
      ["Reports", "Reports"],
      ["Settings", "Platform settings"],
    ];
    for (const [link, heading] of sections) {
      await page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: link }).click();
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    }
  });

  test("creates a category that appears in the public filters", async ({ page }) => {
    await signIn(page, USERS.admin, /\/admin$/);
    await page.goto("/admin/categories");
    await page.getByRole("button", { name: "New category" }).click();
    await page.getByRole("dialog").getByLabel("Name").fill(CATEGORY);
    await page.getByRole("dialog").getByRole("button", { name: "Save category" }).click();
    await expect(page.getByText("Category saved")).toBeVisible();
    await page.goto("/jobs");
    await expect(page.locator("#filter-category option", { hasText: CATEGORY })).toHaveCount(1);
  });

  test("suspending a company hides it and its jobs from the public site", async ({ page }) => {
    await signIn(page, USERS.admin, /\/admin$/);
    await page.goto("/admin/companies?q=Fieldnote");
    // Recover from an earlier interrupted run that left the company suspended.
    const reinstate = page.getByRole("button", { name: "Reinstate" });
    if (await reinstate.isVisible()) {
      await reinstate.click();
      await expect(page.getByText("Company reinstated")).toBeVisible();
    }
    await page.getByRole("button", { name: "Suspend" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Suspend" }).click();
    await expect(page.getByText("Company suspended")).toBeVisible();

    expect((await page.goto("/companies/fieldnote"))?.status()).toBe(404);
    expect((await page.goto("/jobs/founding-engineer-fieldnote"))?.status()).toBe(404);

    await page.goto("/admin/companies?q=Fieldnote");
    await page.getByRole("button", { name: "Reinstate" }).click();
    await expect(page.getByText("Company reinstated")).toBeVisible();
    expect((await page.goto("/companies/fieldnote"))?.status()).toBe(200);
  });

  test("the announcement banner setting is shown site-wide", async ({ page }) => {
    await signIn(page, USERS.admin, /\/admin$/);
    await page.goto("/admin/settings");
    await page.getByLabel(/Announcement banner/).fill("Scheduled maintenance on Sunday.");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("Settings saved")).toBeVisible();
    await page.goto("/");
    await expect(page.getByRole("status").filter({ hasText: "Scheduled maintenance on Sunday." })).toBeVisible();

    await page.goto("/admin/settings");
    await page.getByLabel(/Announcement banner/).fill("");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("Settings saved")).toBeVisible();
  });
});
