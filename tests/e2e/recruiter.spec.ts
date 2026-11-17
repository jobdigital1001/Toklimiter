import { expect, test } from "@playwright/test";
import { signIn, USERS } from "./helpers";

const TITLE = `Platform Engineer ${Date.now()}`;

test.describe.configure({ mode: "serial" });

test.describe("recruiter journey", () => {
  test("dashboard shows analytics for the company", async ({ page }) => {
    await signIn(page, USERS.recruiter, /\/recruiter$/);
    await expect(page.getByRole("heading", { level: 1, name: "Lumen Labs dashboard" })).toBeVisible();
    for (const label of ["Live jobs", "Views", "Applications", "Conversion rate"]) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
    await expect(page.getByRole("heading", { name: "Applications by status" })).toBeVisible();
  });

  test("creates a job from a template, previews and publishes it", async ({ page }) => {
    await signIn(page, USERS.recruiter, /\/recruiter$/);
    await page.goto("/recruiter/jobs/new");
    for (const name of ["Software Engineer", "Product Manager", "Designer", "Marketing", "Sales", "Customer Success", "Data / AI", "Operations", "Custom template"]) {
      await expect(page.getByRole("link", { name: new RegExp(`^${name}`) })).toBeVisible();
    }
    await page.getByRole("link", { name: /^Software Engineer/ }).click();

    // Template content is pre-filled.
    await expect(page.getByLabel("Job title")).toHaveValue("Software Engineer");
    await expect(page.getByLabel(/Responsibilities/)).not.toBeEmpty();

    await page.getByLabel("Job title").fill(TITLE);
    await page.getByLabel("Location").fill("Remote (US)");
    await page.getByLabel(/Minimum salary/).fill("150000");
    await page.getByLabel(/Maximum salary/).fill("120000");
    await page.getByRole("button", { name: "Save and preview" }).click();
    await expect(page.getByText("Maximum salary must be at least the minimum")).toBeVisible();

    await page.getByLabel(/Maximum salary/).fill("190000");
    await page.getByRole("button", { name: "Save and preview" }).click();
    await expect(page).toHaveURL(/\/recruiter\/jobs\/.+\/preview$/);
    await expect(page.getByRole("heading", { level: 1, name: TITLE })).toBeVisible();
    await expect(page.getByText("$150K – $190K / yr")).toBeVisible();

    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("Job published")).toBeVisible();

    // Now visible on the public site.
    await page.goto(`/jobs?q=${encodeURIComponent(TITLE)}`);
    await expect(page.getByRole("link", { name: TITLE })).toBeVisible();
  });

  test("pauses, unpauses and closes the job", async ({ page }) => {
    await signIn(page, USERS.recruiter, /\/recruiter$/);
    await page.goto("/recruiter/jobs");
    const row = page.getByTestId("recruiter-job").filter({ hasText: TITLE });

    await row.getByRole("button", { name: "Pause", exact: true }).click();
    await expect(row.getByText("Paused")).toBeVisible();
    await page.goto(`/jobs?q=${encodeURIComponent(TITLE)}`);
    await expect(page.getByRole("heading", { name: "No jobs match your search" })).toBeVisible();

    await page.goto("/recruiter/jobs");
    await row.getByRole("button", { name: "Unpause" }).click();
    await expect(row.getByText("Published")).toBeVisible();

    await row.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Close job" }).click();
    await expect(row.getByText("Closed")).toBeVisible();
  });

  test("reviews an application: changes status and adds a private note", async ({ page }) => {
    await signIn(page, USERS.recruiter, /\/recruiter$/);
    await page.goto("/recruiter/jobs");
    await page.getByTestId("recruiter-job").filter({ hasText: "Machine Learning Engineer, Evaluation" }).getByRole("link", { name: "Applications" }).click();
    await expect(page.getByRole("heading", { name: "Status breakdown" })).toBeVisible();
    await page.getByRole("link", { name: "Jordan Lee" }).click();

    const status = page.getByLabel("Application status");
    const next = (await status.inputValue()) === "OFFER" ? "INTERVIEW" : "OFFER";
    await status.selectOption(next);
    await expect(page.getByText("Status updated")).toBeVisible();
    await expect(status).toHaveValue(next);

    const note = `Strong portfolio. Move to final round. (${Date.now()})`;
    await page.getByLabel("Add a private note").fill(note);
    await page.getByRole("button", { name: "Add note" }).click();
    await expect(page.getByText(note)).toBeVisible();
  });

  test("recruiters cannot see another company's applications or the admin area", async ({ page }) => {
    await signIn(page, USERS.recruiter, /\/recruiter$/);
    const response = await page.goto("/recruiter/applications/does-not-exist");
    expect(response?.status()).toBe(404);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/recruiter$/);
  });
});
