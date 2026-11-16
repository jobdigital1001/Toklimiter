import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { MOCK_GITHUB_PORT, USERS } from "./env";

const MOCK = `http://127.0.0.1:${MOCK_GITHUB_PORT}`;
const PROMPT = [
  "Hello! Could you please fix the session timeout in src/auth/session.ts?",
  "The session should stay alive while the tab is active.",
  "Always run the linter before committing changes.",
].join("\n");

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

async function chooseRepository(page: Page) {
  await page.goto("/audit");
  await expect(page.getByRole("radio", { name: /octo-org\/demo-app/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
  await page.getByRole("radio", { name: /octo-org\/demo-app/ }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Add task" })).toBeFocused();
}

test.describe("audit flow", () => {
  test.use({ storageState: USERS.alice.state });

  test("repository search filters the list", async ({ page }) => {
    await page.goto("/audit");
    await page.getByLabel("Search repositories").fill("notes");
    await expect(page.getByRole("radio")).toHaveCount(1);
    await expect(page.getByRole("radio", { name: /empty-notes/ })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test("the task form validates input before scanning", async ({ page }) => {
    await chooseRepository(page);
    await page.getByRole("button", { name: "Scan repository" }).click();
    await expect(page.getByText("Enter a task prompt")).toBeVisible();

    await page.getByLabel("Task prompt").fill("Fix src/auth/session.ts");
    await page.getByLabel("Token budget").fill("12");
    await page.getByRole("button", { name: "Scan repository" }).click();
    await expect(page.getByText("Enter a whole number between 1,000 and 1,000,000.")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Add task" })).toBeVisible();
  });

  test("a task.md upload fills the prompt and updates the counts", async ({ page }) => {
    await chooseRepository(page);
    await expect(page.getByText("0 characters · ~0 tokens")).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles({
      name: "task.md",
      mimeType: "text/markdown",
      buffer: Buffer.from("# Task\nFix the session timeout."),
    });
    await expect(page.getByLabel("Task prompt")).toHaveValue("# Task\nFix the session timeout.");
    await expect(page.getByText("Loaded task.md.")).toBeVisible();
    await expect(page.getByText(/31 characters · ~\d+ tokens/)).toBeVisible();
  });

  test("choose repository → add task → review context pack → history", async ({ page, context, request, browserName }) => {
    await request.get(`${MOCK}/__reset`);
    await chooseRepository(page);

    await page.getByLabel("Task prompt").fill(PROMPT);
    await page.getByLabel("Exclude patterns").fill("src/billing/");
    await page.getByLabel("Token budget").fill("20000");
    await expect(page.getByText("local approximation")).toBeVisible();
    await expectNoHorizontalScroll(page);
    await page.getByRole("button", { name: "Scan repository" }).click();

    // Step 3: estimate, findings, exclusions and the pack.
    await expect(page.getByRole("heading", { level: 1, name: "Review context pack" })).toBeVisible();
    await expect(page.getByText("Estimated total")).toBeVisible();
    await expect(page.getByText("within 20,000 budget")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Waste findings" })).toBeVisible();
    for (const rule of ["Secret risk", "Generated output", "Binary file", "Irrelevant directory", "Duplicate instruction", "Prompt boilerplate"]) {
      await expect(page.getByText(rule, { exact: true }).first()).toBeVisible();
    }
    await expect(page.getByRole("heading", { name: "Largest context contributors" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recommended files to exclude" })).toBeVisible();

    const pack = page.getByTestId("pack-markdown");
    for (const section of ["## Task objective", "## Acceptance criteria", "## Relevant files", "## Explicit exclusions", "## Ready-to-paste Claude Code prompt"]) {
      await expect(pack).toContainText(section);
    }
    await expect(pack).toContainText("`src/auth/session.ts`");
    await expect(pack).toContainText("The session should stay alive while the tab is active.");
    await expect(pack).not.toContainText("do-not-read-me");
    await expectNoHorizontalScroll(page);

    // Copy.
    if (browserName === "chromium") {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.getByRole("button", { name: "Copy pack" }).click();
      await expect(page.getByText("Context pack copied to the clipboard.")).toBeVisible();
      const clipboard = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboard).toContain("# Context pack: Fix the session timeout in src/auth/session.ts.");
    }

    // Download as Markdown.
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download .md" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("context-pack-octo-org-demo-app.md");
    expect(readFileSync(await download.path(), "utf8")).toContain("## Ready-to-paste Claude Code prompt");

    // Privacy: secret, ignored, binary and generated files were never downloaded.
    const { requests } = (await (await request.get(`${MOCK}/__requests`)).json()) as { requests: string[] };
    const blobIndexes = requests.filter((path) => path.includes("/git/blobs/")).map((path) => Number(path.split("sha-")[1]));
    // Fixture order: 0 .gitignore, 1 .contextbudgetignore, 2 .env, … 8 dist, 10 png, 11 lockfile, 12 tmp/, 13 legacy/
    for (const forbidden of [2, 8, 10, 11, 12, 13]) expect(blobIndexes).not.toContain(forbidden);
    expect(blobIndexes).toContain(5); // src/auth/session.ts

    // History lists the audit and reopens the stored pack.
    await page.getByRole("link", { name: "History" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "History" })).toBeVisible();
    await page.getByRole("link", { name: /Fix the session timeout/ }).first().click();
    await expect(page).toHaveURL(/\/history\/[a-z0-9]+$/);
    await expect(page.getByTestId("pack-markdown")).toContainText("## Ready-to-paste Claude Code prompt");
    await expectNoHorizontalScroll(page);
  });

  test("dark mode can be toggled", async ({ page }) => {
    await page.goto("/audit");
    const html = page.locator("html");
    const before = await html.evaluate((el) => el.classList.contains("dark"));
    await page.getByRole("button", { name: "Toggle dark mode" }).click();
    await expect.poll(() => html.evaluate((el) => el.classList.contains("dark"))).toBe(!before);
  });

  test("the flow is keyboard accessible", async ({ page }) => {
    await page.goto("/audit");
    await page.getByRole("radio", { name: /octo-org\/demo-app/ }).focus();
    await page.keyboard.press("Space");
    await page.getByRole("button", { name: "Continue" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { level: 1, name: "Add task" })).toBeFocused();
  });

  test("settings keep the Anthropic key in the browser only", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("switch", { name: "Accurate token counting" })).toBeDisabled();
    await page.getByLabel("Anthropic API key").fill("not-a-key");
    await page.getByRole("button", { name: "Save key" }).click();
    await expect(page.getByText(/does not look like an Anthropic API key/)).toBeVisible();

    await page.getByLabel("Anthropic API key").fill("sk-ant-api03-e2e-test-key-000000");
    await page.getByRole("button", { name: "Save key" }).click();
    await expect(page.getByRole("switch", { name: "Accurate token counting" })).toBeChecked();
    await page.getByRole("button", { name: "Remove key" }).click();
    await expect(page.getByRole("switch", { name: "Accurate token counting" })).not.toBeChecked();
    expect(await page.evaluate(() => window.localStorage.getItem("contextbudget.settings"))).toContain('"anthropicKey":""');
  });
});

test.describe("history isolation", () => {
  test("another user cannot open or list someone else's audit", async ({ browser }) => {
    const alice = await browser.newContext({ storageState: USERS.alice.state });
    const alicePage = await alice.newPage();
    const created = await alice.request.post("/api/audits", {
      data: { repository: "octo-org/demo-app", prompt: "Fix src/auth/login.ts so that empty users are rejected", tokenBudget: 20000 },
    });
    expect(created.status()).toBe(200);
    const { audit } = (await created.json()) as { audit: { id: string } };
    await alicePage.goto(`/history/${audit.id}`);
    await expect(alicePage.getByTestId("pack-markdown")).toBeVisible();
    await alice.close();

    const bob = await browser.newContext({ storageState: USERS.bob.state });
    const bobPage = await bob.newPage();
    const response = await bobPage.goto(`/history/${audit.id}`);
    expect(response?.status()).toBe(404);
    await bobPage.goto("/history");
    await expect(bobPage.getByText("You have not run an audit yet.")).toBeVisible();
    await bob.close();
  });
});
