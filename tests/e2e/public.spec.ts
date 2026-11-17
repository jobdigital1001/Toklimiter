import { expect, test } from "@playwright/test";

test.describe("public browsing", () => {
  test("home page shows the hero, featured jobs and categories", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Discover work that matches your genius.");
    await expect(page.getByRole("heading", { name: "Featured jobs" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Popular categories" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Latest jobs" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Software Engineering/ }).first()).toBeVisible();
  });

  test("hero search leads to filtered results", async ({ page }) => {
    await page.goto("/");
    const search = page.getByRole("search", { name: "Search jobs" });
    await search.getByPlaceholder("Job title, skill, or company").fill("designer");
    await search.getByRole("button", { name: "Search jobs" }).click();
    await expect(page).toHaveURL(/\/jobs\?.*q=designer/);
    await expect(page.getByRole("link", { name: "Senior Product Designer" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Robotics Software Engineer" })).toHaveCount(0);
  });

  test("filters narrow results and an impossible search shows the empty state", async ({ page }) => {
    await page.goto("/jobs?type=INTERNSHIP");
    await expect(page.getByText("1 job found")).toBeVisible();
    await expect(page.getByRole("link", { name: "Software Engineering Intern" })).toBeVisible();

    await page.goto("/jobs?q=zzzunlikelyterm");
    await expect(page.getByRole("heading", { name: "No jobs match your search" })).toBeVisible();
    await page.getByRole("main").getByRole("link", { name: "Clear all filters" }).first().click();
    await expect(page).toHaveURL(/\/jobs$/);
  });

  test("results are paginated", async ({ page }) => {
    await page.goto("/jobs");
    const pagination = page.getByRole("navigation", { name: "Pagination" });
    await pagination.getByRole("link", { name: "Next page" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(pagination.getByRole("link", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
  });

  test("job detail shows the role and asks visitors to sign in to apply", async ({ page }) => {
    await page.goto("/jobs/senior-frontend-engineer-lumen-labs");
    await expect(page.getByRole("heading", { level: 1, name: "Senior Frontend Engineer" })).toBeVisible();
    for (const section of ["About the role", "Responsibilities", "Requirements", "Benefits", "Skills", "Similar jobs"]) {
      await expect(page.getByRole("heading", { name: section })).toBeVisible();
    }
    await expect(page.getByRole("link", { name: "Sign in to apply" })).toBeVisible();
  });

  test("company directory and profile", async ({ page }) => {
    await page.goto("/companies?q=lumen");
    await page.getByRole("link", { name: "Lumen Labs" }).click();
    await expect(page.getByRole("heading", { level: 1, name: /Lumen Labs/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Open jobs/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Innovation highlights" })).toBeVisible();
  });

  test("protected areas redirect to sign-in", async ({ page }) => {
    for (const path of ["/account", "/recruiter", "/admin"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/sign-in\?next=/);
    }
  });
});
