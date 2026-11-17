import { expect, test, type Page } from "@playwright/test";
import { PASSWORD, SAMPLE_CV, signIn, USERS } from "./helpers";

const JOB = "/jobs/full-stack-engineer-quanta-health";
// A fresh candidate per run keeps the suite re-runnable against the same database.
const EMAIL = `taylor+${Date.now()}@genius.test`;
const signInAsNewCandidate = (page: Page) => signIn(page, EMAIL, /\/account$/);

test.describe.configure({ mode: "serial" });

test.describe("candidate journey", () => {
  test("a new candidate can sign up and sees their profile completeness", async ({ page }) => {
    await page.goto("/sign-up");
    await page.getByLabel("Full name").fill("Taylor Tester");
    await page.getByLabel("Email").fill(EMAIL);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByTestId("completeness-percent")).toHaveText("10%");
  });

  test("sign-in rejects a wrong password", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(USERS.candidate);
    await page.getByLabel("Password").fill("not-the-password1");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Incorrect email or password.")).toBeVisible();
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("candidate saves a job and finds it under saved jobs", async ({ page }) => {
    await signInAsNewCandidate(page);
    await page.goto(JOB);
    // The first match is the main button in the job header; similar-job cards have their own.
    await page.getByRole("button", { name: "Save job" }).first().click();
    await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();
    await page.goto("/account/saved");
    await expect(page.getByRole("link", { name: "Full-Stack Engineer" })).toBeVisible();
  });

  test("application form validates, then submits with a CV upload", async ({ page }) => {
    await signInAsNewCandidate(page);
    await page.goto(JOB);
    const form = page.locator("#apply");
    await expect(form.getByLabel("Full name")).toHaveValue("Taylor Tester");

    // Missing CV, screening answer and consent are all reported.
    await form.getByRole("button", { name: "Submit application" }).click();
    await expect(form.getByText("Please confirm before submitting")).toBeVisible();

    await form.getByLabel("Phone number").fill("+1 555 010 9876");
    await form.locator('input[type="file"]').setInputFiles(SAMPLE_CV);
    await form.getByLabel(/Cover letter/).fill("I would love to help build Quanta Health.");
    await form.getByLabel(/Tell us about a system you built/).fill("A realtime sync service; I traded consistency for latency.");
    await form.getByRole("checkbox").check();
    await form.getByRole("button", { name: "Submit application" }).click();

    await expect(form.getByText(/You applied on/)).toBeVisible();
    await expect(form.getByText("Submitted")).toBeVisible();
  });

  test("the application is tracked and its CV can be downloaded by the applicant", async ({ page }) => {
    await signInAsNewCandidate(page);
    await page.goto("/account/applications");
    const row = page.getByRole("listitem").filter({ hasText: "Full-Stack Engineer" });
    await expect(row.getByText("Submitted")).toBeVisible();

    await page.goto(JOB);
    await expect(page.locator("#apply").getByRole("button", { name: "Submit application" })).toHaveCount(0);
  });

  test("candidate creates a job alert from a search", async ({ page }) => {
    await signInAsNewCandidate(page);
    await page.goto("/jobs?q=designer&arrangement=REMOTE");
    await page.getByRole("button", { name: "Create job alert" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Create alert" }).click();
    await expect(page.getByText("Alert created")).toBeVisible();
    await page.goto("/account/alerts");
    await expect(page.getByText("“designer”")).toBeVisible();
    await expect(page.getByText("Remote", { exact: true })).toBeVisible();
  });

  test("candidates cannot open recruiter or admin areas", async ({ page }) => {
    await signInAsNewCandidate(page);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/account$/);
    await page.goto("/recruiter/jobs");
    await expect(page).toHaveURL(/\/account$/);
  });
});
